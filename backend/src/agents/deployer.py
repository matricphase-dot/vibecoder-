class DeployerAgent:
    def deploy(self, project_path, project_name, cloud_provider="vercel"):
        """Deploy project to specified cloud provider."""
        if cloud_provider == "aws":
            from deployment.aws_deployer import AWSDeployer
            deployer = AWSDeployer(project_path, project_name)
        elif cloud_provider == "gcp":
            from deployment.gcp_deployer import GCPDeployer
            deployer = GCPDeployer(project_path, project_name)
        else:
            from deployment.vercel_deployer import VercelDeployer
            deployer = VercelDeployer(project_path, project_name)
        return deployer.deploy()


