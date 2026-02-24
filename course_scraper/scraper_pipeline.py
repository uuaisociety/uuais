import requests
import xml.etree.ElementTree as ET
import json
import re
import sys
from urllib.parse import urlparse, parse_qs
import html
import asyncio
import aiohttp

import firebase_admin
from firebase_admin import credentials
from firebase_admin import firestore
from google.cloud.firestore_v1.vector import Vector
from google import genai
from google.genai import types
import numpy as np

# Configuration
SITEMAP_INDEX_URL = 'https://www.uu.se/download/18.7f7c20f41984f683c7d7d9/1771216449846/index.xml'
CONCURRENCY_LIMIT = 10

def get_course_urls():
    """Fetches sitemaps and yields course URLs. Sync for simplicity since sitemaps are few."""
    session = requests.Session()
    session.headers.update({'User-Agent': 'Mozilla/5.0 (compatible; Scraper/1.0)'})
    
    print(f"Fetching sitemap index: {SITEMAP_INDEX_URL}")
    try:
        resp = session.get(SITEMAP_INDEX_URL)
        resp.raise_for_status()
        root = ET.fromstring(resp.content)
        
        # Namespace map
        ns = {'sm': 'http://www.sitemaps.org/schemas/sitemap/0.9'}
        
        for sitemap in root.findall('sm:sitemap', ns):
            loc = sitemap.find('sm:loc', ns).text
            if 'pages-dynamic' in loc:
                print(f"Processing child sitemap: {loc}")
                try:
                    site_resp = session.get(loc)
                    site_resp.raise_for_status()
                    site_root = ET.fromstring(site_resp.content)
                    for url in site_root.findall('sm:url', ns):
                        page_loc = url.find('sm:loc', ns).text
                        if '/course?query=' in page_loc:
                            yield page_loc
                except Exception as e:
                    print(f"Error processing sitemap {loc}: {e}")
                    
    except Exception as e:
        print(f"Error processing sitemap index: {e}")

def extract_course_key(url):
    parsed = urlparse(url)
    qs = parse_qs(parsed.query)
    return qs.get('query', [None])[0]

def clean_html_text(raw_html):
    if not raw_html:
        return None
    # Remove HTML tags
    text = re.sub(r'<[^>]+>', '', raw_html)
    # Decode HTML entities
    text = html.unescape(text)
    # Collapse whitespace
    text = ' '.join(text.split())
    return text

def parse_course_page(html_content, url):
    """
    Parses course page HTML to extract metadata.
    Returns a dictionary of course data.
    """
    data = {}
    data['key'] = extract_course_key(url)
    
    # Find all AppRegistry.registerInitialState calls
    matches = re.finditer(r"AppRegistry\.registerInitialState\('[^']+',\s*(\{.*?\})\);", html_content, re.DOTALL)
    
    for match in matches:
        try:
            json_str = match.group(1)
            blob = json.loads(json_str)
            
            # Check for Main Course Data
            if 'semesters' in blob:
                semesters = blob.get('semesters', [])
                if not semesters: continue
                
                # Flatten instances
                all_instances = []
                for sem in semesters:
                    for inst in sem.get('instances', []):
                        inst['semester_name'] = sem.get('name')
                        all_instances.append(inst)
                
                if not all_instances: continue
                    
                # Sort by startDate descending
                all_instances.sort(key=lambda x: x.get('startDate', ''), reverse=True)
                latest_instance = all_instances[0]
                
                data['location'] = clean_html_text(latest_instance.get('location'))
                data['pace_of_study'] = clean_html_text(latest_instance.get('pace'))
                data['teaching_form'] = clean_html_text(latest_instance.get('distance'))
                data['instructional_time'] = clean_html_text(latest_instance.get('time'))
                
                start = clean_html_text(latest_instance.get('startDate'))
                end = clean_html_text(latest_instance.get('endDate'))
                data['study_period'] = f"{start} - {end}" if start and end else None

                data['language_of_instruction'] = clean_html_text(latest_instance.get('language'))
                data['entry_requirements'] = clean_html_text(latest_instance.get('entryRequirements'))
                data['selection'] = clean_html_text(latest_instance.get('selection'))
                data['fees'] = clean_html_text(latest_instance.get('totalFee'))
                data['application_deadline'] = clean_html_text(latest_instance.get('applicationDate'))
                data['application_code'] = clean_html_text(latest_instance.get('applicationCode'))

            # Check for Syllabus
            if 'syllabi' in blob:
                if blob.get('syllabi'):
                    base = blob.get('syllabusUri', '/en/study/syllabus')
                    s_id = blob['syllabi'][0]['id']
                    data['syllabus_link'] = f"https://www.uu.se{base}?query={s_id}"

            # Check for Reading List
            if 'readingLists' in blob:
                if blob.get('readingLists'):
                    base = blob.get('readingListUri', '/en/study/reading-list')
                    r_id = blob['readingLists'][0]['id']
                    data['reading_list_link'] = f"https://www.uu.se{base}?query={r_id}"
            # Check for Description (About Blurb)
            if 'description' in blob and 'type' in blob and blob['type'] == 'course':
                data['about_blurb'] = clean_html_text(blob.get('description'))
                    
        except json.JSONDecodeError:
            continue
        except Exception:
            continue

    # We initialize data fields to None to ensure keys exist if blobs missing
    keys = ['title', 'location', 'pace_of_study', 'teaching_form', 'instructional_time', 
            'study_period', 'language_of_instruction', 'entry_requirements', 'selection', 
            'fees', 'application_deadline', 'application_code', 'syllabus_link', 
            'reading_list_link', 'about_blurb', 'prerequisites', 'prerequisite_of']
    for k in keys:
        if k not in data:
            data[k] = None

    # Title fallback
    title_match = re.search(r'<h1[^>]*>(.*?)</h1>', html_content, re.IGNORECASE)
    if title_match:
        data['title'] = clean_html_text(title_match.group(1))
    
    return data

