import json, uuid, asyncio, subprocess, logging
from pathlib import Path
from dataclasses import dataclass, field, asdict
from datetime import datetime
from typing import AsyncGenerator

logger = logging.getLogger('workspace')

@dataclass
class WorkspaceProject:
    id: str
    name: str
    path: str
    language: str
    last_opened: str
    file_count: int
    git_branch: str | None
    run_commands: list[str]
    has_tests: bool

REGISTRY_PATH = Path.home() / '.vibecoder' / 'workspaces.json'

class WorkspaceManager:
    def __init__(self):
        self._projects: dict[str, WorkspaceProject] = {}
        self._load()

    def _load(self) -> None:
        REGISTRY_PATH.parent.mkdir(parents=True, exist_ok=True)
        if REGISTRY_PATH.exists():
            try:
                data = json.loads(REGISTRY_PATH.read_text())
                self._projects = {k: WorkspaceProject(**v) for k, v in data.items()}
            except Exception as e:
                logger.warning(f'Could not load workspace registry: {e}')

    def _save(self) -> None:
        data = {k: asdict(v) for k, v in self._projects.items()}
        REGISTRY_PATH.write_text(json.dumps(data, indent=2))

    def _detect_language(self, root: Path) -> str:
        checks = [
            (['package.json'], 'javascript'),
            (['tsconfig.json', 'tsconfig.base.json'], 'typescript'),
            (['Cargo.toml'], 'rust'),
            (['go.mod'], 'go'),
            (['pom.xml', 'build.gradle'], 'java'),
            (['pubspec.yaml'], 'dart'),
            (['requirements.txt', 'pyproject.toml', 'setup.py'], 'python'),
            (['Dockerfile', 'docker-compose.yml', '.github'], 'devops'),
        ]
        for files, lang in checks:
            if any((root / f).exists() for f in files):
                return lang
        for ext, lang in [('.py','python'),('.ts','typescript'),('.js','javascript'),
                          ('.rs','rust'),('.go','go'),('.java','java'),('.swift','swift')]:
            if list(root.rglob(f'*{ext}')):
                return lang
        return 'unknown'

    def _detect_run_commands(self, root: Path, language: str) -> list[str]:
        commands = []
        if (root / 'package.json').exists():
            try:
                pkg = json.loads((root / 'package.json').read_text())
                scripts = pkg.get('scripts', {})
                for key in ['dev', 'start', 'build', 'test']:
                    if key in scripts:
                        commands.append(f'npm run {key}')
            except: pass
        if (root / 'Cargo.toml').exists():
            commands.extend(['cargo run', 'cargo test', 'cargo build --release'])
        if (root / 'go.mod').exists():
            commands.extend(['go run ./...', 'go test ./...', 'go build ./...'])
        if (root / 'requirements.txt').exists():
            commands.extend(['python -m pytest', 'python main.py'])
        if (root / 'Makefile').exists():
            commands.append('make')
        return commands[:6]

    def _get_git_branch(self, path: str) -> str | None:
        try:
            result = subprocess.run(
                ['git', 'rev-parse', '--abbrev-ref', 'HEAD'],
                cwd=path, capture_output=True, text=True, timeout=5
            )
            if result.returncode == 0:
                return result.stdout.strip()
        except Exception:
            pass
        return None

    def _count_files(self, root: Path) -> int:
        skip = {'node_modules', '.git', '__pycache__', 'venv', '.venv',
                'dist', 'build', 'target', '.next'}
        count = 0
        for p in root.rglob('*'):
            if p.is_file() and not any(s in p.parts for s in skip):
                count += 1
                if count >= 5000: break
        return count

    def open_project(self, path: str) -> WorkspaceProject:
        root = Path(path).resolve()
        if not root.exists() or not root.is_dir():
            raise ValueError(f'Directory not found: {path}')
        language = self._detect_language(root)
        commands = self._detect_run_commands(root, language)
        branch = self._get_git_branch(str(root))
        count = self._count_files(root)
        has_tests = any(root.rglob('test_*.py')) or any(root.rglob('*.test.*')) or any(root.rglob('*.spec.*'))
        proj = WorkspaceProject(
            id=str(uuid.uuid4()),
            name=root.name,
            path=str(root),
            language=language,
            last_opened=datetime.utcnow().isoformat(),
            file_count=count,
            git_branch=branch,
            run_commands=commands,
            has_tests=has_tests,
        )
        self._projects[proj.id] = proj
        self._save()
        return proj

    def list_projects(self) -> list[WorkspaceProject]:
        return sorted(self._projects.values(), key=lambda p: p.last_opened, reverse=True)

    def remove_project(self, project_id: str) -> None:
        self._projects.pop(project_id, None)
        self._save()
