# backend/src/agents/browser_agent.py
import asyncio
import base64
import logging
from typing import List, Optional
from dataclasses import dataclass
from playwright.async_api import async_playwright, Browser, Page, ConsoleMessage
from PIL import Image
import io

logger = logging.getLogger(__name__)

@dataclass
class ConsoleError:
    type: str
    message: str
    source_url: str
    line_number: int

@dataclass
class BrokenElement:
    selector: str
    type: str
    description: str

class BrowserAgent:
    def __init__(self, headless: bool = True):
        self.headless = headless
        self.browser: Optional[Browser] = None
        self.page: Optional[Page] = None
        self._console_errors: List[ConsoleMessage] = []

    async def __aenter__(self):
        return self

    async def __aexit__(self, exc_type, exc_val, exc_tb):
        await self.close()

    async def launch(self, url: str, wait_ms: int = 3000) -> None:
        playwright = await async_playwright().start()
        self.browser = await playwright.chromium.launch(headless=self.headless)
        self.page = await self.browser.new_page()
        self.page.on("console", lambda msg: self._console_errors.append(msg) if msg.type == "error" else None)
        await self.page.goto(url, wait_until="networkidle")
        await asyncio.sleep(wait_ms / 1000)

    async def screenshot(self, full_page: bool = False) -> str:
        if not self.page:
            raise RuntimeError("Browser not launched. Call launch() first.")
        screenshot_bytes = await self.page.screenshot(full_page=full_page)
        return base64.b64encode(screenshot_bytes).decode('utf-8')

    async def get_console_errors(self) -> List[ConsoleError]:
        errors = []
        for msg in self._console_errors:
            location = msg.location
            errors.append(ConsoleError(
                type=msg.type,
                message=msg.text,
                source_url=location.get('url', ''),
                line_number=location.get('lineNumber', 0)
            ))
        return errors

    async def find_broken_elements(self) -> List[BrokenElement]:
        if not self.page:
            return []
        broken = []
        images = await self.page.query_selector_all('img')
        for img in images:
            natural_width = await img.get_attribute('naturalWidth')
            if natural_width == '0':
                src = await img.get_attribute('src')
                broken.append(BrokenElement(
                    selector=f"img[src='{src}']",
                    type="broken_image",
                    description=f"Image failed to load: {src}"
                ))
        error_elements = await self.page.query_selector_all('[class*="error"], .alert-danger, .error-message')
        for el in error_elements:
            text = await el.inner_text()
            if text:
                broken.append(BrokenElement(
                    selector=await el.evaluate('el => el.tagName + (el.id ? "#" + el.id : "")'),
                    type="error_text",
                    description=f"Error text: {text[:100]}"
                ))
        return broken

    async def visual_diff(self, screenshot_a_b64: str, screenshot_b_b64: str) -> float:
        img_a = Image.open(io.BytesIO(base64.b64decode(screenshot_a_b64)))
        img_b = Image.open(io.BytesIO(base64.b64decode(screenshot_b_b64)))
        if img_a.size != img_b.size:
            img_b = img_b.resize(img_a.size)
        diff_pixels = 0
        total_pixels = img_a.width * img_a.height
        for x in range(img_a.width):
            for y in range(img_a.height):
                if img_a.getpixel((x, y)) != img_b.getpixel((x, y)):
                    diff_pixels += 1
        return diff_pixels / total_pixels

    async def close(self) -> None:
        if self.browser:
            await self.browser.close()
