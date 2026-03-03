import os
import subprocess
import tempfile
import shutil
import json

class GCPDeployer:
    def __init__(self, project_path, project_name):
        self.project_path = project_path
        self.project_name = project_name
        self.project_id = os.getenv('GCP_PROJECT_ID')
        self.region = os.getenv('GCP_REGION', 'us-central1')

    def deploy(self):
        """Deploy to Google Cloud Run using gcloud."""
        # Build a container using Cloud Build
        cmd = [
            'gcloud', 'builds', 'submit',
            '--tag', f'gcr.io/{self.project_id}/{self.project_name}',
            self.project_path
        ]
        subprocess.run(cmd, check=True)
        
        # Deploy to Cloud Run
        deploy_cmd = [
            'gcloud', 'run', 'deploy', self.project_name,
            '--image', f'gcr.io/{self.project_id}/{self.project_name}',
            '--platform', 'managed',
            '--region', self.region,
            '--allow-unauthenticated'
        ]
        result = subprocess.run(deploy_cmd, capture_output=True, text=True)
        # Extract URL from output
        for line in result.stdout.split('\n'):
            if 'url:' in line:
                return line.split('url:')[1].strip()
        return f"https://{self.project_name}-hash-{self.region}.a.run.app"

    def get_logs(self):
        """Fetch Cloud Run logs."""
        return ["gcloud logs read not implemented"]
