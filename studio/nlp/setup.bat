@echo off
REM Setup NLP models on Windows

cd /d "%~dp0"

echo Starting NLP setup...
python setup.py

echo.
echo Setup complete! Run the inference server with:
echo   python inference_server.py
pause
