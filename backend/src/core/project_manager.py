import os
import uuid

class ProjectManager:
    @staticmethod
    def create_project(files: dict) -> str:
        project_id = str(uuid.uuid4())[:8]
        project_path = f"workspace/{project_id}"
        os.makedirs(project_path, exist_ok=True)
        # Write files if any (optional)
        for filename, content in files.items():
            filepath = os.path.join(project_path, filename)
            with open(filepath, 'w') as f:
                f.write(content)
        return project_id

    @staticmethod
    async def deploy_static(project_id: str) -> str:
        # For MVP, return local URL
        return f"http://localhost:8000/projects/{project_id}/index.html"