def parse_prerequisites(db):
    """
    Updates the prerequisites and prerequisite_of columns using course titles and keys from Firestore.
    """
    print("Parsing prerequisites bidirectional relationship...")
    courses_ref = db.collection('courses')
    # Fetch all courses to build mapping
    docs = courses_ref.stream()
    
    all_courses = []
    title_to_key = {}
    key_set = set()
    
    # First pass: map everything
    for doc in docs:
        data = doc.to_dict()
        key = doc.id
        title = data.get('title')
        entry_req = data.get('entry_requirements')
        
        all_courses.append((key, title, entry_req))
        
        if title:
            title_to_key[title.lower()] = key
        if key:
            key_set.add(key)
            
    # Second pass: find prerequisites
    # prereq_map[course_id] = [list of dependencies]
    # inverse_map[course_id] = [list of things this is a prereq for]
    prereq_map = {}
    inverse_map = {}
    
    for key, title, entry_req in all_courses:
        if not entry_req:
            continue
            
        found_keys = set()
        req_lower = entry_req.lower()
        req_upper = entry_req.upper()
        
        # 1. Check for keys
        words = set(re.findall(r'\b\w+\b', req_upper))
        found_keys.update(words.intersection(key_set))
        
        # 2. Check for titles
        for t_str, t_key in title_to_key.items():
            if len(t_str) < 5: continue
            if t_str in req_lower:
                found_keys.add(t_key)
        
        if key in found_keys:
            found_keys.remove(key)
            
        if found_keys:
            prereq_map[key] = list(found_keys)
            for pk in found_keys:
                if pk not in inverse_map:
                    inverse_map[pk] = []
                inverse_map[pk].append(key)
            
    # Third pass: commit updates
    # We combine keys from both maps to ensure we update accurately
    all_keys_to_update = set(prereq_map.keys()).union(set(inverse_map.keys()))
    
    if all_keys_to_update:
        print(f"Updating bidirectional relationships for {len(all_keys_to_update)} courses...")
        batch = db.batch()
        count = 0
        for key in all_keys_to_update:
            doc_ref = courses_ref.document(key)
            updates = {
                'prerequisites': prereq_map.get(key, []),
                'prerequisite_of': inverse_map.get(key, [])
            }
            batch.update(doc_ref, updates)
            count += 1
            if count % 500 == 0:
                batch.commit()
                batch = db.batch()
        if count % 500 != 0:
            batch.commit()
        print("Finished updating bidirectional prerequisites.")
        
async def fetch_course(semaphore, session, url):
    async with semaphore:
        try:
            async with session.get(url) as response:
                if response.status != 200:
                    print(f"Failed to fetch {url}: {response.status}")
                    return None
                html_content = await response.text()
                # Run CPU-bound parsing in a separate thread if needed, but for simple parsing main thread is likely fine
                # given IO is the bottleneck.
                return parse_course_page(html_content, url)
        except Exception as e:
            print(f"Error scraping {url}: {e}")
            return None

