import json
from collections import deque

class LoopDetector:
    def __init__(self, history_size=5):
        self.history = deque(maxlen=history_size)
    
    def detect(self, current_prompt):
        self.history.append(current_prompt)
        if len(self.history) < self.history_size:
            return None
        # Check if last 3 prompts are similar (simple similarity)
        last_three = list(self.history)[-3:]
        if len(set(last_three)) == 1:
            return "You've repeated the same request. Would you like help? Try rephrasing or use Instant Fix."
        return None
