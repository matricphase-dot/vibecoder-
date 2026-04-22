class Sandbox:
    def __init__(self):
        self.enabled = False
    def run_code(self, code, language="python"):
        return {"stdout": "", "stderr": "Sandbox disabled", "success": False}