async def main(limit=None, regenerate=False):
    # Initialize Firebase Admin SDK
    try:
        cred = credentials.Certificate('api_keys/uuais-dev-firebase-adminsdk-fbsvc-8dcd10358a.json')
        if not firebase_admin._apps:
            firebase_admin.initialize_app(cred)
        db = firestore.client()
    except Exception as e:
        print(f"Error initializing Firebase: {e}")
        return

    # Delete existing courses if regenerate flag is set
    courses_ref = db.collection('courses')
    if regenerate:
        print("Regenerate flag set: Deleting all existing courses from Firestore...")
        docs = courses_ref.stream()
        batch = db.batch()
        del_count = 0
        for doc in docs:
            batch.delete(doc.reference)
            del_count += 1
            if del_count % 500 == 0:
                batch.commit()
                batch = db.batch()
        if del_count % 500 != 0:
            batch.commit()
        print(f"Deleted {del_count} courses.")

    # Initialize Gemini Client
    try:
        with open('api_keys/google_ai_key', 'r') as f:
            api_key = f.read().strip()
        if not api_key:
            print("Error: api_keys/google_ai_key is empty. Please provide a valid API key.")
            return
        genai_client = genai.Client(api_key=api_key)
    except Exception as e:
        print(f"Error initializing Google Gemini Client: {e}")
        return

    # Fetch URLs (keep sync)
    urls = []
    print("Fetching URL list...")
    for u in get_course_urls():
        urls.append(u)
        if limit and len(urls) >= limit:
            break
            
    print(f"Found {len(urls)} URLs.")
    
    # Check existing keys to resume by reading Document IDs from 'courses' collection
    print("Fetching existing courses from Firestore...")
    # Use select() to retrieve only document references (saving bandwidth)
    existing_docs = courses_ref.select([]).stream()
    existing_keys = {doc.id for doc in existing_docs}
    print(f"Found {len(existing_keys)} existing courses in DB.")
    
    urls_to_scrape = []
    for u in urls:
        key = extract_course_key(u)
        if key and key not in existing_keys:
            urls_to_scrape.append(u)
            
    print(f"Resuming scrape with {len(urls_to_scrape)} courses to process...")
    if not urls_to_scrape:
        print("No new courses to scrape.")
        return

    semaphore = asyncio.Semaphore(CONCURRENCY_LIMIT)
    
    async with aiohttp.ClientSession(headers={'User-Agent': 'Mozilla/5.0 (compatible; Scraper/1.0)'}) as session:
        tasks = []
        for url in urls_to_scrape:
            tasks.append(fetch_course(semaphore, session, url))
        
        count = 0
        for task in asyncio.as_completed(tasks):
            data = await task
            if data:
                # Add vector embeddings
                title = data.get('title') or ''
                about_blurb = data.get('about_blurb') or ''
                text_to_embed = f"{title}\n{about_blurb}".strip()
                
                if text_to_embed:
                    try:
                        res = genai_client.models.embed_content(
                            model='gemini-embedding-001',
                            contents=text_to_embed,
                            config=types.EmbedContentConfig(output_dimensionality=768)
                        )
                        raw_embedding = res.embeddings[0].values
                        
                        # Normalize the embedding using numpy
                        embedding_np = np.array(raw_embedding)
                        normed_embedding = embedding_np / np.linalg.norm(embedding_np)
                        
                        # Store as Firestore Vector
                        data['embedding'] = Vector(normed_embedding.tolist())
                    except Exception as e:
                        print(f"Error generating embedding for {data.get('key')}: {e}")
                
                key = data.pop('key', None)
                if key:
                    db.collection('courses').document(key).set(data, merge=True)
                    count += 1
                    if count % 10 == 0:
                        print(f"Scraped and saved {count}/{len(urls_to_scrape)}")
                        
    print(f"Done! Scraped {count} new courses.")
    
    # Run prerequisites parser on full DB
    parse_prerequisites(db)

def run_pipeline(limit=None, regenerate=False):
    asyncio.run(main(limit, regenerate))

if __name__ == '__main__':
    import argparse
    parser = argparse.ArgumentParser(description="Scrape courses from UU.")
    parser.add_argument('limit', type=int, nargs='?', default=None, help="Optional limit for number of courses to scrape.")
    parser.add_argument('--regenerate', action='store_true', help="Clear the existing Firestore courses collection before scraping.")
    
    args = parser.parse_args()
    
    run_pipeline(args.limit, args.regenerate)
