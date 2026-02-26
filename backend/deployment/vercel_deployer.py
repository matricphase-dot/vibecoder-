import os
import subprocess
import json
import asyncio

class VercelDeployer:
    def __init__(self, token):
        self.token = token

    async def deploy(self, project_path: str, project_name: str) -> str:
        env = os.environ.copy()
        env["VERCEL_TOKEN"] = self.token

        vercel_config = {
            "buildCommand": None,
            "outputDirectory": ".",
            "devCommand": None,
            "installCommand": None
        }
        config_path = os.path.join(project_path, "vercel.json")
        with open(config_path, "w") as f:
            json.dump(vercel_config, f)

        proc = await asyncio.create_subprocess_exec(
            "vercel", "--prod", "--token", self.token, "--yes",
            cwd=project_path,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
            env=env
        )
        stdout, stderr = await proc.communicate()

        if proc.returncode != 0:
            raise Exception(f"Vercel deploy failed: {stderr.decode()}")

        output = stdout.decode()
        import re
        match = re.search(r'https?://[^\s]+\.vercel\.app', output)
        if match:
            return match.group(0)
        else:
            return f"https://{project_name}.vercel.app"
