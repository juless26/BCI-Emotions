#!/usr/bin/env python3
"""
Simple image generation backend for BCI Paint mode.
Runs on localhost:5000 and handles Hugging Face API calls.
"""

from flask import Flask, request, jsonify
from flask_cors import CORS
import requests
import base64
import io
from PIL import Image

app = Flask(__name__)
CORS(app)

HF_TOKEN = "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"
HF_API_URL = "https://api-inference.huggingface.co/models/stabilityai/stable-diffusion-2-1"

@app.route('/generate', methods=['POST'])
def generate_image():
    try:
        data = request.json
        prompt = data.get('prompt', '')

        if not prompt:
            return jsonify({'error': 'No prompt provided'}), 400

        print(f"Generating image for prompt: {prompt}")

        # Call Hugging Face API
        headers = {"Authorization": f"Bearer {HF_TOKEN}"}
        response = requests.post(
            HF_API_URL,
            headers=headers,
            json={"inputs": prompt},
            timeout=120
        )

        if response.status_code != 200:
            error_text = response.text
            print(f"HF API error {response.status_code}: {error_text}")
            return jsonify({'error': f'Image generation failed: {error_text}'}), response.status_code

        # Convert image to base64
        image = Image.open(io.BytesIO(response.content))
        buffered = io.BytesIO()
        image.save(buffered, format="PNG")
        img_str = base64.b64encode(buffered.getvalue()).decode()

        return jsonify({
            'success': True,
            'image': f'data:image/png;base64,{img_str}'
        })

    except Exception as e:
        print(f"Error: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/health', methods=['GET'])
def health():
    return jsonify({'status': 'ok'})

if __name__ == '__main__':
    print("Starting image generation server on http://localhost:5000")
    print(f"Using Hugging Face token: {HF_TOKEN[:20]}...")
    app.run(debug=False, port=5000, host='127.0.0.1')
