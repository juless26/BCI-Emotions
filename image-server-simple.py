#!/usr/bin/env python3
"""
Simple image generation server using http.server instead of Flask.
Runs on localhost:5000
"""

from http.server import HTTPServer, BaseHTTPRequestHandler
import json
import requests
import base64
import io
from PIL import Image
from urllib.parse import urlparse, parse_qs

HF_TOKEN = "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"
HF_API_URL = "https://api-inference.huggingface.co/models/stabilityai/stable-diffusion-2-1"

class ImageServerHandler(BaseHTTPRequestHandler):
    def do_OPTIONS(self):
        """Handle CORS preflight requests"""
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'POST, GET, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()

    def do_GET(self):
        """Handle health check"""
        if self.path == '/health':
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            self.wfile.write(json.dumps({'status': 'ok'}).encode())
        else:
            self.send_response(404)
            self.end_headers()

    def do_POST(self):
        """Handle image generation requests"""
        if self.path != '/generate':
            self.send_response(404)
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            return

        try:
            # Read request body
            content_length = int(self.headers.get('Content-Length', 0))
            body = self.rfile.read(content_length)
            data = json.loads(body.decode())

            prompt = data.get('prompt', '').strip()
            if not prompt:
                self.send_response(400)
                self.send_header('Content-Type', 'application/json')
                self.send_header('Access-Control-Allow-Origin', '*')
                self.end_headers()
                self.wfile.write(json.dumps({'error': 'No prompt provided'}).encode())
                return

            print(f"Generating image for: {prompt}")

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
                self.send_response(response.status_code)
                self.send_header('Content-Type', 'application/json')
                self.send_header('Access-Control-Allow-Origin', '*')
                self.end_headers()
                self.wfile.write(json.dumps({'error': f'Image generation failed: {error_text}'}).encode())
                return

            # Convert image to base64
            image = Image.open(io.BytesIO(response.content))
            buffered = io.BytesIO()
            image.save(buffered, format="PNG")
            img_str = base64.b64encode(buffered.getvalue()).decode()

            # Send response
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            result = json.dumps({
                'success': True,
                'image': f'data:image/png;base64,{img_str}'
            })
            self.wfile.write(result.encode())

        except Exception as e:
            print(f"Error: {e}")
            self.send_response(500)
            self.send_header('Content-Type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            self.wfile.write(json.dumps({'error': str(e)}).encode())

    def log_message(self, format, *args):
        """Suppress default logging"""
        pass

if __name__ == '__main__':
    server = HTTPServer(('0.0.0.0', 5001), ImageServerHandler)
    print("Starting simple image generation server on http://localhost:5001")
    print(f"Using Hugging Face token: {HF_TOKEN[:20]}...")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nServer stopped")
        server.server_close()
