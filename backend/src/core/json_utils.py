import json
import re

def extract_json(text: str):
    """
    Extract JSON object from text that may contain surrounding markdown or explanations.
    Returns the parsed JSON object.
    Raises ValueError if no JSON found or parsing fails.
    """
    # Try to find content between triple backticks with json
    match = re.search(r'```json\s*(\{.*?\})\s*```', text, re.DOTALL)
    if match:
        json_str = match.group(1)
    else:
        # Try any triple backticks
        match = re.search(r'```\s*(\{.*?\})\s*```', text, re.DOTALL)
        if match:
            json_str = match.group(1)
        else:
            # Otherwise, find the first '{' and last '}'
            start = text.find('{')
            end = text.rfind('}')
            if start != -1 and end != -1 and end > start:
                json_str = text[start:end+1]
            else:
                raise ValueError("No JSON object found in response")

    try:
        return json.loads(json_str)
    except json.JSONDecodeError as e:
        raise ValueError(f"Invalid JSON: {e}")
