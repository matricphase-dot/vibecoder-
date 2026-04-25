# backend/src/rl/sandbox_runner.py
import asyncio
import subprocess
import tempfile
from pathlib import Path
from typing import Dict, List
import json
import docker
import logging

logger = logging.getLogger(__name__)

class SandboxRunner:
    def __init__(self, use_docker=True):
        self.use_docker = use_docker and self._docker_available()
        if self.use_docker:
            self.docker_client = docker.from_env()
        else:
            logger.warning("Docker not available, falling back to local subprocess (less secure).")

    def _docker_available(self):
        try:
            docker.from_env().ping()
            return True
        except:
            return False

    async def run_tests(self, code_files: Dict[str, str], test_files: Dict[str, str]) -> dict:
        """Run tests in isolated environment."""
        if self.use_docker:
            return await self._run_docker(code_files, test_files)
        else:
            return await self._run_local(code_files, test_files)

    async def _run_docker(self, code_files, test_files):
        # Create a temporary directory with all files
        with tempfile.TemporaryDirectory() as tmpdir:
            tmp_path = Path(tmpdir)
            for path, content in code_files.items():
                (tmp_path / path).parent.mkdir(parents=True, exist_ok=True)
                (tmp_path / path).write_text(content, encoding="utf-8")
            for path, content in test_files.items():
                (tmp_path / path).parent.mkdir(parents=True, exist_ok=True)
                (tmp_path / path).write_text(content, encoding="utf-8")
            # Run docker container
            container = self.docker_client.containers.run(
                image="python:3.10-slim",
                command="bash -c 'pip install pytest coverage && cd /code && pytest --json-report --cov=. tests/'",
                volumes={tmpdir: {"bind": "/code", "mode": "rw"}},
                working_dir="/code",
                detach=True,
                remove=True
            )
            # Wait for completion
            result = container.wait()
            logs = container.logs(stdout=True, stderr=True).decode()
            # Parse pytest output (simplified)
            passed = logs.count("PASSED")
            failed = logs.count("FAILED")
            return {
                "passed": passed,
                "failed": failed,
                "errors": [],
                "coverage": 0.0,
                "logs": logs
            }
    async def _run_local(self, code_files, test_files):
        # WARNING: less secure, only for development
        with tempfile.TemporaryDirectory() as tmpdir:
            tmp_path = Path(tmpdir)
            for path, content in code_files.items():
                (tmp_path / path).parent.mkdir(parents=True, exist_ok=True)
                (tmp_path / path).write_text(content, encoding="utf-8")
            for path, content in test_files.items():
                (tmp_path / path).parent.mkdir(parents=True, exist_ok=True)
                (tmp_path / path).write_text(content, encoding="utf-8")
            proc = await asyncio.create_subprocess_exec(
                "pytest", "--json-report", "--cov=.", "tests/",
                cwd=tmp_path,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE
            )
            stdout, stderr = await proc.communicate()
            logs = stdout.decode() + stderr.decode()
            passed = logs.count("PASSED")
            failed = logs.count("FAILED")
            return {
                "passed": passed,
                "failed": failed,
                "errors": [],
                "coverage": 0.0,
                "logs": logs
            }
