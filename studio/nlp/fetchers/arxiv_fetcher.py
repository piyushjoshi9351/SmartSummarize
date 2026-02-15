"""
arXiv Data Fetcher
Fetches research papers from arXiv
"""

import feedparser
from typing import List, Dict
from urllib.parse import urlencode
import time
from tqdm import tqdm

class ArxivFetcher:
    def __init__(self):
        self.base_url = "http://export.arxiv.org/api/query?"
    
    def search_papers(self, query: str, max_results: int = 50) -> List[Dict]:
        """Search arXiv and fetch papers"""
        params = {
            "search_query": f"all:{query}",
            "start": 0,
            "max_results": max_results,
            "sortBy": "submittedDate",
            "sortOrder": "descending"
        }
        
        url = self.base_url + urlencode(params)
        
        try:
            print(f"Fetching from arXiv: {query}")
            feed = feedparser.parse(url)
            
            papers = []
            for entry in tqdm(feed.entries, desc="Processing arXiv papers"):
                paper = {
                    "arxiv_id": entry.id.split("arxiv.org/abs/")[-1],
                    "title": entry.title,
                    "abstract": entry.summary,
                    "authors": [author.name for author in entry.authors],
                    "published": entry.published
                }
                papers.append(paper)
            
            return papers
        except Exception as e:
            print(f"Error fetching from arXiv: {e}")
            return []


if __name__ == "__main__":
    fetcher = ArxivFetcher()
    papers = fetcher.search_papers("natural language processing", max_results=10)
    
    for paper in papers:
        print(f"\n{paper['title']}")
        print(f"Abstract: {paper['abstract'][:200]}...")
