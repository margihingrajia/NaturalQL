"""
Simple in-process LRU cache that stores successful natural-language → SQL pairs.
Entries survive only for the lifetime of the server process.
For persistence, swap the dict with a SQLite or Redis backend.
"""
from collections import OrderedDict
from difflib import SequenceMatcher
import threading

_CACHE_LOCK = threading.Lock()
_MAX_ENTRIES = 256

# { normalized_question: sql }
_store: OrderedDict[str, str] = OrderedDict()


def _normalize(text: str) -> str:
    return " ".join(text.lower().split())


def remember(question: str, sql: str) -> None:
    """Store a successful question → SQL mapping."""
    key = _normalize(question)
    with _CACHE_LOCK:
        _store[key] = sql
        _store.move_to_end(key)
        if len(_store) > _MAX_ENTRIES:
            _store.popitem(last=False)


def recall(question: str, threshold: float = 0.85) -> str | None:
    """
    Return a cached SQL if a sufficiently similar question was seen before.
    Uses sequence-ratio similarity (not embeddings) for lightweight matching.
    """
    key = _normalize(question)
    with _CACHE_LOCK:
        # Exact hit
        if key in _store:
            return _store[key]

        # Fuzzy hit
        best_ratio = 0.0
        best_sql = None
        for cached_key, cached_sql in _store.items():
            ratio = SequenceMatcher(None, key, cached_key).ratio()
            if ratio > best_ratio:
                best_ratio = ratio
                best_sql = cached_sql

        if best_ratio >= threshold:
            return best_sql
    return None


def hint(question: str) -> str | None:
    """
    Return a human-readable hint about a cached similar query,
    for injection into the prompt as context.
    """
    cached = recall(question)
    if cached:
        return f"A similar question was previously answered with: {cached}"
    return None


def clear() -> None:
    with _CACHE_LOCK:
        _store.clear()


def stats() -> dict:
    with _CACHE_LOCK:
        return {"entries": len(_store), "max_entries": _MAX_ENTRIES}
