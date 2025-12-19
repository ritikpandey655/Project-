import os
import traceback
from flask import Flask, request, jsonify
from flask_cors import CORS
import google.generativeai as genai
import requests

app = Flask(__name__)
CORS(app)


# -----------------------
# Health Check
# -----------------------
@app.route("/api/health", methods=["GET"])
def health():
    return jsonify({"status": "online"})


# -----------------------
# Gemini 2.5 Flash
# -----------------------
@app.route("/api/ai/generate", methods=["POST"])
def generate_gemini():
    try:
        data = request.get_json()

        contents = data.get("contents")
        config = data.get("config", {})

        if not contents:
            return jsonify({
                "success": False,
                "error": "contents field is required"
            }), 400

        api_key = os.environ.get("GOOGLE_API_KEY")
        if not api_key:
            return jsonify({
                "success": False,
                "error": "GOOGLE_API_KEY not set"
            }), 500

        genai.configure(api_key=api_key)

        model = genai.GenerativeModel("models/gemini-2.5-flash")

        response = model.generate_content(
            contents=contents,
            generation_config=config
        )

        return jsonify({
            "success": True,
            "data": response.text
        })

    except Exception as e:
        print(traceback.format_exc())
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500


# -----------------------
# Groq Proxy
# -----------------------
@app.route("/api/ai/groq", methods=["POST"])
def generate_groq():
    try:
        data = request.get_json()

        groq_api_key = data.get("api_key")
        payload = data.get("payload")

        if not groq_api_key or not payload:
            return jsonify({
                "success": False,
                "error": "api_key and payload required"
            }), 400

        headers = {
            "Authorization": f"Bearer {groq_api_key}",
            "Content-Type": "application/json"
        }

        response = requests.post(
            "https://api.groq.com/openai/v1/chat/completions",
            headers=headers,
            json=payload,
            timeout=30
        )

        return jsonify(response.json()), response.status_code

    except Exception as e:
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500


if __name__ == "__main__":
    app.run()
