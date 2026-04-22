class Reviewer:
    async def review(self, files):
        issues = []
        for f in files:
            if "console.log" in f['content'] and f['path'].endswith(".js"):
                issues.append(f"{f['path']} contains console.log")
        return {"has_issues": len(issues) > 0, "issues": issues}
