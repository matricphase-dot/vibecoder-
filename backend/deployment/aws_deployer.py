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
        self.region = os.getenv('AWS_REGION', 'us-east-1')
        self.lambda_client = boto3.client('lambda', region_name=self.region)
        self.s3_client = boto3.client('s3', region_name=self.region)
        self.bucket_name = os.getenv('AWS_S3_BUCKET', f'vibecoder-{project_name}-{os.urandom(4).hex()}')

    def _zip_project(self):
        zip_path = tempfile.mktemp(suffix='.zip')
        with zipfile.ZipFile(zip_path, 'w', zipfile.ZIP_DEFLATED) as zipf:
            for root, dirs, files in os.walk(self.project_path):
                for file in files:
                    zipf.write(os.path.join(root, file), arcname=file)
        return zip_path

    def deploy(self):
        """Deploy project as AWS Lambda function."""
        zip_file = self._zip_project()
        try:
            # Ensure S3 bucket exists
            try:
                self.s3_client.head_bucket(Bucket=self.bucket_name)
            except ClientError:
                self.s3_client.create_bucket(Bucket=self.bucket_name, CreateBucketConfiguration={'LocationConstraint': self.region})

            # Upload ZIP to S3
            s3_key = f'{self.project_name}/function.zip'
            self.s3_client.upload_file(zip_file, self.bucket_name, s3_key)

            # Create or update Lambda function
            with open(zip_file, 'rb') as f:
                zip_bytes = f.read()

            role_arn = os.getenv('AWS_LAMBDA_ROLE')
            if not role_arn:
                raise Exception("AWS_LAMBDA_ROLE environment variable not set")

            try:
                response = self.lambda_client.create_function(
                    FunctionName=self.project_name,
                    Runtime='python3.9',
                    Role=role_arn,
                    Handler='main.handler',  # assumes entry point in main.py
                    Code={'S3Bucket': self.bucket_name, 'S3Key': s3_key},
                    Timeout=30,
                    MemorySize=128
                )
                function_arn = response['FunctionArn']
            except ClientError as e:
                if 'ResourceConflictException' in str(e):
                    response = self.lambda_client.update_function_code(
                        FunctionName=self.project_name,
                        S3Bucket=self.bucket_name,
                        S3Key=s3_key
                    )
                    function_arn = response['FunctionArn']
                else:
                    raise e

            # Create function URL (if not exists)
            try:
                url_response = self.lambda_client.create_function_url_config(
                    FunctionName=self.project_name,
                    AuthType='NONE'
                )
                url = url_response['FunctionUrl']
            except ClientError:
                # URL may already exist
                url_response = self.lambda_client.get_function_url_config(FunctionName=self.project_name)
                url = url_response['FunctionUrl']

            return url
        finally:
            os.remove(zip_file)

    def get_logs(self):
        """Fetch CloudWatch logs for the function."""
        logs_client = boto3.client('logs', region_name=self.region)
        log_group = f'/aws/lambda/{self.project_name}'
        try:
            streams = logs_client.describe_log_streams(logGroupName=log_group, orderBy='LastEventTime', descending=True, limit=1)
            if not streams['logStreams']:
                return ["No log streams found"]
            stream_name = streams['logStreams'][0]['logStreamName']
            events = logs_client.get_log_events(logGroupName=log_group, logStreamName=stream_name)
            return [event['message'] for event in events['events']]
        except ClientError as e:
            return [f"Error fetching logs: {str(e)}"]
