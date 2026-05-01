from groq import Groq
from app.core.config import settings
import logging

logger = logging.getLogger(__name__)

_client: Groq | None = None


def get_client() -> Groq:
    global _client
    if _client is None:
        if not settings.GROQ_API_KEY:
            raise RuntimeError("GROQ_API_KEY is not set in environment")
        _client = Groq(api_key=settings.GROQ_API_KEY)
    return _client


def generate_sql(system_prompt: str, user_message: str, temperature: float = 0.1) -> str:
    """
    Send a prompt to Groq and return the raw text response.
    Low temperature keeps SQL generation deterministic.
    """
    client = get_client()
    try:
        response = client.chat.completions.create(
            model=settings.GROQ_MODEL,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_message},
            ],
            temperature=temperature,
            max_tokens=1024,
        )
        return response.choices[0].message.content.strip()
    except Exception as e:
        logger.error(f"Groq API error: {e}")
        raise
