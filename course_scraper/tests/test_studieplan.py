

from studieplan import (
    build_program,
    flatten_ladok,
    collect_rule_texts,
    extract_outline,
    flatten_courses,
    parse_credits,
    parse_main_field,
    parse_title,
    parse_track_header,
    slugify,
)


class TestParseCredits:
    def test_plain_credits_sv(self):
        assert parse_credits("Algebra och geometri, 5 hp (1MA090)") == (5.0, 5.0)

    def test_plain_credits_en(self):
        assert parse_credits("Algebra and Geometry, 5 credits (1MA090)") == (5.0, 5.0)

    def test_split_course_reports_period_and_total(self):
        assert parse_credits("Analys i en variabel, 5 av 10 hp (1MA360)") == (5.0, 10.0)

    def test_nbsp_entities_are_decoded(self):
        assert parse_credits("Kvantfysik F, 10&nbsp;hp (1FA535)") == (10.0, 10.0)

    def test_decimal_credits(self):
        assert parse_credits("Something, 7,5 hp (1XX000)") == (7.5, 7.5)

    def test_missing_credits_returns_none(self):
        assert parse_credits("Just a title (1XX000)") == (None, None)

    def test_empty_returns_none(self):
        assert parse_credits("") == (None, None)


class TestParseTitle:
    def test_strips_credits_and_code(self):
        assert parse_title("Introduction to Engineering Physics, 5&nbsp;credits (1TE609)") == \
            "Introduction to Engineering Physics"

    def test_split_course_title(self):
        assert parse_title("Analys i en variabel, 5 av 10 hp (1MA360)") == "Analys i en variabel"

    def test_title_without_credits_is_unchanged(self):
        assert parse_title("Some Course") == "Some Course"


class TestParseMainField:
    def test_splits_field_and_depth(self):
        assert parse_main_field("Mathematics&nbsp;G1F") == ("Mathematics", "G1F")

    def test_advanced_level_code(self):
        assert parse_main_field("Physics A1N") == ("Physics", "A1N")

    def test_field_without_depth_code(self):
        assert parse_main_field("Teknik") == ("Teknik", None)

    def test_empty_returns_none_pair(self):
        assert parse_main_field("") == (None, None)


class TestSlugify:
    def test_strips_swedish_diacritics(self):
        assert slugify("Tillämpad beräkningsteknik") == "tillampad-berakningsteknik"

    def test_lowercases_and_hyphenates(self):
        assert slugify("Hållbar energiteknik") == "hallbar-energiteknik"


