"""
Simple local PDF summarizer.

Usage:
  python pdf_summarizer.py sample.pdf
"""

from __future__ import annotations

import sys
from pathlib import Path

from PyPDF2 import PdfReader
from transformers import pipeline


def extract_text(pdf_path: str) -> str:
    reader = PdfReader(pdf_path)
    parts: list[str] = []

    for page in reader.pages:
        page_text = page.extract_text() or ""
        page_text = page_text.strip()
        if page_text:
            parts.append(page_text)

    return "\n".join(parts)


def chunk_text(text: str, chunk_size: int = 500) -> list[str]:
    text = " ".join(text.split())
    return [text[i : i + chunk_size] for i in range(0, len(text), chunk_size) if text[i : i + chunk_size].strip()]


def summarize_chunks(chunks: list[str]) -> str:
    summarizer = pipeline("summarization")
    summaries: list[str] = []

    for chunk in chunks:
        result = summarizer(chunk, max_length=80, min_length=30, do_sample=False)
        summaries.append(result[0]["summary_text"])

    return " ".join(summaries)


def main() -> int:
    if len(sys.argv) < 2:
        print("Usage: python pdf_summarizer.py <pdf-path>")
        return 1

    pdf_path = Path(sys.argv[1])
    if not pdf_path.exists():
        print(f"File not found: {pdf_path}")
        return 1

    text = extract_text(str(pdf_path))
    if not text.strip():
        print("No extractable text found in the PDF.")
        return 1

    chunks = chunk_text(text)
    if not chunks:
        print("Unable to split extracted text into chunks.")
        return 1

    final_summary = summarize_chunks(chunks)
    print("\nFINAL SUMMARY:\n")
    print(final_summary)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())