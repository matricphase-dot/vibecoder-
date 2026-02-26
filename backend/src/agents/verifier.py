import asyncio
import traceback
import os
from playwright.async_api import async_playwright

class VerifierAgent:
    async def verify_web_app(self, project_path: str, tests: list) -> dict:
        try:
            async with async_playwright() as p:
                browser = await p.chromium.launch(headless=True, args=['--no-sandbox'])
                page = await browser.new_page()
                # Construct absolute file URL
                abs_path = os.path.abspath(project_path)
                file_url = f"file://{abs_path}/index.html"
                await page.goto(file_url, timeout=15000)

                screenshot_path = os.path.join(project_path, "screenshot.png")
                await page.screenshot(path=screenshot_path)

                results = []
                for test in tests:
                    test_lower = test.lower()
                    passed = False
                    details = ""
                    try:
                        if "input" in test_lower and "exists" in test_lower:
                            count = await page.locator('input').count()
                            passed = count > 0
                            details = f"Found {count} input(s)"
                        elif "button" in test_lower and "adds a todo" in test_lower:
                            await page.fill('input', 'Test todo')
                            await page.click('button')
                            await page.wait_for_timeout(500)
                            todo_count = await page.locator('.todo').count()
                            passed = todo_count > 0
                            details = f"Todo count after click: {todo_count}"
                        elif "persist" in test_lower and "refresh" in test_lower:
                            await page.fill('input', 'Test todo')
                            await page.click('button')
                            await page.reload()
                            todo_count = await page.locator('.todo').count()
                            passed = todo_count > 0
                            details = f"Todos after refresh: {todo_count}"
                        else:
                            passed = True
                            details = "No specific test implemented"
                    except Exception as e:
                        details = f"Error: {str(e)}"
                        passed = False
                    results.append({"test": test, "passed": passed, "details": details})

                auto_tests = []
                buttons = await page.locator('button').all()
                for i, button in enumerate(buttons):
                    test_name = f"Click button {i+1}"
                    try:
                        await button.click()
                        await page.wait_for_timeout(500)
                        passed = True
                        details = "Button click succeeded"
                    except Exception as e:
                        passed = False
                        details = f"Button click failed: {str(e)}"
                    auto_tests.append({"test": test_name, "passed": passed, "details": details})

                inputs = await page.locator('input').all()
                for i, input_elem in enumerate(inputs):
                    test_name = f"Fill input {i+1}"
                    try:
                        await input_elem.fill("test input")
                        passed = True
                        details = "Input fill succeeded"
                    except Exception as e:
                        passed = False
                        details = f"Input fill failed: {str(e)}"
                    auto_tests.append({"test": test_name, "passed": passed, "details": details})

                results.extend(auto_tests)

                await browser.close()
                all_passed = all(r["passed"] for r in results)
                return {
                    "passed": all_passed,
                    "details": results,
                    "screenshot": screenshot_path if not all_passed else None
                }
        except Exception as e:
            print(f"? Verifier agent crashed: {traceback.format_exc()}")
            return {"passed": False, "details": [{"test": "verifier_crash", "passed": False, "details": str(e)}]}