class TestParseTrackHeader:
    def test_bare_specialisation(self):
        result = parse_track_header("<p><strong>Inriktning Elektrifiering</strong></p>")
        assert result["spec"] == "Elektrifiering"
        assert result["profile"] is None
        assert result["id"] == "elektrifiering"

    def test_specialisation_with_profile(self):
        result = parse_track_header("<p><strong>Inriktning Tillämpad fysik, profil Kvantteknologi</strong></p>")
        assert result["spec"] == "Tillämpad fysik"
        assert result["profile"] == "Kvantteknologi"
        assert result["id"] == "tillampad-fysik__kvantteknologi"
        assert result["specId"] == "tillampad-fysik"

    def test_casing_is_normalised_to_one_id(self):
        """UU writes the same specialisation both cased and lowercase; both must resolve alike."""
        lower = parse_track_header("<p><strong>Inriktning beräkningsteknik</strong></p>")
        upper = parse_track_header("<p><strong>Inriktning Beräkningsteknik</strong></p>")
        assert lower["id"] == upper["id"] == "berakningsteknik"

    def test_profile_shares_specialisation_id_with_bare_parent(self):
        bare = parse_track_header("<strong>Inriktning beräkningsteknik</strong>")
        profile = parse_track_header("<strong>Inriktning Beräkningsteknik, profil Artificiell intelligens</strong>")
        assert profile["specId"] == bare["specId"]
        assert profile["id"] != bare["id"]

    def test_captures_trailing_description_prose(self):
        result = parse_track_header(
            "<p><strong>Inriktning Inbyggda system</strong></p><p>Inriktningen har två profiler.</p>"
        )
        assert result["description"] == "Inriktningen har två profiler."

    def test_header_without_description_has_none(self):
        assert parse_track_header("<strong>Inriktning Elektrifiering</strong>")["description"] is None

    def test_profil_mot_form(self):
        # Elektroteknik writes "Profil mot X" rather than "Inriktning X".
        result = parse_track_header("<strong>Profil mot förnybar elgenerering</strong>")
        assert result["spec"] == "förnybar elgenerering"
        assert result["profile"] is None
        assert result["id"] == "fornybar-elgenerering"

    def test_profil_colon_form(self):
        result = parse_track_header("<strong>Profil: Inbyggda system</strong>")
        assert result["spec"] == "Inbyggda system"
        assert result["id"] == "inbyggda-system"

    def test_profilering_form(self):
        result = parse_track_header("<strong>Profilering industriell analys</strong>")
        assert result["spec"] == "industriell analys"

    def test_spar_dash_form(self):
        result = parse_track_header("<strong>Spår - Uppsala universitet</strong>")
        assert result["spec"] == "Uppsala universitet"

    def test_terminsblock_form(self):
        result = parse_track_header("<strong>Terminsblock Markmiljö</strong>")
        assert result["spec"] == "Markmiljö"

    def test_fordjupningsblock_form(self):
        result = parse_track_header("<strong>Fördjupningsblock i fasta tillståndets fysik</strong>")
        assert result["spec"] == "fasta tillståndets fysik"

    def test_section_labels_are_not_tracks(self):
        # These group courses without branching the programme.
        for label in [
            "Valbara kurser",
            "Övriga valbara kurser",
            "Tillvalskurser:",
            "Rekommenderade valbara kurser period 33.",
            "Alternativa kurser",
            "Sommarkurser",
            "Kurskod",
        ]:
            assert parse_track_header(f"<strong>{label}</strong>") is None, label

    def test_non_header_text_returns_none(self):
        assert parse_track_header("<p>En av kurserna Kärnfysik (1FA346) är obligatorisk.</p>") is None

    def test_bold_text_that_is_not_a_track_returns_none(self):
        assert parse_track_header("<p><strong>Observera</strong> att kursen ges på engelska.</p>") is None

    def test_empty_returns_none(self):
        assert parse_track_header("") is None


def _outline(semesters, **extra):
    return {"outline": {"id": "1", "code": "TST", "name": "Test", "semesters": semesters, **extra}}


def _pad_to(position, semester):
    """Places a semester at 1-indexed `position`, since indexes come from list order."""
    return [{"nameSv": f"Termin {i}", "content": []} for i in range(1, position)] + [semester]


def _courses_node(*courses):
    return {"type": "courses", "courses": list(courses)}


def _course(code, link_sv, compulsory=True, field="Matematik G1F"):
    return {
        "code": code,
        "compulsory": compulsory,
        "linkTextSv": link_sv,
        "linkTextEn": link_sv,
        "mainFieldOfStudySv": field,
        "mainFieldOfStudyEn": field,
    }


def _period(name, *content):
    return {"type": "period", "period": {"nameSv": name, "nameEn": name}, "content": list(content)}


