"""
Shodhganga Data Fetcher
Fetches research papers from Shodhganga repository
"""

import requests
from typing import List, Dict
from bs4 import BeautifulSoup
import time
from tqdm import tqdm

class ShodhgangaFetcher:
    def __init__(self):
        self.base_url = "https://shodhganga.inflibnet.ac.in"
        self.oai_url = "https://shodhganga.inflibnet.ac.in/oai/request"
    
    def search_theses(self, subject: str, max_results: int = 50) -> List[Dict]:
        """Search Shodhganga using OAI-PMH protocol"""
        papers = []
        
        try:
            print(f"Searching Shodhganga for: {subject}")
            
            # Using OAI-PMH ListRecords
            params = {
                "verb": "ListRecords",
                "metadataPrefix": "oai_dc",
                "set": f"subject:{subject}",
            }
            
            response = requests.get(self.oai_url, params=params, timeout=10)
            response.raise_for_status()
            
            soup = BeautifulSoup(response.content, 'xml')
            records = soup.find_all('record')
            
            for record in records[:max_results]:
                metadata = record.find('metadata')
                if metadata:
                    title_elem = metadata.find('title')
                    abstract_elem = metadata.find('description')
                    
                    paper = {
                        "identifier": record.find('identifier').text if record.find('identifier') else "",
                        "title": title_elem.text if title_elem else "",
                        "abstract": abstract_elem.text if abstract_elem else "",
                        "subject": subject
                    }
                    if paper.get("abstract"):
                        papers.append(paper)
            
            return papers
        
        except Exception as e:
            print(f"Error fetching from Shodhganga: {e}")
            return []


if __name__ == "__main__":
    fetcher = ShodhgangaFetcher()
    papers = fetcher.search_theses("computer science", max_results=10)
    
    for paper in papers:
        print(f"\n{paper.get('title', 'N/A')}")
        print(f"Abstract: {paper.get('abstract', 'N/A')[:200]}...")
