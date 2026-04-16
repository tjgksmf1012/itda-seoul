import json
import os
import sys
import urllib.parse
import urllib.request
from datetime import datetime, timedelta, timezone
from pathlib import Path


ROOT = Path(__file__).resolve().parents[2]
CONFIG_PATH = ROOT / "data" / "config" / "city_signal_zones.json"
FALLBACK_CONFIG_PATH = ROOT / "data" / "config" / "city_signal_zones.example.json"
OUTPUT_PATH = ROOT / "data" / "processed" / "city-signals.live.json"

KST = timezone(timedelta(hours=9))
AIR_URL = "https://apis.data.go.kr/B552584/ArpltnInforInqireSvc/getCtprvnRltmMesureDnsty"
WEATHER_URL = "https://apis.data.go.kr/1360000/VilageFcstInfoService_2.0/getVilageFcst"


def load_zone_config() -> list[dict]:
    config_path = CONFIG_PATH if CONFIG_PATH.exists() else FALLBACK_CONFIG_PATH
    return json.loads(config_path.read_text(encoding="utf-8"))


def request_json(base_url: str, params: dict, service_key: str) -> dict:
    query = urllib.parse.urlencode(
        {
            **params,
            "serviceKey": service_key,
        },
        doseq=True,
    )
    url = f"{base_url}?{query}"
    request = urllib.request.Request(url, headers={"User-Agent": "itda-seoul-city-signal/0.1"})

    with urllib.request.urlopen(request, timeout=30) as response:
        payload = response.read().decode("utf-8")
        return json.loads(payload)


def choose_weather_base(now: datetime) -> tuple[str, str]:
    base_slots = ["0200", "0500", "0800", "1100", "1400", "1700", "2000", "2300"]
    base_date = now.strftime("%Y%m%d")
    current_hhmm = now.strftime("%H%M")

    available = [slot for slot in base_slots if slot <= current_hhmm]

    if available:
        return base_date, available[-1]

    previous_day = (now - timedelta(days=1)).strftime("%Y%m%d")
    return previous_day, base_slots[-1]


def extract_weather_value(items: list[dict], category: str) -> str:
    for item in items:
        if item.get("category") == category:
            return str(item.get("fcstValue", "")).strip()
    return ""


def parse_weather_type(sky: str, pty: str, temperature: str) -> tuple[str, str]:
    if pty and pty not in {"0", ""}:
        return "rain", "비 또는 강수"

    try:
        temp = float(temperature)
        if temp >= 27:
            return "heat", "초여름 더위"
        if temp <= 3:
            return "cold", "쌀쌀함"
    except ValueError:
        pass

    if sky == "1":
        return "clear", "맑음"
    if sky in {"3", "4"}:
        return "cloudy", "구름 많음"

    return "cloudy", "대체로 흐림"


def build_weather_signal(service_key: str, nx: int, ny: int, now: datetime) -> dict:
    base_date, base_time = choose_weather_base(now)
    response = request_json(
        WEATHER_URL,
        {
            "pageNo": 1,
            "numOfRows": 50,
            "dataType": "JSON",
            "base_date": base_date,
            "base_time": base_time,
            "nx": nx,
            "ny": ny,
        },
        service_key,
    )

    items = (
        response.get("response", {})
        .get("body", {})
        .get("items", {})
        .get("item", [])
    )

    if not isinstance(items, list):
        items = []

    sky = extract_weather_value(items, "SKY")
    pty = extract_weather_value(items, "PTY")
    temperature = extract_weather_value(items, "TMP") or extract_weather_value(items, "T1H")

    weather_type, weather_label = parse_weather_type(sky, pty, temperature)

    try:
        temp_c = int(round(float(temperature)))
    except ValueError:
        temp_c = 20

    return {
      "weatherType": weather_type,
      "weatherLabel": weather_label,
      "temperatureC": temp_c,
    }


def parse_air_quality_grade(grade: str) -> tuple[str, str]:
    if grade == "1":
        return "good", "좋음"
    if grade == "2":
        return "moderate", "보통"
    if grade in {"3", "4"}:
        return "bad", "나쁨"
    return "moderate", "보통"


