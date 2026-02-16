"""
Data Processing Pipeline
Cleans and processes fetched data for training
"""

import pandas as pd
from typing import List, Dict
import re
import nltk
from nltk.tokenize import sent_tokenize
from tqdm import tqdm

# Download required NLTK data
try:
    nltk.data.find('tokenizers/punkt')
except LookupError:
    nltk.download('punkt')

class DataProcessor:
    def __init__(self):
        pass
    
    @staticmethod
    def clean_text(text: str) -> str:
        """Clean and normalize text"""
        if not text:
            return ""
        
        # Remove URLs
        text = re.sub(r'http\S+|www.\S+', '', text)
        
        # Remove special characters but keep basic punctuation
        text = re.sub(r'[^\w\s\.\!\?\-\'\"]', '', text)
        
        # Remove extra whitespace
        text = ' '.join(text.split())
        
        # Remove very short texts
        if len(text.split()) < 10:
            return ""
        
        return text.strip()
    
    @staticmethod
    def split_sentences(text: str) -> List[str]:
        """Split text into sentences"""
        try:
            sentences = sent_tokenize(text)
            return [s.strip() for s in sentences if len(s.split()) > 3]
        except:
            return [text]
    
    @staticmethod
    def create_summary_snippets(text: str, num_sentences: int = 3) -> str:
        """Create summary by selecting key sentences"""
        sentences = DataProcessor.split_sentences(text)
        
        if len(sentences) <= num_sentences:
            return ' '.join(sentences)
        
        # Simple extractive summarization: select first, middle, and last sentence
        summary_indices = [
            0,
            len(sentences) // 2,
            len(sentences) - 1
        ]
        summary = ' '.join([sentences[i] for i in sorted(set(summary_indices))])
        return summary
    
    def process_papers(self, papers: List[Dict]) -> pd.DataFrame:
        """Process list of papers into clean dataset"""
        processed = []
        
        print("Processing papers...")
        for paper in tqdm(papers):
            title = self.clean_text(paper.get("title", ""))
            abstract = self.clean_text(paper.get("abstract", ""))
            
            if not title or not abstract:
                continue
            
            # Create summary
            summary = self.create_summary_snippets(abstract, num_sentences=2)
            
            processed.append({
                "title": title,
                "text": abstract,
                "summary": summary,
                "sentences": self.split_sentences(abstract),
                "source": paper.get("source", "unknown")
            })
        
        return pd.DataFrame(processed)
    
    @staticmethod
    def save_dataset(df: pd.DataFrame, output_path: str):
        """Save processed dataset"""
        df.to_csv(output_path, index=False)
        print(f"Dataset saved to {output_path}")
        return output_path


if __name__ == "__main__":
    processor = DataProcessor()
    
    # Test with sample data
    sample_papers = [
        {
            "title": "Machine Learning in Healthcare",
            "abstract": "This paper presents a comprehensive review of machine learning applications in healthcare. We discuss various algorithms including neural networks, decision trees, and support vector machines. The applications covered include disease diagnosis, treatment planning, and patient outcome prediction.",
            "source": "arxiv"
        },
        {
            "title": "Natural Language Processing Advances",
            "abstract": "Recent advances in NLP have revolutionized how computers understand human language. Transformer-based models like BERT and GPT have achieved state-of-the-art results on various benchmarks. This paper reviews these developments and their practical applications.",
            "source": "pubmed"
        }
    ]
    
    df = processor.process_papers(sample_papers)
    print(df.head())
