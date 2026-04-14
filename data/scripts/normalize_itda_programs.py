import json
from pathlib import Path


ROOT = Path(__file__).resolve().parents[2]
RAW_DIR = ROOT / "data" / "raw" / "seoul"
OUTPUT_PATH = ROOT / "data" / "processed" / "programs.normalized.json"

TITLE_KEYS = ["SVCNM", "TITLE", "SUBJ", "EVENT_NM", "PGM_NM"]
DISTRICT_KEYS = ["AREANM", "GUNAME", "CODE_NM", "AREA_NM", "JRSD_SGG_NM"]
PLACE_KEYS = ["PLACENM", "PLACE", "VENUENAME", "FCLT_NM", "SUBPLACENM"]
START_KEYS = ["SVCOPNBGNDT", "STRTDATE", "DATE", "START_DATE", "SVCBEGINDT"]
END_KEYS = ["SVCOPNENDDT", "END_DATE", "ENDDATE", "SVCENDDT"]
URL_KEYS = ["SVCURL", "HMPG_ADDR", "ORG_LINK", "URL", "FEEGUIDURL"]
FREE_KEYS = ["PAYATNM", "IS_FREE", "USE_FEE", "RGSTFEE", "PAYAT"]
SUMMARY_KEYS = ["SVCSTATNM", "PROGRAM", "ETC_DESC", "SUMMARY", "DTLCONT", "NOTICE"]


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


def infer_tags(title: str, summary: str) -> list[str]:
    combined = f"{title} {summary}"
    tags = []

    keyword_map = {
        "건강": ["건강", "체조", "운동"],
        "문화": ["문화", "영화", "공연", "행사"],
        "대화": ["대화", "안부", "모임"],
        "예술": ["미술", "예술", "창작"],
        "상담": ["상담", "복지", "지원"],
    }

    for tag, keywords in keyword_map.items():
        if any(keyword in combined for keyword in keywords):
            tags.append(tag)

    return tags


def build_action_url(record: dict) -> str:
    explicit_url = pick_any(record, URL_KEYS)

    if explicit_url:
        return explicit_url

    svcid = str(record.get("SVCID", "")).strip()
    if svcid:
        return f"https://yeyak.seoul.go.kr/web/reservation/selectReservView.do?rsv_svc_id={svcid}"

    return ""


def normalize_record(source_slug: str, record: dict) -> dict:
    title = pick_any(record, TITLE_KEYS)
    summary = pick_any(record, SUMMARY_KEYS)
    fee = pick_any(record, FREE_KEYS)

    return {
        "source": source_slug,
        "title": title,
        "district": pick_any(record, DISTRICT_KEYS),
        "place": pick_any(record, PLACE_KEYS),
        "startDate": pick_any(record, START_KEYS),
        "endDate": pick_any(record, END_KEYS),
        "actionUrl": build_action_url(record),
        "summary": summary,
        "isFree": "무료" in fee or fee in {"Y", "무료", "0"},
        "tags": infer_tags(title, summary),
        "raw": record,
    }


def main() -> int:
    if not RAW_DIR.exists():
        print("raw data directory does not exist.")
        return 1

    normalized = []

    for raw_file in sorted(RAW_DIR.glob("*.json")):
        payload = json.loads(raw_file.read_text(encoding="utf-8"))
        for source_slug, row in extract_rows(raw_file, payload):
            normalized.append(normalize_record(source_slug, row))

    OUTPUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT_PATH.write_text(json.dumps(normalized, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"[ok] normalized {len(normalized)} rows -> {OUTPUT_PATH}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
