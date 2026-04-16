import hashlib
import json
import re
from datetime import datetime, timedelta, timezone
from pathlib import Path


ROOT = Path(__file__).resolve().parents[2]
RAW_DIR = ROOT / "data" / "raw" / "seoul"
CONFIG_PATH = ROOT / "data" / "config" / "seoul_sources.json"
FALLBACK_CONFIG_PATH = ROOT / "data" / "config" / "seoul_sources.example.json"
NORMALIZED_OUTPUT_PATH = ROOT / "data" / "processed" / "programs.normalized.json"
LIVE_OUTPUT_PATH = ROOT / "data" / "processed" / "programs.live.json"
LIVE_META_OUTPUT_PATH = ROOT / "data" / "processed" / "programs.live.meta.json"
KST = timezone(timedelta(hours=9))

TITLE_KEYS = ["SVCNM", "TITLE", "SUBJ", "EVENT_NM", "PGM_NM", "PROGRAM_NM"]
DISTRICT_KEYS = ["AREANM", "GUNAME", "CODE_NM", "AREA_NM", "JRSD_SGG_NM"]
PLACE_KEYS = ["PLACENM", "PLACE", "VENUENAME", "FCLT_NM", "SUBPLACENM", "INST_NM"]
START_KEYS = ["SVCOPNBGNDT", "STRTDATE", "DATE", "START_DATE", "SVCBEGINDT"]
END_KEYS = ["SVCOPNENDDT", "END_DATE", "ENDDATE", "SVCENDDT"]
URL_KEYS = ["SVCURL", "HMPG_ADDR", "ORG_LINK", "URL", "FEEGUIDURL"]
FREE_KEYS = ["PAYATNM", "IS_FREE", "USE_FEE", "RGSTFEE", "PAYAT"]
SUMMARY_KEYS = ["SVCSTATNM", "PROGRAM", "ETC_DESC", "SUMMARY", "DTLCONT", "NOTICE"]

DISTRICT_ALIASES = {
    "종로": "종로구",
    "성동": "성동구",
    "강서": "강서구",
    "마포": "마포구",
    "강남": "강남구",
    "서초": "서초구",
    "영등포": "영등포구",
    "동대문": "동대문구",
}

CATEGORY_PROFILES = {
    "elderly_welfare_facilities": {
        "category": "welfare",
        "default_time_slots": ["morning", "afternoon"],
        "default_companion_types": ["solo", "parents"],
        "guardian_friendly": True,
        "family_friendly": False,
        "senior_friendly": True,
        "youth_friendly": False,
        "walk_minutes": 9,
        "source_url": "https://data.seoul.go.kr",
    },
    "public_service_reservations": {
        "category": "reservation",
        "default_time_slots": ["afternoon", "weekend"],
        "default_companion_types": ["solo", "friends", "family", "parents"],
        "guardian_friendly": True,
        "family_friendly": True,
        "senior_friendly": True,
        "youth_friendly": True,
        "walk_minutes": 16,
        "source_url": "https://yeyak.seoul.go.kr",
    },
    "cultural_events": {
        "category": "culture",
        "default_time_slots": ["afternoon", "evening", "weekend"],
        "default_companion_types": ["solo", "friends", "family", "parents"],
        "guardian_friendly": True,
        "family_friendly": True,
        "senior_friendly": True,
        "youth_friendly": True,
        "walk_minutes": 14,
        "source_url": "https://culture.seoul.go.kr",
    },
}

INDOOR_KEYWORDS = ["복지관", "센터", "문화관", "박물관", "미술관", "도서관", "실내", "라운지", "교실"]
OUTDOOR_KEYWORDS = ["공원", "한강", "산책", "야외", "숲", "정원", "식물원", "광장", "둘레길"]
FAMILY_KEYWORDS = ["가족", "부모", "아이", "자녀", "함께"]
QUIET_KEYWORDS = ["상담", "안부", "소규모", "조용", "건강", "마음", "치유"]
LEARNING_KEYWORDS = ["학습", "강좌", "교육", "AI", "디지털", "교실"]
RESERVATION_KEYWORDS = ["예약", "접수", "신청", "체험"]


def load_sources() -> dict[str, dict]:
    config_path = CONFIG_PATH if CONFIG_PATH.exists() else FALLBACK_CONFIG_PATH
    sources = json.loads(config_path.read_text(encoding="utf-8"))
    return {str(item["slug"]): item for item in sources}


def pick_any(record: dict, keys: list[str]) -> str:
    for key in keys:
        value = record.get(key)
        if value not in (None, ""):
            return str(value).strip()
    return ""