class TestFlattenCourses:
    def test_trunk_semester_has_no_track(self):
        outline = _outline([
            {"nameSv": "Termin 1", "content": [_period("Period 1", _courses_node(_course("1MA090", "Algebra, 5 hp (1MA090)")))]}
        ])["outline"]
        courses, tracks = flatten_courses(outline)
        assert tracks == []
        assert courses[0]["trackId"] is None
        assert courses[0]["semester"] == 1
        assert courses[0]["credits"] == 5.0

    def test_course_split_across_periods_is_deduped(self):
        """1MA360 is listed in both periods as '5 av 10 hp'; it must become one row of 10 hp."""
        link = "Analys i en variabel, 5 av 10 hp (1MA360)"
        outline = _outline([{
            "nameSv": "Termin 1",
            "content": [
                _period("Period 1", _courses_node(_course("1MA360", link))),
                _period("Period 2", _courses_node(_course("1MA360", link))),
            ],
        }])["outline"]
        courses, _ = flatten_courses(outline)
        assert len(courses) == 1
        assert courses[0]["credits"] == 10.0
        assert courses[0]["creditsInPeriod"] == 5.0
        assert courses[0]["periods"] == ["Period 1", "Period 2"]

    def test_course_repeated_across_periods_is_not_counted_twice(self):
        """UU prints the whole course's credits on every period row it appears in."""
        link = "Projektarbete i informationsteknologi, 5 hp (1DT081)"
        outline = _outline([{
            "nameSv": "Termin 1",
            "content": [
                _period("Period 1", _courses_node(_course("1DT081", link))),
                _period("Period 2", _courses_node(_course("1DT081", link))),
            ],
        }])["outline"]
        courses, _ = flatten_courses(outline)
        assert len(courses) == 1
        assert courses[0]["credits"] == 5.0
        # The semester counts the course once, however many periods it runs over.
        assert courses[0]["creditsInSemester"] == 5.0
        assert courses[0]["periods"] == ["Period 1", "Period 2"]

    def test_split_course_still_sums_its_shares(self):
        """The "5 av 10 hp" form does carry a share, and both halves belong to the semester."""
        link = "Analys i en variabel, 5 av 10 hp (1MA360)"
        outline = _outline([{
            "nameSv": "Termin 1",
            "content": [
                _period("Period 1", _courses_node(_course("1MA360", link))),
                _period("Period 2", _courses_node(_course("1MA360", link))),
            ],
        }])["outline"]
        courses, _ = flatten_courses(outline)
        assert courses[0]["creditsInSemester"] == 10.0

    def test_shares_never_sum_past_the_course_itself(self):
        """TTF2Y lists 1TE058 as "2,5 av 5 hp" under all four periods of one semester."""
        link = "Kreativ verkstadsteknik, 2,5 av 5 hp (1TE058)"
        outline = _outline([{
            "nameSv": "Termin 1",
            "content": [
                _period(f"Period {n}", _courses_node(_course("1TE058", link)))
                for n in (1, 2, 3, 4)
            ],
        }])["outline"]
        courses, _ = flatten_courses(outline)
        assert courses[0]["credits"] == 5.0
        assert courses[0]["creditsInSemester"] == 5.0

    def test_track_header_assigns_following_periods(self):
        outline = _outline(_pad_to(7, {
            "nameSv": "Termin 7",
            "content": [
                {"type": "text", "textSv": "<strong>Inriktning Elektrifiering</strong>"},
                _period("Period 1", _courses_node(_course("1TE765", "Kraft, 5 hp (1TE765)"))),
                {"type": "text", "textSv": "<strong>Inriktning Tillämpad fysik, profil Fysik</strong>"},
                _period("Period 1", _courses_node(_course("1FA352", "Fysik, 5 hp (1FA352)"))),
            ],
        }))["outline"]
        courses, tracks = flatten_courses(outline)
        by_code = {c["code"]: c for c in courses}
        assert by_code["1TE765"]["trackId"] == "elektrifiering"
        assert by_code["1FA352"]["trackId"] == "tillampad-fysik__fysik"
        assert len(tracks) == 2
        assert all(t["fromSemester"] == 7 for t in tracks)

    def test_same_code_in_two_tracks_stays_separate(self):
        outline = _outline([{
            "nameSv": "Termin 7",
            "content": [
                {"type": "text", "textSv": "<strong>Inriktning Elektrifiering</strong>"},
                _period("Period 1", _courses_node(_course("1TE651", "Delad, 5 hp (1TE651)"))),
                {"type": "text", "textSv": "<strong>Inriktning Inbyggda system</strong>"},
                _period("Period 1", _courses_node(_course("1TE651", "Delad, 5 hp (1TE651)"))),
            ],
        }])["outline"]
        courses, _ = flatten_courses(outline)
        assert len(courses) == 2
        assert {c["trackId"] for c in courses} == {"elektrifiering", "inbyggda-system"}

    def test_course_without_code_is_skipped(self):
        outline = _outline([{
            "nameSv": "Termin 1",
            "content": [_courses_node({"code": None, "linkTextSv": "Broken"})],
        }])["outline"]
        courses, _ = flatten_courses(outline)
        assert courses == []


