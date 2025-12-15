import os
import traceback
from flask import Flask, request, jsonify
from flask_cors import CORS
import google.generativeai as genai
import requests

app = Flask(__name__)
CORS(app)


@app.route("/api/health", methods=["GET"])
def health():
    return jsonify({"status": "online"}), 200


@app.route("/api/ai/generate", methods=["POST"])
def generate_gemini():
    try:
        data = request.get_json(force=True)

        model_name = data.get("model")
        contents = data.get("contents")
        config = data.get("config", {})

        if not model_name or not contents:
            return jsonify({"success": False, "error": "Missing model or contents"}), 400

        api_key = os.getenv("GOOGLE_API_KEY")
        if not api_key:
            return jsonify({"success": False, "error": "GOOGLE_API_KEY not set"}), 500

        genai.configure(api_key=api_key)

        model = genai.GenerativeModel(
            model_name=model_name,
            generation_config=config
        )

        response = model.generate_content(contents)

        return jsonify({"success": True, "data": response.text}), 200

    except Exception as e:
        return jsonify({
            "success": False,
            "error": str(e),
            "trace": traceback.format_exc()
        }), 500


@app.route("/api/ai/groq", methods=["POST"])
def generate_groq():
    try:
        data = request.get_json(force=True)

        groq_api_key = data.get("api_key")
        payload = data.get("payload")

        if not groq_api_key or not payload:
            return jsonify({"success": False, "error": "Missing Groq key or payload"}), 400

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
            "error": str(e),
            "trace": traceback.format_exc()
        }), 500


if __name__ == "__main__":
    app.run(debug=True)