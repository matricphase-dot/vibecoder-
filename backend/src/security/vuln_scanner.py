# backend/src/security/vuln_scanner.py
import subprocess
import json
from pathlib import Path
from typing import List, Dict
from transformers import AutoModelForSeq2SeqLM, AutoTokenizer
import torch
import logging

logger = logging.getLogger(__name__)

class VulnerabilityScanner:
    def __init__(self):
        self.device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
        # Load CodeBERT model fine-tuned for vulnerability detection
        self.model_name = "mrm8488/codebert-base-finetuned-detect-insecure-code"
        try:
            self.tokenizer = AutoTokenizer.from_pretrained(self.model_name)
            self.model = AutoModelForSeq2SeqLM.from_pretrained(self.model_name).to(self.device)
        except Exception as e:
            logger.warning(f"Could not load CodeBERT model: {e}. Using Semgrep only.")
            self.model = None

    def scan_file(self, code: str, language: str = "python") -> List[Dict]:
        """Scan code for vulnerabilities, returns list of findings."""
        findings = []
        # 1. Semgrep (fast, rule-based)
        semgrep_findings = self._run_semgrep(code, language)
        findings.extend(semgrep_findings)
        # 2. CodeBERT (ML-based)
        if self.model:
            bert_findings = self._run_codebert(code)
            findings.extend(bert_findings)
        return findings

    def _run_semgrep(self, code: str, language: str) -> List[Dict]:
        # Write code to temporary file and run semgrep
        import tempfile
        with tempfile.NamedTemporaryFile(mode='w', suffix=f".{language}", delete=False) as f:
            f.write(code)
            tmp_path = f.name
        try:
            result = subprocess.run(
                ["semgrep", "--json", "--config", "auto", tmp_path],
                capture_output=True, text=True, timeout=30
            )
            if result.returncode == 0:
                data = json.loads(result.stdout)
                findings = []
                for finding in data.get("results", []):
                    findings.append({
                        "line": finding.get("start", {}).get("line", 0),
                        "severity": finding.get("extra", {}).get("severity", "medium"),
                        "cwe_id": finding.get("check_id", ""),
                        "description": finding.get("extra", {}).get("message", ""),
                        "fix_suggestion": "",
                        "source": "semgrep"
                    })
                return findings
        except Exception as e:
            logger.error(f"Semgrep error: {e}")
        finally:
            Path(tmp_path).unlink(missing_ok=True)
        return []

    def _run_codebert(self, code: str) -> List[Dict]:
        if not self.model:
            return []
        inputs = self.tokenizer(code, return_tensors="pt", truncation=True, max_length=512).to(self.device)
        with torch.no_grad():
            outputs = self.model.generate(**inputs, max_length=50)
        result = self.tokenizer.decode(outputs[0], skip_special_tokens=True)
        # Result is a short description; we'll treat as a single finding
        if result and len(result) > 0:
            return [{
                "line": 0,
                "severity": "medium",
                "cwe_id": "unknown",
                "description": result,
                "fix_suggestion": "",
                "source": "codebert"
            }]
        return []

    def scan_workspace(self, files: Dict[str, str]) -> Dict[str, List[Dict]]:
        results = {}
        for path, code in files.items():
            lang = path.split('.')[-1]
            findings = self.scan_file(code, lang)
            if findings:
                results[path] = findings
        return results
