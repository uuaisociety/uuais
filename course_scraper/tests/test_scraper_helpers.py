from scraper_pipeline import clean_html_text, extract_course_key, parse_course_page


class TestCleanHtmlText:
    def test_none_returns_none(self):
        assert clean_html_text(None) is None

    def test_empty_string_returns_none(self):
        assert clean_html_text("") is None

    def test_whitespace_only_collapses_to_empty(self):
        assert clean_html_text("   ") == ""

    def test_removes_tags(self):
        assert clean_html_text("<p>Hello <b>World</b></p>") == "Hello World"

    def test_decodes_html_entities(self):
        assert clean_html_text("Café &amp; Co") == "Café & Co"

    def test_collapses_whitespace_and_newlines(self):
        assert clean_html_text("<div>\n  Line1\n  Line2 </div>") == "Line1 Line2"

    def test_plain_text_unchanged(self):
        assert clean_html_text("plain text") == "plain text"


class TestExtractCourseKey:
    def test_extracts_query_param(self):
        url = "https://www.uu.se/en/study/course?query=1TD347"
        assert extract_course_key(url) == "1TD347"

    def test_extracts_query_param_with_extra_params(self):
        url = "https://www.uu.se/course?query=5MA001&lang=en"
        assert extract_course_key(url) == "5MA001"

    def test_url_without_query_returns_none(self):
        assert extract_course_key("https://www.uu.se/en/study/course") is None

    def test_empty_query_value_returns_none(self):
        assert extract_course_key("https://www.uu.se/course?query=") is None


COURSE_HTML = """
<html><body>
<script>
AppRegistry.registerInitialState('course', {
  "semesters": [
    {
      "name": "Autumn 2024",
      "instances": [
        {
          "location": "<p>Uppsala</p>",
          "pace": "50%",
          "distance": "No",
          "time": "Daytime",
          "startDate": "2024-09-02",
          "endDate": "2025-01-19",
          "language": "English",
          "entryRequirements": "60 credits",
          "selection": "Grades",
          "totalFee": "SEK 20000",
          "applicationDate": "2024-04-15",
          "applicationCode": "12345"
        },
        {
          "location": "<p>Gothenburg</p>",
          "startDate": "2023-09-01",
          "endDate": "2024-01-14"
        }
      ]
    }
  ]
});
</script>
</body></html>
"""

LINKS_HTML = """
<html><body>
<script>
AppRegistry.registerInitialState('course', {
  "syllabi": [{"id": "1TD347"}],
  "syllabusUri": "/en/study/syllabus",
  "readingLists": [{"id": "RL123"}],
  "readingListUri": "/en/study/reading-list",
  "type": "course",
  "description": "<p>Learn about machine learning.</p>"
});
</script>
</body></html>
"""


class TestParseCoursePage:
    def test_empty_page_initializes_all_fields(self):
        data = parse_course_page(
            "<html><body></body></html>",
            "https://www.uu.se/course?query=X1",
        )
        assert data["key"] == "X1"
        for field in [
            "title", "location", "pace_of_study", "teaching_form",
            "instructional_time", "study_period", "language_of_instruction",
            "entry_requirements", "selection", "fees", "application_deadline",
            "application_code", "syllabus_link", "reading_list_link",
            "about_blurb", "prerequisites", "prerequisite_of",
        ]:
            assert data[field] is None

    def test_title_fallback_from_h1(self):
        html = "<html><body><h1>Introduction to AI</h1></body></html>"
        data = parse_course_page(html, "https://www.uu.se/course?query=X1")
        assert data["title"] == "Introduction to AI"

    def test_extracts_latest_instance_metadata(self):
        data = parse_course_page(COURSE_HTML, "https://www.uu.se/en/study/course?query=5SD108")
        assert data["key"] == "5SD108"
        assert data["location"] == "Uppsala"
        assert data["pace_of_study"] == "50%"
        assert data["teaching_form"] == "No"
        assert data["instructional_time"] == "Daytime"
        assert data["study_period"] == "2024-09-02 - 2025-01-19"
        assert data["language_of_instruction"] == "English"
        assert data["entry_requirements"] == "60 credits"
        assert data["selection"] == "Grades"
        assert data["fees"] == "SEK 20000"
        assert data["application_deadline"] == "2024-04-15"
        assert data["application_code"] == "12345"

    def test_extracts_syllabus_reading_list_and_blurb(self):
        data = parse_course_page(LINKS_HTML, "https://www.uu.se/course?query=1TD347")
        assert data["syllabus_link"] == "https://www.uu.se/en/study/syllabus?query=1TD347"
        assert data["reading_list_link"] == "https://www.uu.se/en/study/reading-list?query=RL123"
        assert data["about_blurb"] == "Learn about machine learning."

    def test_ignores_invalid_json_blob(self):
        html = (
            "<html><body><script>"
            "AppRegistry.registerInitialState('course', {not valid json});"
            "</script></body></html>"
        )
        data = parse_course_page(html, "https://www.uu.se/course?query=X1")
        assert data["key"] == "X1"
        assert data["location"] is None
        assert data["title"] is None

    def test_semesters_without_instances_leave_fields_none(self):
        html = (
            "<html><body><script>"
            'AppRegistry.registerInitialState(\'course\', '
            '{"semesters": [{"name": "Autumn", "instances": []}]});'
            "</script></body></html>"
        )
        data = parse_course_page(html, "https://www.uu.se/course?query=X1")
        assert data["location"] is None
        assert data["study_period"] is None
