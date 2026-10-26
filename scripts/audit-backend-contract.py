"""Match frontend direct API calls against the registered backend OpenAPI contract."""
import json, re
from pathlib import Path
from app.main import app
root = Path(__file__).resolve().parents[1]
evidence = json.loads((root / "backend/scratch/frontend-api-calls.json").read_text(encoding="utf-8-sig"))
paths = app.openapi()["paths"]
missing = []
for call in evidence["calls"]:
    url = "/api/v1/" + call["url"].split("?")[0].lstrip("/")
    found = any(call["method"].lower() in methods and re.fullmatch(re.sub(r"\{[^}]+\}", "[^/]+", route), url) for route, methods in paths.items())
    if not found:
        missing.append(call)
print(json.dumps({"checked": len(evidence["calls"]), "unmatched": missing}, indent=2))
raise SystemExit(bool(missing))
