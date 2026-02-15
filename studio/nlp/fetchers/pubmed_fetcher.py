"""
PubMed Data Fetcher
Fetches biomedical research papers and abstracts from PubMed
"""

import requests
import feedparser
from typing import List, Dict
import time
from tqdm import tqdm

class PubMedFetcher:
    def __init__(self):
        self.base_url = "https://eutils.ncbi.nlm.nih.gov/entrez/eutils"
        self.email = "your-email@example.com"  # Required by NCBI
        
    def search_papers(self, query: str, max_results: int = 100) -> List[str]:
        """Search PubMed and get PMIDs"""
        search_url = f"{self.base_url}/esearch.fcgi"
        params = {
            "db": "pubmed",
            "term": query,
            "retmax": max_results,
            "rettype": "json",
            "email": self.email
        }
        
        try:
            response = requests.get(search_url, params=params)
            response.raise_for_status()
            data = response.json()
            pmids = data.get("esearchresult", {}).get("idlist", [])
            return pmids
        except Exception as e:
            print(f"Error searching PubMed: {e}")
            return []
    
    def fetch_abstract(self, pmid: str) -> Dict:
        """Fetch abstract and metadata for a PMID"""
        fetch_url = f"{self.base_url}/efetch.fcgi"
        params = {
            "db": "pubmed",
            "id": pmid,
            "rettype": "json",
            "email": self.email
        }
        
        try:
            response = requests.get(fetch_url, params=params)
            response.raise_for_status()
            data = response.json()
            
            article = data.get("result", {}).get(pmid, {})
            return {
                "pmid": pmid,
                "title": article.get("title", ""),
                "abstract": article.get("abstracttext", ""),
                "authors": article.get("authors", []),
            }
        except Exception as e:
            print(f"Error fetching abstract {pmid}: {e}")
            return {}
    
    def fetch_multiple(self, query: str, max_results: int = 50) -> List[Dict]:
        """Fetch multiple papers"""
        print(f"Searching PubMed for: {query}")
        pmids = self.search_papers(query, max_results)
        
        papers = []
        for pmid in tqdm(pmids, desc="Fetching PubMed papers"):
            paper = self.fetch_abstract(pmid)
            if paper and paper.get("abstract"):
                papers.append(paper)
            time.sleep(0.1)  # Rate limiting
        
        return papers


if __name__ == "__main__":
    fetcher = PubMedFetcher()
    papers = fetcher.fetch_multiple("machine learning AND medical imaging", max_results=10)
    
    for paper in papers:
        print(f"\n{paper['title']}")
        print(f"Abstract: {paper['abstract'][:200]}...")
