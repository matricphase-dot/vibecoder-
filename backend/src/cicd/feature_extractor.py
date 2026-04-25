# backend/src/cicd/feature_extractor.py
import numpy as np
from typing import List

def extract_features(changed_files: List[str]) -> np.array:
    features = []
    # Feature 1: number of files changed
    features.append(len(changed_files))
    # Feature 2: number of test files changed
    test_files = sum(1 for f in changed_files if "test" in f.lower())
    features.append(test_files)
    # Feature 3: average file extension complexity (simple heuristic)
    ext_score = 0
    for f in changed_files:
        if f.endswith('.py'): ext_score += 1
        elif f.endswith('.js'): ext_score += 0.8
        elif f.endswith('.html'): ext_score += 0.3
    features.append(ext_score)
    # Feature 4: commit message length? (skip for demo)
    return np.array(features).reshape(1, -1)
