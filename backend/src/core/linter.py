import subprocess
import json
import os
import tempfile
from pathlib import Path

LINTER_DIR = Path(__file__).parent.parent.parent / "linter"

def run_eslint(code, filename="temp.js"):
    """Run ESLint on JavaScript code."""
    try:
        with tempfile.NamedTemporaryFile(mode='w', suffix='.js', delete=False) as f:
            f.write(code)
            temp_path = f.name
        result = subprocess.run(
            ["npx", "eslint", "--format", "json", temp_path],
            cwd=str(LINTER_DIR),
            capture_output=True,
            text=True,
            timeout=10
        )
        if result.returncode not in [0, 1]:  # ESLint returns 1 if there are warnings/errors
            return {"error": result.stderr}
        output = json.loads(result.stdout)
        # Format to our structure
        issues = []
        for file_result in output:
            for msg in file_result.get("messages", []):
                issues.append({
                    "line": msg.get("line", 0),
                    "column": msg.get("column", 0),
                    "message": msg.get("message", ""),
                    "ruleId": msg.get("ruleId", ""),
                    "severity": msg.get("severity", 1),  # 1=warning,2=error
                    "fix": msg.get("fix") is not None  # whether auto-fixable
                })
        return {"issues": issues}
    except Exception as e:
        return {"error": str(e)}
    finally:
        os.unlink(temp_path)

def run_stylelint(code, filename="temp.css"):
    """Run stylelint on CSS code."""
    try:
        with tempfile.NamedTemporaryFile(mode='w', suffix='.css', delete=False) as f:
            f.write(code)
            temp_path = f.name
        result = subprocess.run(
            ["npx", "stylelint", "--formatter", "json", temp_path],
            cwd=str(LINTER_DIR),
            capture_output=True,
            text=True,
            timeout=10
        )
        if result.returncode not in [0, 2]:  # stylelint returns 2 if errors
            return {"error": result.stderr}
        output = json.loads(result.stdout)
        issues = []
        for file_result in output:
            for warning in file_result.get("warnings", []):
                issues.append({
                    "line": warning.get("line", 0),
                    "column": warning.get("column", 0),
                    "message": warning.get("text", ""),
                    "ruleId": warning.get("rule", ""),
                    "severity": 2 if warning.get("severity") == "error" else 1,
                    "fix": False  # stylelint auto-fix not implemented here
                })
        return {"issues": issues}
    except Exception as e:
        return {"error": str(e)}
    finally:
        os.unlink(temp_path)

def lint_code(files: dict):
    """Lint a dictionary of filenames to contents. Returns combined results per file."""
    results = {}
    for fname, content in files.items():
        if fname.endswith('.js'):
            results[fname] = run_eslint(content, fname)
        elif fname.endswith('.css'):
            results[fname] = run_stylelint(content, fname)
        else:
            results[fname] = {"issues": []}  # ignore other files
    return results
