"""Optional live provider check: python -m app.ai_smoke. Uses no private records."""
from dotenv import load_dotenv

from . import ai


if __name__ == "__main__":
    load_dotenv()
    try:
        result = ai.analyze({
            "challenge": {"title": "Demo community water access", "description": "A fictional community needs a low-cost water filter to address seasonal drinking water shortages.", "district": "Ranchi"},
            "candidates": [],
            "universities": [{"id": "demo-water-institute", "name": "Demo Water Institute", "domains": ["water"], "expertise": "Water treatment engineering", "facilities": "Water testing lab"}],
        })
        assert result["domain"] == "water", result["domain"]
        assert result["summary_en"] and result["summary_hi"]
        print("PASS: Live structured classification, bilingual summaries and reference validation.")
    except RuntimeError as exc:
        if str(exc) != "ai_not_configured":
            raise
        print("SKIPPED: Gemini ADC or API key is not configured. Manual review remains available.")