def extract_rows_from_payload(payload: dict) -> list[dict]:
    if not isinstance(payload, dict):
        return []

    data = payload.get("payload", {})

    if not isinstance(data, dict):
        return []

    for value in data.values():
        if isinstance(value, dict) and isinstance(value.get("row"), list):
            return value["row"]

    return []


def extract_rows(raw_file: Path, payload: object) -> list[tuple[str, dict]]:
    if raw_file.stem == "public_service_reservation_details" and isinstance(payload, list):
        rows = []
        for item in payload:
            nested_payload = item.get("payload", {})
            for row in extract_rows_from_payload({"payload": nested_payload}):
                rows.append(("public_service_reservations", row))
        return rows

    if isinstance(payload, dict):
        return [(raw_file.stem, row) for row in extract_rows_from_payload(payload)]

    return []


def normalize_whitespace(value: str) -> str:
    return re.sub(r"\s+", " ", value).strip()


def normalize_district(value: str) -> str:
    text = normalize_whitespace(value)
    if not text:
        return ""

    for key, normalized in DISTRICT_ALIASES.items():
        if key in text:
            return normalized

    return text


def parse_date(value: str) -> str:
    text = normalize_whitespace(value)
    if not text:
        return ""

    match = re.search(r"(\d{4})[-./]?(\d{2})[-./]?(\d{2})", text)
    if not match:
        return ""

    return f"{match.group(1)}-{match.group(2)}-{match.group(3)}"


def infer_tags(title: str, summary: str) -> list[str]:
    combined = f"{title} {summary}"
    tags = []

    keyword_map = {
        "건강": ["건강", "체조", "운동", "치유"],
        "문화": ["문화", "공연", "행사", "전시", "영화"],
        "상담": ["상담", "안부", "복지", "마음"],
        "예술": ["예술", "미술", "창작", "공예"],
        "학습": ["학습", "강좌", "교육", "AI", "디지털"],
        "자연": ["자연", "산책", "숲", "공원", "식물원"],
        "가족": ["가족", "부모", "아이", "함께"],
    }

    for tag, keywords in keyword_map.items():
        if any(keyword in combined for keyword in keywords):
            tags.append(tag)

    return tags


def build_action_url(record: dict, source: dict) -> str:
    explicit_url = pick_any(record, URL_KEYS)

    if explicit_url:
        return explicit_url

    svcid = str(record.get("SVCID", "")).strip()
    if svcid:
        return f"https://yeyak.seoul.go.kr/web/reservation/selectReservView.do?rsv_svc_id={svcid}"

    return str(source.get("datasetUrl", "")).strip() or "https://data.seoul.go.kr"


def infer_indoor_type(title: str, place: str, summary: str) -> str:
    combined = f"{title} {place} {summary}"

    has_indoor = any(keyword in combined for keyword in INDOOR_KEYWORDS)
    has_outdoor = any(keyword in combined for keyword in OUTDOOR_KEYWORDS)

    if has_indoor and has_outdoor:
        return "mixed"
    if has_outdoor:
        return "outdoor"
    return "indoor"


def infer_budget_type(fee_value: str) -> str:
    fee_text = normalize_whitespace(fee_value)
    if not fee_text:
        return "unknown"
    if "무료" in fee_text or fee_text in {"Y", "0"}:
        return "free"
    return "paid"


def infer_category(source_slug: str, title: str, summary: str) -> str:
    combined = f"{title} {summary}"
    if source_slug in CATEGORY_PROFILES:
        category = CATEGORY_PROFILES[source_slug]["category"]
        if category == "reservation" and any(keyword in combined for keyword in LEARNING_KEYWORDS):
            return "education"
        return category

    if any(keyword in combined for keyword in RESERVATION_KEYWORDS):
        return "reservation"
    if any(keyword in combined for keyword in LEARNING_KEYWORDS):
        return "education"
    if any(keyword in combined for keyword in QUIET_KEYWORDS):
        return "support"
    return "culture"


def infer_time_slots(category: str, title: str, summary: str) -> list[str]:
    combined = f"{title} {summary}"
    default_map = {
        "welfare": ["morning", "afternoon"],
        "culture": ["afternoon", "weekend"],
        "reservation": ["afternoon", "weekend"],
        "education": ["afternoon", "evening"],
        "support": ["morning", "afternoon"],
    }
    slots = list(default_map[category])

    if any(keyword in combined for keyword in ["저녁", "야간", "퇴근", "저녁형"]):
        slots.append("evening")
    if any(keyword in combined for keyword in ["주말", "토요일", "일요일"]):
        slots.append("weekend")

    return list(dict.fromkeys(slots))


