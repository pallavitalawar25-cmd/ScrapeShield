import os
import time
import requests
from flask import Flask, jsonify
from flask_cors import CORS
from dotenv import load_dotenv

load_dotenv(os.path.join(os.path.dirname(__file__), ".env"))

app = Flask(__name__)
CORS(app)

COLLECTOR_ID = "c_mt4depzp1d2e94mq76"
API_TOKEN = os.getenv("BRIGHTDATA_API_TOKEN")

TRIGGER_URL = "https://api.brightdata.com/dca/trigger"
RESULT_URL = "https://api.brightdata.com/dca/dataset"

print("TOKEN LOADED:", bool(API_TOKEN))
print("TOKEN LENGTH:", len(API_TOKEN) if API_TOKEN else 0)


# --------------------------------------------------
# HOME
# --------------------------------------------------

@app.route("/")
def home():
    return jsonify({
        "message": "ScrapeShield API is running",
        "collector_id": COLLECTOR_ID
    })


# --------------------------------------------------
# TRIGGER SCRAPER
# --------------------------------------------------

@app.route("/api/scrape", methods=["POST"])
def scrape():

    # Start with 5 pages for testing
    urls = [
        "https://books.toscrape.com/",
        "https://books.toscrape.com/catalogue/page-2.html",
        "https://books.toscrape.com/catalogue/page-3.html",
        "https://books.toscrape.com/catalogue/page-4.html",
        "https://books.toscrape.com/catalogue/page-5.html"
    ]

    payload = [{"url": url} for url in urls]

    headers = {
        "Authorization": f"Bearer {API_TOKEN}",
        "Content-Type": "application/json"
    }

    response = requests.post(
        f"{TRIGGER_URL}?collector={COLLECTOR_ID}",
        headers=headers,
        json=payload
    )

    try:
        result = response.json()
    except Exception:
        result = response.text

    return jsonify({
        "status_code": response.status_code,
        "collector_id": COLLECTOR_ID,
        "bright_data_response": result
    })


# --------------------------------------------------
# GET RESULTS
# --------------------------------------------------

@app.route("/api/results/<collection_id>", methods=["GET"])
def get_results(collection_id):

    headers = {
        "Authorization": f"Bearer {API_TOKEN}"
    }

    response = requests.get(
        f"{RESULT_URL}?id={collection_id}",
        headers=headers
    )

    try:
        result = response.json()
    except Exception:
        result = response.text

    return jsonify({
        "status_code": response.status_code,
        "collection_id": collection_id,
        "results": result
    })


# --------------------------------------------------
# HEALTH CHECK
# --------------------------------------------------

@app.route("/api/health/<collection_id>", methods=["GET"])
def health_check(collection_id):

    headers = {
        "Authorization": f"Bearer {API_TOKEN}"
    }

    response = requests.get(
        f"{RESULT_URL}?id={collection_id}",
        headers=headers
    )

    try:
        data = response.json()
    except Exception:
        return jsonify({
            "status": "error",
            "message": "Could not read Bright Data response"
        }), 500

    # Dataset still processing
    if response.status_code != 200:
        return jsonify({
            "status": "building",
            "collection_id": collection_id,
            "message": data.get("message", "Dataset is still processing")
        }), response.status_code

    result = data

    # Handle one result or multiple results
    records = result if isinstance(result, list) else [result]

    expected_fields = [
        "title",
        "price",
        "availability",
        "rating",
        "category",
        "product_url"
    ]

    field_stats = {}

    for field in expected_fields:
        present = 0

        for record in records:
            value = record.get(field)

            if value is not None and value != "":
                present += 1

        field_stats[field] = {
            "present": present,
            "total": len(records),
            "success_rate": round(
                (present / len(records)) * 100, 2
            ) if records else 0
        }

    missing_fields = [
        field
        for field, stats in field_stats.items()
        if stats["success_rate"] < 100
    ]

    status = "healthy" if not missing_fields else "warning"

    return jsonify({
        "status": status,
        "collection_id": collection_id,
        "records": len(records),
        "field_health": field_stats,
        "missing_fields": missing_fields
    })


# --------------------------------------------------
# DEMO SELF-HEAL
# --------------------------------------------------

@app.route("/api/self-heal", methods=["POST"])
def self_heal():

    return jsonify({
        "status": "healing",
        "message": "Extraction failure detected. Self-healing workflow initiated.",
        "steps": [
            "Detect missing extraction field",
            "Analyze previous extraction schema",
            "Generate repaired extraction logic",
            "Re-run Bright Data collector",
            "Validate recovered fields"
        ]
    })


if __name__ == "__main__":
    app.run(debug=True, port=5000)