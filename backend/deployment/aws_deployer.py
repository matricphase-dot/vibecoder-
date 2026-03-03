import boto3
import os
import zipfile
import tempfile
import shutil
from botocore.exceptions import ClientError

class AWSDeployer:
    def __init__(self, project_path, project_name):
        self.project_path = project_path
        self.project_name = project_name
        self.lambda_client = boto3.client('lambda', region_name=os.getenv('AWS_REGION', 'us-east-1'))
        self.s3_client = boto3.client('s3', region_name=os.getenv('AWS_REGION', 'us-east-1'))
        self.bucket_name = os.getenv('AWS_S3_BUCKET', f'vibecoder-{project_name}')

    def _zip_project(self):
        """Zip the project folder."""
        zip_path = tempfile.mktemp(suffix='.zip')
        with zipfile.ZipFile(zip_path, 'w', zipfile.ZIP_DEFLATED) as zipf:
            for root, dirs, files in os.walk(self.project_path):
                for file in files:
                    zipf.write(os.path.join(root, file), arcname=file)
        return zip_path

    def deploy(self):
        """Deploy as AWS Lambda (simplified)."""
        zip_file = self._zip_project()
        try:
            # Upload to S3 (optional)
            self.s3_client.create_bucket(Bucket=self.bucket_name)
            self.s3_client.upload_file(zip_file, self.bucket_name, 'function.zip')
            
            # Create or update Lambda function
            with open(zip_file, 'rb') as f:
                zip_bytes = f.read()
            try:
                response = self.lambda_client.create_function(
                    FunctionName=self.project_name,
                    Runtime='python3.9',
                    Role=os.getenv('AWS_LAMBDA_ROLE'),
                    Handler='main.handler',
                    Code={'ZipFile': zip_bytes},
                    Timeout=30,
                    MemorySize=128
                )
            except ClientError as e:
                if 'ResourceConflictException' in str(e):
                    response = self.lambda_client.update_function_code(
                        FunctionName=self.project_name,
                        ZipFile=zip_bytes
                    )
                else:
                    raise e
            # Return function URL or API Gateway endpoint
            return f"https://{response['FunctionArn']}.lambda-url.us-east-1.on.aws/"
        finally:
            os.remove(zip_file)

    def get_logs(self):
        """Fetch CloudWatch logs (stub)."""
        return ["AWS logs not implemented yet"]