def infer_companion_types(category: str, tags: list[str], title: str, summary: str) -> list[str]:
    combined = f"{title} {summary}"
    companion_types = ["solo"]

    if "가족" in tags or any(keyword in combined for keyword in FAMILY_KEYWORDS):
        companion_types.append("family")
        companion_types.append("parents")

    if category in {"culture", "education", "reservation"}:
        companion_types.append("friends")

    if category == "welfare":
        companion_types.append("parents")

    return list(dict.fromkeys(companion_types))


def infer_barrier_support(indoor_type: str, tags: list[str], category: str) -> list[str]:
    supports = []

    supports.append("짧은 이동 중심")

    if indoor_type != "outdoor":
        supports.append("실내 중심 참여 가능")

    if "가족" in tags:
        supports.append("보호자 동행 설명 용이")

    if category in {"reservation", "education"}:
        supports.append("신청 링크 바로 연결")

    return supports


def infer_audience_flags(tags: list[str], category: str, title: str, summary: str) -> dict:
    combined = f"{title} {summary}"
    family_friendly = "가족" in tags or any(keyword in combined for keyword in FAMILY_KEYWORDS)
    senior_friendly = category in {"welfare", "support"} or "어르신" in combined or "노인" in combined
    youth_friendly = category in {"education", "culture"} and not senior_friendly
    guardian_friendly = family_friendly or senior_friendly or "상담" in tags

    return {
        "guardianFriendly": guardian_friendly,
        "familyFriendly": family_friendly,
        "seniorFriendly": senior_friendly,
        "youthFriendly": youth_friendly,
    }


def infer_walk_minutes(category: str, indoor_type: str, summary: str) -> int:
    walk_minutes = {
        "welfare": 9,
        "support": 8,
        "culture": 13,
        "reservation": 16,
        "education": 12,
    }[category]

    if indoor_type == "outdoor":
        walk_minutes += 6
    elif indoor_type == "mixed":
        walk_minutes += 3

    if "가깝" in summary or "도보" in summary:
        walk_minutes = max(7, walk_minutes - 2)

    return walk_minutes


def infer_availability_status(start_date: str, end_date: str) -> str:
    today = datetime.now(KST).date().isoformat()

    if end_date and end_date < today:
        return "ended"
    if end_date:
        try:
            remaining = (
                datetime.fromisoformat(end_date).date() - datetime.fromisoformat(today).date()
            ).days
            if remaining <= 7:
                return "closing_soon"
        except ValueError:
            pass
    if start_date and start_date > today:
        return "upcoming"
    return "always"


def slugify(source_slug: str, district: str, title: str) -> str:
    base = f"{source_slug}-{district}-{title}".lower()
    base = re.sub(r"[^0-9a-z가-힣]+", "-", base).strip("-")
    digest = hashlib.md5(base.encode("utf-8")).hexdigest()[:6]
    return f"{base[:50].strip('-')}-{digest}" if base else digest


def build_summary(title: str, place: str, tags: list[str], category: str) -> str:
    tag_text = ", ".join(tags[:2]) if tags else "가벼운 참여"
    if category == "support":
        return f"{place}에서 부담을 낮춰 시작할 수 있는 연결형 프로그램입니다. {tag_text} 중심의 첫 참여에 적합합니다."
    if category == "welfare":
        return f"{place}에서 비교적 안정적으로 참여할 수 있는 복지형 프로그램입니다. {tag_text} 중심으로 첫 외출 후보가 됩니다."
    if category == "reservation":
        return f"{place}에서 신청 후 바로 참여로 이어질 수 있는 예약형 프로그램입니다. {tag_text} 후보로 적합합니다."
    if category == "education":
        return f"{place}에서 학습과 관계 형성을 함께 기대할 수 있는 프로그램입니다. {tag_text} 관심사와 연결됩니다."
    return f"{place}에서 가볍게 참여할 수 있는 문화형 프로그램입니다. {tag_text} 관심사에 맞는 외출 후보입니다."


