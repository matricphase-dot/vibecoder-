# backend/src/agents/debugger.py (updated)
import asyncio
import logging
from src.agents.browser_agent import BrowserAgent

logger = logging.getLogger(__name__)

class Debugger:
    async def debug(self, error: str, code: str) -> str:
        # Existing debug logic (placeholder)
        return code

    async def run_browser_check(self, preview_url: str) -> dict:
        async with BrowserAgent(headless=True) as browser:
            await browser.launch(preview_url, wait_ms=2000)
            errors = await browser.get_console_errors()
            screenshot_b64 = await browser.screenshot()
            broken = await browser.find_broken_elements()
            return {
                "errors": [{"message": e.message, "line": e.line_number} for e in errors],
                "screenshot": screenshot_b64,
                "broken_elements": [{"selector": b.selector, "type": b.type, "description": b.description} for b in broken]
            }
