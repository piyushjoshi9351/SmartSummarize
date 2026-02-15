"""
Main Data Pipeline Orchestrator
Fetches, processes, and creates training datasets
"""

import os
import json
from pathlib import Path
from typing import List, Dict
from datetime import datetime

from fetchers.pubmed_fetcher import PubMedFetcher
from fetchers.arxiv_fetcher import ArxivFetcher
from fetchers.shodhganga_fetcher import ShodhgangaFetcher
from data_processor import DataProcessor


class DataPipelineOrchestrator:
    def __init__(self, output_dir: str = "./data"):
        self.output_dir = Path(output_dir)
        self.output_dir.mkdir(exist_ok=True)
        
        self.pubmed = PubMedFetcher()
        self.arxiv = ArxivFetcher()
        self.shodhganga = ShodhgangaFetcher()
        self.processor = DataProcessor()
    
    def fetch_all_data(self, num_samples: int = 20) -> Dict[str, List]:
        """Fetch data from all sources"""
        print("=" * 60)
        print("FETCHING DATA FROM ALL SOURCES")
        print("=" * 60)
        
        all_data = {
            "pubmed": [],
            "arxiv": [],
            "shodhganga": []
        }
        
        # Fetch from PubMed
        print("\n1. Fetching from PubMed...")
        pubmed_papers = self.pubmed.fetch_multiple(
            "machine learning AND healthcare", 
            max_results=num_samples
        )
        all_data["pubmed"] = pubmed_papers
        print(f"   ✓ Fetched {len(pubmed_papers)} papers from PubMed")
        
        # Fetch from arXiv
        print("\n2. Fetching from arXiv...")
        arxiv_papers = self.arxiv.search_papers(
            "natural language processing", 
            max_results=num_samples
        )
        all_data["arxiv"] = arxiv_papers
        print(f"   ✓ Fetched {len(arxiv_papers)} papers from arXiv")
        
        # Fetch from Shodhganga
        print("\n3. Fetching from Shodhganga...")
        shodhganga_papers = self.shodhganga.search_theses(
            "computer science", 
            max_results=num_samples
        )
        all_data["shodhganga"] = shodhganga_papers
        print(f"   ✓ Fetched {len(shodhganga_papers)} papers from Shodhganga")
        
        return all_data
    
    def prepare_training_datasets(self, data: Dict[str, List]):
        """Prepare datasets for different NLP tasks"""
        print("\n" + "=" * 60)
        print("PREPARING TRAINING DATASETS")
        print("=" * 60)
        
        # Normalize source data format
        all_papers = []
        for source, papers in data.items():
            for paper in papers:
                paper["source"] = source
                all_papers.append(paper)
        
        # Process papers
        df = self.processor.process_papers(all_papers)
        
        if len(df) == 0:
            print("No papers to process. Exiting.")
            return
        
        print(f"\n✓ Processed {len(df)} papers")
        
        # 1. Summarization Dataset
        print("\nCreating Summarization Dataset...")
        summary_df = df[['text', 'summary', 'source']].copy()
        summary_df.columns = ['document', 'summary', 'source']
        summary_path = self.output_dir / "summarization_train.csv"
        summary_df.to_csv(summary_path, index=False)
        print(f"  ✓ Saved to {summary_path}")
        
        # 2. Extractive QA Dataset (based on sentences)
        print("\nCreating Q&A Dataset...")
        qa_data = []
        for _, row in df.iterrows():
            sentences = row['sentences']
            if len(sentences) >= 2:
                for i, sentence in enumerate(sentences[:-1]):
                    qa_data.append({
                        "context": row['text'],
                        "question": f"What is discussed in '{sentence[:50]}...'?",
                        "answer": sentence,
                        "source": row['source']
                    })
        
        qa_df = pd.DataFrame(qa_data)
        qa_path = self.output_dir / "qa_train.csv"
        qa_df.to_csv(qa_path, index=False)
        print(f"  ✓ Saved to {qa_path} ({len(qa_df)} Q&A pairs)")
        
        # 3. Sentiment/Tone Analysis Dataset (synthetic for now)
        print("\nCreating Tone Analysis Dataset...")
        tone_data = []
        tones = ["academic", "technical", "formal", "informal", "critical", "neutral"]
        
        for _, row in df.iterrows():
            # Simple heuristic for tone
            text = row['text'].lower()
            tone = "academic" if any(word in text for word in ["study", "research", "analysis"]) else "technical"
            
            tone_data.append({
                "text": row['text'][:512],  # Limit length
                "tone": tone,
                "sentiment": "neutral",
                "source": row['source']
            })
        
        tone_df = pd.DataFrame(tone_data)
        tone_path = self.output_dir / "tone_train.csv"
        tone_df.to_csv(tone_path, index=False)
        print(f"  ✓ Saved to {tone_path}")
        
        return {
            "summarization": summary_path,
            "qa": qa_path,
            "tone": tone_path
        }
    
    def save_metadata(self, data: Dict):
        """Save metadata about the datasets"""
        metadata = {
            "timestamp": datetime.now().isoformat(),
            "sources": {
                "pubmed": len(data.get("pubmed", [])),
                "arxiv": len(data.get("arxiv", [])),
                "shodhganga": len(data.get("shodhganga", []))
            },
            "total_papers": sum(len(v) for v in data.values())
        }
        
        metadata_path = self.output_dir / "metadata.json"
        with open(metadata_path, 'w') as f:
            json.dump(metadata, f, indent=2)
        
        print(f"\n✓ Metadata saved to {metadata_path}")
        return metadata


if __name__ == "__main__":
    import pandas as pd
    
    orchestrator = DataPipelineOrchestrator()
    
    # Fetch data
    data = orchestrator.fetch_all_data(num_samples=15)
    
    # Prepare datasets
    dataset_paths = orchestrator.prepare_training_datasets(data)
    
    # Save metadata
    metadata = orchestrator.save_metadata(data)
    
    print("\n" + "=" * 60)
    print("PIPELINE COMPLETE!")
    print("=" * 60)
    print(f"\nGenerated Datasets:")
    for name, path in dataset_paths.items():
        print(f"  • {name}: {path}")