def normalize_record(source_slug: str, source: dict, record: dict) -> dict:
    title = normalize_whitespace(pick_any(record, TITLE_KEYS))
    summary = normalize_whitespace(pick_any(record, SUMMARY_KEYS))
    place = normalize_whitespace(pick_any(record, PLACE_KEYS))
    district = normalize_district(pick_any(record, DISTRICT_KEYS))
    start_date = parse_date(pick_any(record, START_KEYS))
    end_date = parse_date(pick_any(record, END_KEYS))
    fee_value = pick_any(record, FREE_KEYS)
    tags = infer_tags(title, summary)
    category = infer_category(source_slug, title, summary)
    indoor_type = infer_indoor_type(title, place, summary)

    return {
        "sourceSlug": source_slug,
        "datasetName": source.get("datasetName", source_slug),
        "datasetUrl": source.get("datasetUrl", "https://data.seoul.go.kr"),
        "serviceName": source.get("serviceName", ""),
        "title": title,
        "district": district,
        "place": place,
        "startDate": start_date,
        "endDate": end_date,
        "actionUrl": build_action_url(record, source),
        "summary": summary,
        "isFree": infer_budget_type(fee_value) == "free",
        "budgetType": infer_budget_type(fee_value),
        "tags": tags,
        "category": category,
        "indoorType": indoor_type,
        "availabilityStatus": infer_availability_status(start_date, end_date),
        "raw": record,
    }


def build_live_program(item: dict) -> dict:
    title = item["title"]
    district = item["district"]
    place = item["place"] or district or "서울시 공공 공간"
    summary = item["summary"] or build_summary(title, place, item["tags"], item["category"])
    time_slots = infer_time_slots(item["category"], title, summary)
    companion_types = infer_companion_types(item["category"], item["tags"], title, summary)
    audience_flags = infer_audience_flags(item["tags"], item["category"], title, summary)
    barrier_support = infer_barrier_support(item["indoorType"], item["tags"], item["category"])

    return {
        "id": slugify(item["sourceSlug"], district, title),
        "portal": "seoul-open-data",
        "datasetName": item["datasetName"],
        "title": title,
        "category": item["category"],
        "district": district,
        "place": place,
        "startDate": item["startDate"] or None,
        "endDate": item["endDate"] or None,
        "availabilityStatus": item["availabilityStatus"],
        "walkMinutes": infer_walk_minutes(item["category"], item["indoorType"], summary),
        "indoorType": item["indoorType"],
        "budgetType": item["budgetType"],
        **audience_flags,
        "timeSlots": time_slots,
        "companionTypes": companion_types,
        "interestTags": item["tags"],
        "barrierSupport": barrier_support,
        "summary": summary,
        "actionUrl": item["actionUrl"],
        "sourceUrl": item["datasetUrl"] or CATEGORY_PROFILES.get(item["sourceSlug"], {}).get("source_url", "https://data.seoul.go.kr"),
    }


def dedupe_programs(programs: list[dict]) -> list[dict]:
    deduped = {}
    for program in programs:
        key = (program["district"], program["title"], program["place"])
        deduped[key] = program
    return list(deduped.values())


def main() -> int:
    if not RAW_DIR.exists():
        print("raw data directory does not exist.")
        return 1

    source_map = load_sources()
    normalized = []

    for raw_file in sorted(RAW_DIR.glob("*.json")):
        payload = json.loads(raw_file.read_text(encoding="utf-8"))
        for source_slug, row in extract_rows(raw_file, payload):
            source = source_map.get(source_slug, {"datasetName": source_slug, "datasetUrl": "https://data.seoul.go.kr"})
            normalized.append(normalize_record(source_slug, source, row))

    normalized = [item for item in normalized if item["title"] and item["district"]]

    live_programs = dedupe_programs([build_live_program(item) for item in normalized])
    live_programs.sort(key=lambda item: (item["district"], item["title"]))

    generated_at = datetime.now(KST).replace(microsecond=0).isoformat()
    dataset_names = sorted({item["datasetName"] for item in live_programs})
    source_slugs = sorted({item["sourceSlug"] for item in normalized})

    NORMALIZED_OUTPUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    NORMALIZED_OUTPUT_PATH.write_text(
        json.dumps(normalized, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )
    LIVE_OUTPUT_PATH.write_text(
        json.dumps(live_programs, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )
    LIVE_META_OUTPUT_PATH.write_text(
        json.dumps(
            {
                "generatedAt": generated_at,
                "itemCount": len(live_programs),
                "datasetNames": dataset_names,
                "sourceSlugs": source_slugs,
                "note": "서울 열린데이터광장 raw 데이터를 잇다서울 추천 스키마로 정규화한 결과입니다.",
            },
            ensure_ascii=False,
            indent=2,
        ),
        encoding="utf-8",
    )

    print(f"[ok] normalized {len(normalized)} rows -> {NORMALIZED_OUTPUT_PATH}")
    print(f"[ok] built {len(live_programs)} live programs -> {LIVE_OUTPUT_PATH}")
    print(f"[ok] wrote metadata -> {LIVE_META_OUTPUT_PATH}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
