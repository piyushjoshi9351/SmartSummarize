@echo off
REM Activate virtual environment
call venv\Scripts\activate.bat

REM Upgrade pip first
python -m pip install --upgrade pip

REM Install basic dependencies
pip install flask numpy pandas nltk PyPDF2 --no-cache-dir

REM Install PyTorch CPU-only version (smaller download)
pip install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cpu --no-cache-dir

REM Install transformers
pip install transformers --no-cache-dir

REM Verify installation
python -c "import torch; import transformers; print('All dependencies installed successfully!')"

pause
