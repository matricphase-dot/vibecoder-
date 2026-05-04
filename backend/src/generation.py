import asyncio, httpx, json, os, re, logging
from pathlib import Path
from typing import AsyncGenerator, Dict, Any

logger = logging.getLogger('generation')
WORKSPACE = Path(os.getenv('WORKSPACE_DIR', 'workspace'))
GEMINI_KEY = os.getenv('GEMINI_API_KEY', '')
GROQ_KEY = os.getenv('GROQ_API_KEY', '')

LANGUAGE_KEYWORDS = {
    'python': ['python','fastapi','django','flask','pandas','pytorch','scikit','pytest','.py'],
    'typescript': ['typescript','next.js','nextjs','angular','tsx','.ts','.tsx'],
    'javascript': ['javascript','react','vue','svelte','node','express','.js','.jsx'],
    'rust': ['rust','cargo','wasm','webassembly','.rs'],
    'go': ['golang',' go ','gin','fiber','goroutine','.go'],
    'java': ['java','spring','springboot','maven','gradle','.java'],
    'kotlin': ['kotlin','android','jetpack','.kt'],
    'swift': ['swift','ios','swiftui','.swift'],
    'dart': ['dart','flutter','.dart'],
    'cpp': ['c++','cpp','cmake','.cpp','.hpp'],
    'sql': ['sql','postgresql','mysql','sqlite','schema','migration'],
    'devops': ['docker','kubernetes','k8s','github actions','ci/cd','terraform','dockerfile'],
}

def detect_language(prompt: str) -> str:
    pl = prompt.lower()
    scores = {lang: sum(1 for kw in kws if kw in pl)
              for lang, kws in LANGUAGE_KEYWORDS.items()}
    best = max(scores, key=scores.get)
    return best if scores[best] > 0 else 'javascript'

LANGUAGE_SYSTEM_PROMPTS = {
    'python': '''You are a Python expert. Generate production-grade Python code.
Always include:
- Type hints everywhere (Python 3.10+ syntax)
- Pydantic v2 models for data validation
- FastAPI with async routes, proper HTTP status codes
- SQLAlchemy 2.0 async for database
- pytest tests with fixtures (test 3 happy paths + 2 edge cases)
- requirements.txt with pinned versions
- pyproject.toml for packaging
- Proper logging with Python logging module
- Error handling: never use bare except, always catch specific exceptions''',
    'typescript': '''You are a TypeScript expert. Generate production-grade TypeScript/React code.
Always include:
- strict: true TypeScript (zero 'any' types)
- React 18+ with hooks only (no class components)
- Proper interfaces and type exports
- Tailwind CSS for styling
- Error boundaries and loading states
- package.json with all deps, tsconfig.json, .eslintrc.json
- Vitest or Jest tests for key components
- Environment variables via import.meta.env (Vite) or process.env (Next.js)''',
    'rust': '''You are a Rust expert. Generate production-grade Rust code.
Always include:
- Rust 2021 edition (edition = '2021' in Cargo.toml)
- Result<T, Error> everywhere — zero unwrap() in non-test code
- Custom error types with thiserror crate
- tokio async runtime for async code
- Proper documentation comments (///) on all public items
- cargo test compatible tests in a tests/ module
- Cargo.toml with all needed crates pinned''',
    'go': '''You are a Go expert. Generate idiomatic production Go code.
Always include:
- Go 1.21+ features
- Every error is checked and returned (no _ = err)
- Structured logging with slog
- Table-driven tests with t.Run()
- go.mod and go.sum
- Makefile with: make build, make test, make run, make docker
- Dockerfile with multi-stage build (golang:1.21 builder + distroless runtime)''',
    'devops': '''You are a DevOps/SRE expert. Generate production infrastructure code.
Always include:
- Multi-stage Dockerfile: separate build and runtime stages, minimal final image
- .dockerignore to exclude build artifacts
- docker-compose.yml: all services, health checks, named volumes, env via .env
- .github/workflows/ci.yml: lint → test → build → docker push
- .github/workflows/deploy.yml: deploy on main push
- Kubernetes YAML if requested: deployment + service + ingress + hpa
- .env.example with ALL required variables (never real secrets)
- README.md with exact commands for local dev and production''',
}

BASE_SYSTEM_PROMPT = '''You are VibeCoder, an expert software engineer.
Generate COMPLETE, PRODUCTION-READY code. Real apps. Not demos.

MANDATORY OUTPUT FORMAT — use this EXACTLY for every file:

=== FILE: path/to/filename.ext ===
[complete file content — every single line, no truncation]
=== END FILE ===

CRITICAL RULES:
1. Generate ALL files needed to run the app (src, tests, config, Dockerfile, README)
2. Every file 100% complete — never write '# ... rest of code' or '// TODO'
3. Include a README.md with exact setup and run commands
4. Make it run on first attempt — no broken imports, no missing deps
5. For web apps: always generate BOTH frontend AND backend
6. For APIs: include example curl commands in README
'''

def build_system_prompt(language: str) -> str:
    lang_specific = LANGUAGE_SYSTEM_PROMPTS.get(language, '')
    return BASE_SYSTEM_PROMPT + ('\n\n' + lang_specific if lang_specific else '')

def parse_files(raw: str) -> Dict[str, str]:
    files = {}
    for m in re.finditer(r'=== FILE: (.+?) ===\n(.*?)=== END FILE ===', raw, re.DOTALL):
        fn = m.group(1).strip()
        content = m.group(2).strip()
        if fn and content:
            files[fn] = content
    if not files:
        for m in re.finditer(r'```(?:.*?)\n(.*?)```', raw, re.DOTALL):
            if not files:
                files['main.py'] = m.group(1).strip()
    if not files and raw.strip():
        files['output.txt'] = raw.strip()
    return files

