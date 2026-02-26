class Deployer:
    async def deploy(self, project_id: str) -> str:
        # For now, just return a local file URL
        return f"http://localhost:8000/projects/{project_id}/index.html"
