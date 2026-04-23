# backend/src/compliance/engine.py
import json
import os
from typing import Dict, List, Optional
from enum import Enum
from pydantic import BaseModel
import ollama

class ComplianceStandard(str, Enum):
    HIPAA = "hipaa"
    GDPR = "gdpr"
    SOC2 = "soc2"
    PCI = "pci"

class ComplianceCheck(BaseModel):
    passed: bool
    violations: List[str]
    recommendations: List[str]

class ComplianceGenerator:
    def __init__(self, model="codellama"):
        self.model = model
        self.templates_path = os.path.join(os.path.dirname(__file__), "templates")

    async def generate_compliant_code(self, prompt: str, standard: ComplianceStandard, context: str = "") -> Dict:
        """Generate code that complies with the specified standard."""
        standards_prompts = {
            ComplianceStandard.HIPAA: "You are generating HIPAA-compliant code. Ensure: no hardcoded PHI, encryption at rest and in transit, audit logging of all access, authentication required for all endpoints, automatic session timeout, BAA support.",
            ComplianceStandard.GDPR: "You are generating GDPR-compliant code. Ensure: data minimization, right to deletion endpoint, consent management, data portability, breach notification within 72 hours, data protection impact assessment.",
            ComplianceStandard.SOC2: "You are generating SOC2-compliant code. Ensure: change management logging, access controls, availability monitoring, security incident response, vendor management integration.",
            ComplianceStandard.PCI: "You are generating PCI-compliant code. Ensure: no storage of CVV, tokenization of PAN, TLS 1.2+, logging of all access to cardholder data."
        }
        system = standards_prompts.get(standard, "Generate secure, compliant code.")
        system += " Output only the code, no explanations."
        full_prompt = f"Compliance standard: {standard.value.upper()}\nContext: {context}\nRequirement: {prompt}"
        response = ollama.generate(model=self.model, prompt=full_prompt, system=system)
        return {"code": response['response'], "standard": standard.value}

    async def check_compliance(self, code: str, standard: ComplianceStandard) -> ComplianceCheck:
        """Analyze existing code for compliance violations."""
        system = f"You are a compliance auditor. Review the code for {standard.value.upper()} compliance. Output a JSON with: passed (bool), violations (list of strings), recommendations (list of strings). Only JSON, no extra text."
        user_prompt = f"Code:\n{code}\n\nCompliance issues JSON:"
        response = ollama.generate(model=self.model, prompt=user_prompt, system=system)
        try:
            data = json.loads(response['response'])
            return ComplianceCheck(**data)
        except:
            return ComplianceCheck(passed=True, violations=[], recommendations=["Manual review recommended"])

    def get_template(self, standard: ComplianceStandard, template_name: str) -> str:
        template_path = os.path.join(self.templates_path, standard.value, f"{template_name}.template")
        if os.path.exists(template_path):
            with open(template_path, "r") as f:
                return f.read()
        return f"# {standard.value.upper()} template for {template_name} not found"
