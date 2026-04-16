import json
import os
import sys
import urllib.error
import urllib.request
from pathlib import Path


ROOT = Path(__file__).resolve().parents[2]
CONFIG_PATH = ROOT / "data" / "config" / "seoul_sources.json"
FALLBACK_CONFIG_PATH = ROOT / "data" / "config" / "seoul_sources.example.json"
RAW_DIR = ROOT / "data" / "raw" / "seoul"
BASE_URL = "http://openAPI.seoul.go.kr:8088"


def load_sources() -> list[dict]:
    config_path = CONFIG_PATH if CONFIG_PATH.exists() else FALLBACK_CONFIG_PATH
    return json.loads(config_path.read_text(encoding="utf-8"))


def resolve_api_key(source: dict) -> str:
    specific_env_name = str(source.get("apiKeyEnv", "")).strip()

    if specific_env_name:
        specific_value = os.environ.get(specific_env_name, "").strip()

        if specific_value:
            return specific_value

    return os.environ.get("SEOUL_OPEN_API_KEY", "").strip()


def build_url(api_key: str, source: dict) -> str:
    parts = [
        BASE_URL,
        api_key,
        source.get("responseType", "json"),
        source["serviceName"],
        str(source.get("startIndex", 1)),
        str(source.get("endIndex", 1000)),
    ]
    parts.extend(str(item) for item in source.get("extraPath", []))
    return "/".join(part.strip("/") for part in parts)


def fetch_source(api_key: str, source: dict) -> dict:
    url = build_url(api_key, source)
    request = urllib.request.Request(url, headers={"User-Agent": "itda-seoul-data-fetcher/0.1"})

    with urllib.request.urlopen(request, timeout=30) as response:
        payload = response.read().decode("utf-8")
        return json.loads(payload)


def save_payload(source: dict, payload: dict) -> Path:
    RAW_DIR.mkdir(parents=True, exist_ok=True)
    output_path = RAW_DIR / f"{source['slug']}.json"
    output_path.write_text(
        json.dumps(
            {
                "datasetName": source["datasetName"],
                "datasetUrl": source.get("datasetUrl"),
                "serviceName": source["serviceName"],
                "payload": payload,
            },
            ensure_ascii=False,
            indent=2,
        ),
        encoding="utf-8",
    )
    return output_path


def main() -> int:
    sources = load_sources()
    failures = 0

    for source in sources:
        if source.get("enabled", True) is False:
            print(f"[skip] {source['slug']}: disabled in config.")
            continue

        service_name = source.get("serviceName", "").strip()
        extra_path = [str(item) for item in source.get("extraPath", [])]

        if not service_name or service_name == "PUT_SERVICE_NAME_HERE":
            print(f"[skip] {source['slug']}: serviceName is missing.")
            continue

        if any("REPLACE_WITH_" in item for item in extra_path):
            print(f"[skip] {source['slug']}: extraPath still has placeholders.")
            continue

        api_key = resolve_api_key(source)

        if not api_key:
            failures += 1
            env_name = source.get("apiKeyEnv") or "SEOUL_OPEN_API_KEY"
            print(
                f"[error] {source['slug']}: missing API key. Set {env_name} or SEOUL_OPEN_API_KEY.",
                file=sys.stderr,
            )
            continue

        try:
            payload = fetch_source(api_key, source)
            output_path = save_payload(source, payload)
            print(f"[ok] {source['slug']} -> {output_path}")
        except (urllib.error.URLError, TimeoutError, json.JSONDecodeError) as error:
            failures += 1
            print(f"[error] {source['slug']}: {error}", file=sys.stderr)

    return 1 if failures else 0


if __name__ == "__main__":
    raise SystemExit(main())
