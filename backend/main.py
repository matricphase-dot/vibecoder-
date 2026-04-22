@app.post("/api/generate-docs")
async def generate_docs(request: dict):
    files = request.get("files", {})
    if not files:
        return {"error": "No files provided"}
    
    # Build project summary
    project_summary = ""
    for path, content in files.items():
        project_summary += "## " + path + "\n```\n" + content[:300] + "\n```\n\n"
    
    # README prompt
    prompt_readme = "You are a technical writer. Create a README.md for this project.\n\nProject files summary:\n" + project_summary + "\nReturn ONLY the markdown content, starting with '# Project Title'. Include: Description, Features, Installation, Usage, File structure, Technologies used."
    try:
        import ollama
        import re
        response = ollama.chat(model="mistral", messages=[{"role": "user", "content": prompt_readme}])
        readme = response['message']['content'].strip()
        readme = re.sub(r'```markdown\n?', '', readme)
        readme = re.sub(r'```\n?', '', readme)
    except Exception as e:
        readme = "# Project\n\nError generating README: " + str(e)
    
    # Diagram prompt
    prompt_diagram = "Generate a Mermaid.js architecture diagram for this project.\n\nProject files:\n" + project_summary + "\nReturn ONLY the mermaid code, starting with '```mermaid' and ending with '```'."
    try:
        response = ollama.chat(model="mistral", messages=[{"role": "user", "content": prompt_diagram}])
        diagram = response['message']['content'].strip()
        if not diagram.startswith('```mermaid'):
            diagram = "```mermaid\n" + diagram + "\n```"
    except Exception as e:
        diagram = "```mermaid\ngraph TD\n    A[Error] --> B[" + str(e) + "]\n```"
    
    return {"docs": readme, "diagram": diagram}
import asyncio
import ollama
import json

class DebateAgent:
    def __init__(self, name, role, system_prompt):
        self.name = name
        self.role = role
        self.system_prompt = system_prompt

    async def generate(self, task, context):
        prompt = f"{self.system_prompt}\n\nTask: {task}\n\nContext: {context}\n\nPropose a solution."
        response = ollama.chat(model="mistral", messages=[{"role": "user", "content": prompt}])
        return response['message']['content']

async def judge(proposals, task):
    combined = "\n\n".join([f"Agent {name}:\n{text}" for name, text in proposals])
    judge_prompt = f"""You are a judge. Evaluate the following proposals for the task: {task}.

Proposals:
{combined}

Select the best parts from each and combine them into a final answer. Return ONLY the final code/markdown."""
    response = ollama.chat(model="mistral", messages=[{"role": "user", "content": judge_prompt}])
    return response['message']['content']

@app.post("/api/debate")
async def debate_endpoint(request: dict):
    task = request.get("task", "")
    context = request.get("context", "")
    agents = [
        DebateAgent("Architect", "design", "You focus on architecture, scalability, and patterns."),
        DebateAgent("Coder", "implementation", "You write clean, efficient, working code."),
        DebateAgent("Tester", "quality", "You ensure correctness, edge cases, and testability."),
        DebateAgent("Security", "safety", "You look for vulnerabilities and security best practices.")
    ]
    proposals = []
    for agent in agents:
        proposal = await agent.generate(task, context)
        proposals.append((agent.name, proposal))
    final = await judge(proposals, task)
    return {"final": final, "proposals": proposals}
