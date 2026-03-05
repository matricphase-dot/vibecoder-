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
        """Deploy to Google Cloud Run."""
        # Ensure gcloud is installed and authenticated
        try:
            subprocess.run(['gcloud', '--version'], check=True, capture_output=True)
        except Exception as e:
            raise Exception("gcloud not installed. Please install Google Cloud SDK.") from e

        # Build a container using Cloud Build (simplified: use gcloud builds submit)
        image = f"gcr.io/{self.project_id}/{self.project_name}"
        build_cmd = [
            'gcloud', 'builds', 'submit',
            '--tag', image,
            self.project_path
        ]
        subprocess.run(build_cmd, check=True)

        # Deploy to Cloud Run
        deploy_cmd = [
            'gcloud', 'run', 'deploy', self.project_name,
            '--image', image,
            '--platform', 'managed',
            '--region', self.region,
            '--allow-unauthenticated'
        ]
        result = subprocess.run(deploy_cmd, capture_output=True, text=True, check=True)

        # Extract URL from output
        for line in result.stdout.split('\n'):
            if 'url:' in line:
                return line.split('url:')[1].strip()
        return f"https://{self.project_name}-{self.region}.a.run.app"

    def get_logs(self):
        """Fetch Cloud Run logs."""
        logs_cmd = [
            'gcloud', 'logging', 'read',
            f'resource.type=cloud_run_revision AND resource.labels.service_name={self.project_name}',
            '--limit', '10',
            '--format', 'json'
        ]
        result = subprocess.run(logs_cmd, capture_output=True, text=True, check=True)
        logs = json.loads(result.stdout)
        return [log.get('textPayload', str(log)) for log in logs]