async def stream_gemini(messages: list[dict]) -> AsyncGenerator[str, None]:
    url = (f'https://generativelanguage.googleapis.com/v1beta/models/'
           f'gemini-2.0-flash:streamGenerateContent?key={GEMINI_KEY}&alt=sse')
    contents = [{'role':'user' if m['role']=='user' else 'model',
                 'parts':[{'text':m['content']}]} for m in messages]
    body = {'contents': contents,
            'generationConfig': {'temperature': 0.1, 'maxOutputTokens': 16384}}
    async with httpx.AsyncClient(timeout=300) as client:
        async with client.stream('POST', url, json=body) as resp:
            resp.raise_for_status()
            async for line in resp.aiter_lines():
                if line.startswith('data: '):
                    try:
                        d = json.loads(line[6:])
                        text = (d.get('candidates',[{}])[0]
                                 .get('content',{}).get('parts',[{}])[0].get('text',''))
                        if text: yield text
                    except: pass

async def stream_groq(messages: list[dict]) -> AsyncGenerator[str, None]:
    headers = {'Authorization': f'Bearer {GROQ_KEY}',
               'Content-Type': 'application/json'}
    body = {'model': 'llama-3.3-70b-versatile', 'messages': messages,
            'stream': True, 'temperature': 0.1, 'max_tokens': 16384}
    async with httpx.AsyncClient(timeout=300) as client:
        async with client.stream('POST',
            'https://api.groq.com/openai/v1/chat/completions',
            headers=headers, json=body) as resp:
            resp.raise_for_status()
            async for line in resp.aiter_lines():
                if line.startswith('data: '):
                    try:
                        d = json.loads(line[6:])
                        text = d['choices'][0]['delta'].get('content','')
                        if text: yield text
                    except: pass

class GenerationOrchestrator:
    async def generate(
        self,
        prompt: str,
        plan_type: str = 'standard',
        template: str = 'auto',
        output_dir: str = None,
        extra_context: str = None
    ) -> AsyncGenerator[Dict[str, Any], None]:
        WORKSPACE.mkdir(exist_ok=True)
        out_dir = Path(output_dir) if output_dir else WORKSPACE
        language = detect_language(prompt)
        logger.info(f'Generating [{language}]: {prompt[:80]}')
        for agent, msg in [('architect',f'Analyzing ({language})...'),
                            ('planner','Planning files...'),
                            ('coder',f'Writing {language} code...')]:
            yield {'type':'agent','agent':agent,'message':msg}
            await asyncio.sleep(0.05)
        system = build_system_prompt(language)
        user_content = prompt
        if extra_context:
            user_content = f'EXISTING CODEBASE CONTEXT:\n{extra_context}\n\nTASK: {prompt}'
        messages = [{'role':'user','content':f'{system}\n\n{user_content}'}]
        full_text = ''
        api_used = 'none'
        if not GEMINI_KEY and not GROQ_KEY:
            yield {'type':'error','message':'No API key. Add GEMINI_API_KEY or GROQ_API_KEY to .env'}
            return
        try:
            if GEMINI_KEY:
                api_used = 'Gemini 2.0 Flash'
                yield {'type':'log','message':f'Using {api_used}...'}
                async for chunk in stream_gemini(messages):
                    full_text += chunk
                    yield {'type':'chunk','text':chunk}
            else:
                api_used = 'Groq Llama 3.3 70B'
                yield {'type':'log','message':f'Using {api_used}...'}
                async for chunk in stream_groq(messages):
                    full_text += chunk
                    yield {'type':'chunk','text':chunk}
        except Exception as e:
            if GROQ_KEY and not full_text and GEMINI_KEY:
                yield {'type':'log','message':'Gemini failed, switching to Groq...'}
                async for chunk in stream_groq(messages):
                    full_text += chunk
                    yield {'type':'chunk','text':chunk}
            else:
                yield {'type':'error','message':str(e)}
                return
        yield {'type':'agent','agent':'reviewer','message':'Parsing files...'}
        files = parse_files(full_text)
        if not files:
            yield {'type':'error','message':'No files parsed. Try a more specific prompt.'}
            return
        written = []
        for filename, content in files.items():
            fp = out_dir / filename
            fp.parent.mkdir(parents=True, exist_ok=True)
            fp.write_text(content, encoding='utf-8')
            written.append(filename)
            yield {'type':'file','path':filename,'content':content}
        yield {'type':'agent','agent':'debugger','message':'Done!'}
        yield {'type':'complete','files':written,'language':language,'count':len(written)}

async def run_agent_step(
    agent_name: str, prompt: str,
    provider: str = 'gemini', model: str = 'gemini-2.0-flash'
) -> AsyncGenerator[str, None]:
    SYSTEMS = {
        'architect': 'You are a senior software architect. Create a detailed technical plan.',
        'planner': 'You are a technical planner. List every file needed with its purpose.',
        'coder': 'You are an expert coder. Write complete code using === FILE: === format.',
        'reviewer': 'You are a code reviewer. Find all bugs, security issues, style problems.',
        'debugger': 'You are a debugger. Fix all issues. Output corrected files.',
        'merge': 'You are a merge specialist. Validate all imports and exports are consistent.',
    }
    sys = SYSTEMS.get(agent_name, 'You are an expert software engineer.')
    messages = [{'role':'user','content':f'{sys}\n\n{prompt}'}]
    streamer = stream_gemini(messages) if GEMINI_KEY else stream_groq(messages)
    async for chunk in streamer:
        yield chunk
