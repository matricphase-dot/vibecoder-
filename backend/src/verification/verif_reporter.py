# backend/src/verification/verif_reporter.py
from typing import List, Dict

def format_report(verification_results: List[Dict]) -> str:
    lines = []
    lines.append("=== Z3 Formal Verification Report ===")
    for res in verification_results:
        status = "✅ VERIFIED" if res["verified"] else "❌ FAILED"
        lines.append(f"{res.get('function', 'unknown')}: {status}")
        if not res["verified"] and res.get("counterexample"):
            lines.append(f"  Counterexample: {res['counterexample']}")
    lines.append("===============================")
    return "\n".join(lines)
