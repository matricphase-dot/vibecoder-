import subprocess
import json
import os
import tempfile

class SecurityScanner:
    def __init__(self, project_path):
        self.project_path = project_path

    def scan_python(self):
        """Run bandit on Python files in the project."""
        try:
            result = subprocess.run(
                ['bandit', '-r', self.project_path, '-f', 'json'],
                capture_output=True, text=True, check=False
            )
            data = json.loads(result.stdout)
            issues = []
            for issue in data.get('results', []):
                issues.append({
                    'rule_id': issue['test_id'],
                    'description': issue['issue_text'],
                    'impact': 'critical' if issue['issue_severity'] == 'HIGH' else 'serious',
                    'file': issue['filename'],
                    'line': issue['line_number'],
                    'fixable': False,
                    'type': 'security'
                })
            return issues
        except Exception as e:
            return [{'error': str(e), 'type': 'security'}]

    def scan_javascript(self):
        """Run eslint with security plugin."""
        try:
            # Check if eslint is available
            result = subprocess.run(
                ['npx', 'eslint', self.project_path, '--format', 'json'],
                capture_output=True, text=True, check=False
            )
            data = json.loads(result.stdout)
            issues = []
            for file_result in data:
                for msg in file_result.get('messages', []):
                    if msg.get('ruleId', '').startswith('security/'):
                        issues.append({
                            'rule_id': msg['ruleId'],
                            'description': msg['message'],
                            'impact': 'critical' if msg.get('severity', 1) == 2 else 'serious',
                            'file': file_result['filePath'],
                            'line': msg['line'],
                            'fixable': msg.get('fix') is not None,
                            'type': 'security'
                        })
            return issues
        except Exception as e:
            return [{'error': str(e), 'type': 'security'}]

    def run_all(self):
        """Run all security scans and combine results."""
        issues = []
        issues.extend(self.scan_python())
        issues.extend(self.scan_javascript())
        return issues
