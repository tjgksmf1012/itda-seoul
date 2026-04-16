import json
import os
import sys
import urllib.request
from pathlib import Path


ROOT = Path(__file__).resolve().parents[2]
CONFIG_PATH = ROOT / "data" / "config" / "reservation_svcids.json"
FALLBACK_CONFIG_PATH = ROOT / "data" / "config" / "reservation_svcids.example.json"
OUTPUT_PATH = ROOT / "data" / "raw" / "seoul" / "public_service_reservation_details.json"
BASE_URL = "http://openAPI.seoul.go.kr:8088"
SERVICE_NAME = "ListPublicReservationDetail"


def load_items() -> list[dict]:
    config_path = CONFIG_PATH if CONFIG_PATH.exists() else FALLBACK_CONFIG_PATH
    return json.loads(config_path.read_text(encoding="utf-8"))


def fetch_detail(api_key: str, svcid: str) -> dict:
    url = f"{BASE_URL}/{api_key}/json/{SERVICE_NAME}/1/5/{svcid}/"
    request = urllib.request.Request(url, headers={"User-Agent": "itda-seoul-reservation-fetcher/0.1"})

    with urllib.request.urlopen(request, timeout=30) as response:
        return json.loads(response.read().decode("utf-8"))


def main() -> int:
    api_key = os.environ.get("SEOUL_API_KEY_PUBLIC_SERVICE_RESERVATIONS", "").strip()

    if not api_key:
        api_key = os.environ.get("SEOUL_OPEN_API_KEY", "").strip()

    if not api_key:
        print(
            "SEOUL_API_KEY_PUBLIC_SERVICE_RESERVATIONS or SEOUL_OPEN_API_KEY environment variable is required.",
            file=sys.stderr,
        )
        return 1

    items = load_items()
    results = []

    for item in items:
        svcid = str(item.get("svcid", "")).strip()

        if not svcid:
            print("[skip] empty svcid")
            continue

        payload = fetch_detail(api_key, svcid)
        results.append(
            {
                "svcid": svcid,
                "label": item.get("label"),
                "payload": payload,
            }
        )
        print(f"[ok] reservation detail fetched: {svcid}")

    OUTPUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT_PATH.write_text(json.dumps(results, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"[ok] saved -> {OUTPUT_PATH}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
