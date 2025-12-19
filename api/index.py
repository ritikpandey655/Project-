import os
from flask import Flask, request, jsonify
from flask_cors import CORS
import google.generativeai as genai
import requests
import traceback

app = Flask(__name__)
CORS(app)


@app.route("/api/health", methods=["GET"])
def health():
    return jsonify({"status": "online"}), 200


@app.route("/api/ai/generate", methods=["POST"])
def generate_gemini():
    try:
        data = request.get_json(force=True)

        prompt = data.get("prompt")
        config = data.get("config", {})

        if not prompt:
            return jsonify({
                "success": False,
                "error": "prompt field is required"
            }), 400

        api_key = os.getenv("GOOGLE_API_KEY")
        if not api_key:
            return jsonify({
                "success": False,
                "error": "GOOGLE_API_KEY not set"
            }), 500

        genai.configure(api_key=api_key)

        model = genai.GenerativeModel("models/gemini-2.5-flash")

        response = model.generate_content(
            prompt,
            generation_config=config
        )

        return jsonify({
            "success": True,
            "data": response.text
        }), 200

    except Exception as e:
        print("🔥 GEMINI ERROR")
        print(traceback.format_exc())
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500


@app.route("/api/ai/groq", methods=["POST"])
def generate_groq():
    try:
        data = request.get_json(force=True)

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
    app.run(debug=True)