def build_air_signal(service_key: str, station_name: str) -> dict:
    response = request_json(
        AIR_URL,
        {
            "returnType": "json",
            "numOfRows": 100,
            "pageNo": 1,
            "sidoName": "서울",
            "ver": "1.0",
        },
        service_key,
    )

    items = (
        response.get("response", {})
        .get("body", {})
        .get("items", [])
    )

    if not isinstance(items, list):
        items = []

    target = next((item for item in items if str(item.get("stationName", "")).strip() == station_name), None)

    if target is None and items:
        target = items[0]

    if target is None:
        return {
            "airQuality": "moderate",
            "airQualityLabel": "보통",
        }

    grade = str(target.get("khaiGrade") or target.get("pm10Grade1h") or "2").strip()
    air_quality, air_quality_label = parse_air_quality_grade(grade)

    return {
        "airQuality": air_quality,
        "airQualityLabel": air_quality_label,
    }


def compute_outdoor_index(weather_type: str, air_quality: str, temperature_c: int) -> tuple[int, str, str]:
    score = 72

    if weather_type == "rain":
        score -= 30
    elif weather_type == "heat":
        score -= 18
    elif weather_type == "cold":
        score -= 16
    elif weather_type == "clear":
        score += 8

    if air_quality == "bad":
        score -= 26
    elif air_quality == "moderate":
        score -= 6
    else:
        score += 6

    if temperature_c >= 28 or temperature_c <= 3:
        score -= 8

    score = max(15, min(90, score))

    if score >= 72:
        walk_comfort = "high"
        advice = "야외 체류가 가능한 날이라 공원형, 산책형 프로그램 만족도가 높습니다."
    elif score >= 48:
        walk_comfort = "medium"
        advice = "실내외 선택이 모두 가능하지만 장시간 야외 체류보다는 짧은 동선이 좋습니다."
    else:
        walk_comfort = "low"
        advice = "실내 중심의 문화·예약 프로그램이 더 안정적인 선택입니다."

    return score, walk_comfort, advice


def build_city_signal(zone: dict, service_key: str, now: datetime) -> dict:
    weather_grid = zone.get("weatherGrid", {})
    weather = build_weather_signal(service_key, int(weather_grid["nx"]), int(weather_grid["ny"]), now)
    air = build_air_signal(service_key, str(zone.get("airStationName", "")).strip())
    outdoor_index, walk_comfort, advice = compute_outdoor_index(
        weather["weatherType"],
        air["airQuality"],
        weather["temperatureC"],
    )

    return {
        "district": zone["district"],
        "portal": "data-go-kr",
        "datasets": [
            "기상청 단기예보 조회서비스",
            "에어코리아 대기오염정보 조회서비스"
        ],
        "weatherType": weather["weatherType"],
        "weatherLabel": weather["weatherLabel"],
        "temperatureC": weather["temperatureC"],
        "airQuality": air["airQuality"],
        "airQualityLabel": air["airQualityLabel"],
        "outdoorIndex": outdoor_index,
        "walkComfort": walk_comfort,
        "advice": advice,
        "updatedAt": now.isoformat(),
    }


def main() -> int:
    service_key = os.environ.get("DATA_GO_KR_SERVICE_KEY", "").strip()

    if not service_key:
        print("[error] DATA_GO_KR_SERVICE_KEY is missing.", file=sys.stderr)
        return 1

    now = datetime.now(KST).replace(microsecond=0)
    zones = load_zone_config()
    results = []

    for zone in zones:
        try:
            results.append(build_city_signal(zone, service_key, now))
            print(f"[ok] built city signal for {zone['district']}")
        except Exception as error:  # noqa: BLE001
            print(f"[error] {zone.get('district', 'unknown')}: {error}", file=sys.stderr)

    if not results:
        return 1

    OUTPUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT_PATH.write_text(json.dumps(results, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"[ok] wrote {len(results)} city signals -> {OUTPUT_PATH}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
