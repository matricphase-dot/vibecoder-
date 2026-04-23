# backend/src/enterprise/pii_filter.py
import re

class PIIFilter:
    # Regex patterns for common PII
    PATTERNS = {
        "phone": re.compile(r'\b\d{3}[-.]?\d{3}[-.]?\d{4}\b'),
        "email": re.compile(r'\b[\w\.-]+@[\w\.-]+\.\w+\b'),
        "ssn": re.compile(r'\b\d{3}-\d{2}-\d{4}\b'),
        "credit_card": re.compile(r'\b\d{4}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4}\b'),
    }

    @classmethod
    def strip_pii(cls, text: str) -> str:
        """Replace PII with [REDACTED] labels."""
        result = text
        for name, pattern in cls.PATTERNS.items():
            result = pattern.sub(f"[{name.upper()}_REDACTED]", result)
        return result

    @classmethod
    def contains_pii(cls, text: str) -> bool:
        for pattern in cls.PATTERNS.values():
            if pattern.search(text):
                return True
        return False
