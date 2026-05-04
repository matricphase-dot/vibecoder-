import os
import asyncio
import mimetypes
import base64
import logging
import time
import shutil
import fnmatch
import platform
from pathlib import Path
from dataclasses import dataclass, field
from typing import AsyncGenerator, List, Dict, Optional

logger = logging.getLogger('file_manager')

@dataclass
class FileNode:
    path: str
    name: str
    type: str
    size: int
    extension: str
    last_modified: str
    children: list = field(default_factory=list)
    is_readable: bool = True

@dataclass
class CommandResult:
    command: str
    stdout: str
    stderr: str
    return_code: int
    success: bool
    duration_ms: float

class FileManager:
    SKIP_DIRS = {'node_modules', '.git', '__pycache__', 'venv', '.venv',
                 'dist', 'build', '.next', 'target', 'vendor', '.idea', '.vscode'}
    BLOCKED_PATHS = [
        '/etc/shadow', '/etc/passwd', '/etc/sudoers',
        'C:\\Windows\\System32\\config', 'C:\\Windows\\System32\\drivers\\etc'
    ]
    MAX_FILE_MB = 10

    def __init__(self, allowed_roots: Optional[List[str]] = None):
        self.allowed_roots = allowed_roots

    def _check(self, path: str) -> bool:
        abs_path = str(Path(path).resolve())
        for blocked in self.BLOCKED_PATHS:
            if abs_path.startswith(blocked):
                raise PermissionError(f'Access to {path} is blocked for safety')
        if self.allowed_roots:
            if not any(abs_path.startswith(root) for root in self.allowed_roots):
                raise PermissionError(f'Path {path} is outside allowed roots')
        return True

    def browse(self, path: str, max_depth: int = 3, _depth: int = 0) -> FileNode:
        self._check(path)
        p = Path(path)
        if not p.exists():
            raise FileNotFoundError(f'Path does not exist: {path}')
        stat = p.stat()
        node = FileNode(
            path=str(p), name=p.name,
            type='directory' if p.is_dir() else 'file',
            size=stat.st_size,
            extension=p.suffix.lower() if p.is_file() else '',
            last_modified=str(stat.st_mtime),
        )
        if p.is_dir() and _depth < max_depth:
            try:
                entries = sorted(p.iterdir(),
                    key=lambda x: (x.is_file(), x.name.lower()))
                for entry in entries:
                    if entry.name.startswith('.') and entry.name not in ('.env.example',):
                        continue
                    if entry.name in self.SKIP_DIRS:
                        continue
                    try:
                        node.children.append(self.browse(str(entry), max_depth, _depth+1))
                    except (PermissionError, OSError):
                        pass
            except PermissionError:
                node.is_readable = False
        return node

    def read(self, path: str) -> dict:
        self._check(path)
        p = Path(path)
        size_mb = p.stat().st_size / 1024 / 1024
        if size_mb > self.MAX_FILE_MB:
            raise ValueError(f'File too large: {size_mb:.1f}MB (max {self.MAX_FILE_MB}MB)')
        mime, _ = mimetypes.guess_type(path)
        try:
            content = p.read_text(encoding='utf-8')
            encoding = 'utf-8'
        except UnicodeDecodeError:
            try:
                content = p.read_text(encoding='latin-1')
                encoding = 'latin-1'
            except Exception:
                content = base64.b64encode(p.read_bytes()).decode()
                encoding = 'base64'
        return {'content': content, 'encoding': encoding,
                'size_bytes': p.stat().st_size,
                'mime_type': mime or 'text/plain'}

    def write(self, path: str, content: str, create_dirs: bool = True) -> dict:
        self._check(path)
        p = Path(path)
        if create_dirs:
            p.parent.mkdir(parents=True, exist_ok=True)
        p.write_text(content, encoding='utf-8')
        return {'success': True, 'bytes_written': len(content.encode()), 'path': str(p)}

    def delete(self, path: str) -> dict:
        self._check(path)
        p = Path(path)
        if p.is_file():
            p.unlink()
        elif p.is_dir():
            shutil.rmtree(p)
        return {'success': True, 'path': str(p)}

    def move(self, src: str, dst: str) -> dict:
        self._check(src); self._check(dst)
        shutil.move(src, dst)
        return {'success': True, 'src': src, 'dst': dst}

    def search(self, root: str, pattern: str,
               content_search: str = None) -> list[dict]:
        self._check(root)
        results = []
        for p in Path(root).rglob('*'):
            if any(part in self.SKIP_DIRS for part in p.parts):
                continue
            if not fnmatch.fnmatch(p.name, pattern):
                continue
            if not p.is_file():
                continue
            entry = {'path': str(p), 'name': p.name,
                     'size': p.stat().st_size,
                     'last_modified': str(p.stat().st_mtime),
                     'match_lines': []}
            if content_search:
                try:
                    lines = p.read_text(encoding='utf-8', errors='ignore').splitlines()
                    entry['match_lines'] = [f'{i+1}: {l}' for i, l in enumerate(lines)
                                            if content_search.lower() in l.lower()]
                    if not entry['match_lines']:
                        continue
                except Exception:
                    continue
            results.append(entry)
            if len(results) >= 100:
                break
        return results

    async def run(self, command: str, cwd: str = None,
                  timeout: float = 30.0) -> CommandResult:
        start = time.perf_counter()
        try:
            proc = await asyncio.create_subprocess_shell(
                command,
                cwd=cwd or os.getcwd(),
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE,
            )
            try:
                stdout, stderr = await asyncio.wait_for(
                    proc.communicate(), timeout=timeout
                )
            except asyncio.TimeoutError:
                proc.kill()
                await proc.communicate()
                return CommandResult(command=command, stdout='',
                    stderr=f'Command timed out after {timeout}s',
                    return_code=-1, success=False,
                    duration_ms=(time.perf_counter()-start)*1000)
            return CommandResult(
                command=command,
                stdout=stdout.decode('utf-8','replace'),
                stderr=stderr.decode('utf-8','replace'),
                return_code=proc.returncode,
                success=proc.returncode==0,
                duration_ms=(time.perf_counter()-start)*1000
            )
        except Exception as e:
            return CommandResult(command=command, stdout='', stderr=str(e),
                return_code=-1, success=False,
                duration_ms=(time.perf_counter()-start)*1000)

    async def run_stream(
        self, command: str, cwd: str = None
    ) -> AsyncGenerator[dict, None]:
        proc = await asyncio.create_subprocess_shell(
            command,
            cwd=cwd or os.getcwd(),
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
        )
        async def read_stream(stream, stype):
            async for line in stream:
                yield {'type': stype, 'text': line.decode('utf-8','replace').rstrip()}
        async for evt in read_stream(proc.stdout, 'stdout'):
            yield evt
        async for evt in read_stream(proc.stderr, 'stderr'):
            yield evt
        await proc.wait()
        yield {'type': 'done', 'return_code': proc.returncode,
               'success': proc.returncode == 0}

    def get_drives(self) -> list[dict]:
        drives = []
        if platform.system() == 'Windows':
            import string
            for letter in string.ascii_uppercase:
                p = Path(f'{letter}:\\')
                if p.exists():
                    drives.append({'path': str(p), 'label': f'{letter}: drive'})
        else:
            home = str(Path.home())
            drives = [
                {'path': '/', 'label': 'Root /'},
                {'path': home, 'label': f'Home ({home})'},
            ]
            for mount in ['/mnt', '/media', '/Volumes']:
                if Path(mount).exists():
                    for sub in Path(mount).iterdir():
                        drives.append({'path': str(sub), 'label': sub.name})
        return drives