class TestCollectRuleTexts:
    def test_prose_is_collected_and_headers_excluded(self):
        outline = _outline(_pad_to(7, {
            "nameSv": "Termin 7",
            "content": [
                {"type": "text", "textSv": "<strong>Inriktning Elektrifiering</strong>"},
                _period("Period 1", {"type": "text", "textSv": "<p>En av kurserna är obligatorisk.</p>"}),
            ],
        }))["outline"]
        rules = collect_rule_texts(outline)
        assert len(rules) == 1
        assert rules[0]["textSv"] == "En av kurserna är obligatorisk."
        assert rules[0]["trackId"] == "elektrifiering"
        assert rules[0]["semester"] == 7
        assert rules[0]["period"] == "Period 1"

    def test_empty_text_nodes_are_dropped(self):
        outline = _outline([{"nameSv": "T1", "content": [{"type": "text", "textSv": "<p>  </p>"}]}])["outline"]
        assert collect_rule_texts(outline) == []


class TestExtractOutline:
    def test_finds_the_outline_blob_among_others(self):
        html = (
            "<script>AppRegistry.registerInitialState('12.a', {\"label\": \"nope\"});</script>"
            "<script>AppRegistry.registerInitialState('12.b', {\"outline\": {\"code\": \"TTF2Y\"}});</script>"
        )
        assert extract_outline(html)["outline"]["code"] == "TTF2Y"

    def test_returns_none_when_absent(self):
        assert extract_outline("<script>AppRegistry.registerInitialState('12.a', {\"x\": 1});</script>") is None

    def test_malformed_json_is_skipped(self):
        html = "<script>AppRegistry.registerInitialState('12.a', {not json});</script>"
        assert extract_outline(html) is None


class TestBuildProgram:
    def test_assembles_top_level_fields(self):
        blob = _outline(
            [{"nameSv": "Termin 1", "content": [_courses_node(_course("1MA090", "Algebra, 5 hp (1MA090)"))]}],
            credits="300&nbsp;hp",
        )
        program = build_program(blob, "https://example.test/plan")
        assert program["code"] == "TST"
        assert program["totalCredits"] == 300.0
        assert program["semesters"] == 1
        assert program["sourceUrl"] == "https://example.test/plan"
        assert program["edges"] == []


def _ladok_education(code, credits, session_periods):
    return {
        "code": code,
        "nameSv": f"Kurs {code}",
        "nameEn": f"Course {code}",
        "creditsNumber": credits,
        "sessionPeriods": session_periods,
    }


class TestFlattenLadok:
    """The blob repeats a straddling course verbatim under every semester it touches."""

    #: 1TS301, 15 hp: 10 hp in the autumn's periods 1-2, 5 hp in the spring's period 3.
    SESSIONS = [
        {"credits": 10, "periodCredits": [{"credits": 5, "period": "2"}, {"credits": 5, "period": "1"}]},
        {"credits": 5, "periodCredits": [{"credits": 5, "period": "3"}]},
    ]

    def _outline(self):
        education = _ladok_education("1TS301", 15.0, self.SESSIONS)
        return {
            "semesters": [
                {"number": 1, "courses": [{"education": education}]},
                {"number": 2, "courses": [{"education": education}]},
            ]
        }

    def test_each_semester_counts_only_its_own_periods(self):
        courses, _ = flatten_ladok(self._outline())
        by_semester = {c["semester"]: c for c in courses}
        assert by_semester[1]["creditsInSemester"] == 10.0
        assert by_semester[2]["creditsInSemester"] == 5.0
        # The whole course is still 15 hp in both rows; only the semester's share differs.
        assert {c["credits"] for c in courses} == {15.0}

    def test_a_semester_lists_only_the_periods_it_teaches(self):
        courses, _ = flatten_ladok(self._outline())
        by_semester = {c["semester"]: c for c in courses}
        assert by_semester[1]["periods"] == ["Period 1", "Period 2"]
        assert by_semester[2]["periods"] == ["Period 3"]
