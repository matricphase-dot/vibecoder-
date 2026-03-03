import os

class AzureDeployer:
    def __init__(self, project_path, project_name):
        self.project_path = project_path
        self.project_name = project_name

    def deploy(self):
        """Stub for Azure deployment."""
        print(f"[AZURE] Deploying {self.project_name}")
        return f"https://{self.project_name}.azurewebsites.net"

    def get_logs(self):
        return ["Azure logs stub"]
