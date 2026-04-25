# backend/src/cicd/failure_predictor.py
import pickle
from pathlib import Path
from sklearn.ensemble import GradientBoostingClassifier
from sklearn.model_selection import train_test_split
from sklearn.metrics import accuracy_score
import numpy as np
from typing import List
from src.cicd.history_collector import HistoryCollector
from src.cicd.feature_extractor import extract_features

class FailurePredictor:
    def __init__(self, model_path="./backend/models/cicd_model.pkl"):
        self.model_path = Path(model_path)
        self.model = None
        if self.model_path.exists():
            with open(self.model_path, "rb") as f:
                self.model = pickle.load(f)

    def train(self, days=90):
        collector = HistoryCollector()
        runs = collector.fetch_workflow_history(days)
        X = []
        y = []
        for run in runs:
            features = extract_features(run.changed_files)[0]
            X.append(features)
            y.append(1 if run.test_outcome == "fail" else 0)
        X = np.array(X)
        y = np.array(y)
        X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)
        self.model = GradientBoostingClassifier()
        self.model.fit(X_train, y_train)
        accuracy = accuracy_score(y_test, self.model.predict(X_test))
        print(f"Training complete. Accuracy: {accuracy:.2f}")
        # Save model
        self.model_path.parent.mkdir(parents=True, exist_ok=True)
        with open(self.model_path, "wb") as f:
            pickle.dump(self.model, f)
        return accuracy

    def predict(self, changed_files: List[str]) -> dict:
        if self.model is None:
            return {"failure_probability": 0.5, "risky_files": [], "reason": "Model not trained"}
        features = extract_features(changed_files)
        prob = self.model.predict_proba(features)[0][1]  # probability of failure
        return {
            "failure_probability": float(prob),
            "risky_files": changed_files[:3],  # top risky files
            "reason": "Based on CI history pattern"
        }
