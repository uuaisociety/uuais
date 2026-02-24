import argparse
import numpy as np

import firebase_admin
from firebase_admin import credentials
from firebase_admin import firestore
from google.cloud.firestore_v1.base_vector_query import DistanceMeasure
from google.cloud.firestore_v1.vector import Vector
from google import genai
from google.genai import types

def get_embedding(client, text, model='gemini-embedding-001', dimensions=768):
    """
    Generates a normalized embedding vector for a given text.
    """
    res = client.models.embed_content(
        model=model,
        contents=text,
        config=types.EmbedContentConfig(output_dimensionality=dimensions)
    )
    raw_embedding = res.embeddings[0].values
    
    # Normalize the embedding using numpy
    embedding_np = np.array(raw_embedding)
    normed_embedding = embedding_np / np.linalg.norm(embedding_np)
    
    return Vector(normed_embedding.tolist())

def main():
    parser = argparse.ArgumentParser(description="Test Firestore Vector Search for Courses.")
    parser.add_argument('query', type=str, help="The search query text.")
    parser.add_argument('--limit', type=int, default=5, help="Number of results to return.")
    args = parser.parse_args()

    print(f"Initializing Firebase...")
    try:
        cred = credentials.Certificate('api_keys/uuais-dev-firebase-adminsdk-fbsvc-8dcd10358a.json')
        if not firebase_admin._apps:
            firebase_admin.initialize_app(cred)
        db = firestore.client()
    except Exception as e:
        print(f"Error initializing Firebase: {e}")
        return

    print("Initializing Gemini Client...")
    try:
        with open('api_keys/google_ai_key', 'r') as f:
            api_key = f.read().strip()
        genai_client = genai.Client(api_key=api_key)
    except Exception as e:
        print(f"Error initializing Google Gemini Client: {e}")
        return

    print(f"Embedding query: '{args.query}'...")
    query_vector = get_embedding(genai_client, args.query)

    print(f"Searching Firestore for nearest {args.limit} courses...")
    # Perform vector search on the 'courses' collection
    courses_ref = db.collection('courses')
    vector_query = courses_ref.find_nearest(
        vector_field="embedding",
        query_vector=query_vector,
        distance_measure=DistanceMeasure.COSINE,
        limit=args.limit
    )
    
    try:
        results = vector_query.get()
    except Exception as e:
        print("Vector search failed. Ensure the Vector Index has finished building in Google Cloud.")
        print(f"Error: {e}")
        return

    print(f"\n--- Top {len(results)} Results ---")
    for idx, doc in enumerate(results, 1):
        data = doc.to_dict()
        title = data.get('title', 'Unknown Title')
        
        # 'distance' property isn't always directly attached in the python client without special configuration, 
        # but we can print the top items in order.
        print(f"\n{idx}. {title}")
        print(f"   Key: {doc.id}")
        
        # Print a snippet of the about_blurb
        blurb = data.get('about_blurb') or 'No description available.'
        snippet = (blurb[:150] + '...') if len(blurb) > 150 else blurb
        print(f"   Description: {snippet}")

if __name__ == "__main__":
    main()
