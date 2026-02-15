"""
NLP package initialization
"""

from .pubmed_fetcher import PubMedFetcher
from .arxiv_fetcher import ArxivFetcher
from .shodhganga_fetcher import ShodhgangaFetcher

__all__ = [
    'PubMedFetcher',
    'ArxivFetcher', 
    'ShodhgangaFetcher'
]
