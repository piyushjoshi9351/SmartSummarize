#!/bin/bash
# Setup NLP models on Unix/Linux/MacOS

cd "$(dirname "$0")" || exit

echo "Starting NLP setup..."
python3 setup.py

echo ""
echo "Setup complete! Run the inference server with:"
echo "  python3 inference_server.py"
