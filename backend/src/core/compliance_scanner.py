import os
from playwright.async_api import async_playwright
from bs4 import BeautifulSoup
from typing import List
from src.schemas import ComplianceIssue

class ComplianceScanner:
    def __init__(self, project_path: str):
        self.project_path = project_path
        self.html_files = self._find_html_files()
    
    def _find_html_files(self):
        html_files = []
        for root, dirs, files in os.walk(self.project_path):
            for file in files:
                if file.endswith('.html'):
                    html_files.append(os.path.join(root, file))
        return html_files
    
    async def run_accessibility_scan(self) -> List[ComplianceIssue]:
        issues = []
        async with async_playwright() as p:
            browser = await p.chromium.launch()
            for html_file in self.html_files:
                page = await browser.new_page()
                await page.goto(f"file://{html_file}")
                # Inject axe-core from CDN
                await page.add_script_tag(url="https://cdnjs.cloudflare.com/ajax/libs/axe-core/4.7.2/axe.min.js")
                results = await page.evaluate("""async () => {
                    return await axe.run();
                }""")
                await page.close()
                for violation in results.get('violations', []):
                    issue = ComplianceIssue(
                        rule_id=violation['id'],
                        description=violation['description'],
                        impact=violation['impact'],
                        element=violation['nodes'][0]['html'] if violation['nodes'] else None,
                        fix_suggestion=violation.get('help', ''),
                        fixable=self._is_fixable(violation['id'])
                    )
                    issues.append(issue)
            await browser.close()
        return issues
    
    def _is_fixable(self, rule_id: str) -> bool:
        fixable_rules = ['image-alt', 'link-name', 'button-name', 'label', 'aria-roles']
        return rule_id in fixable_rules
    
    async def run_gdpr_scan(self) -> List[ComplianceIssue]:
        issues = []
        for html_file in self.html_files:
            with open(html_file, 'r', encoding='utf-8') as f:
                soup = BeautifulSoup(f.read(), 'html.parser')
            # Cookie banner check
            banner = soup.find(string=lambda text: text and ('cookie' in text.lower() or 'consent' in text.lower()))
            if not banner:
                issues.append(ComplianceIssue(
                    rule_id='gdpr-cookie-consent',
                    description='No cookie consent banner found',
                    impact='critical',
                    fix_suggestion='Add a cookie consent banner with opt-out mechanism',
                    fixable=True
                ))
            # Privacy policy link
            privacy_link = soup.find('a', href=True, string=lambda t: t and 'privacy' in t.lower())
            if not privacy_link:
                issues.append(ComplianceIssue(
                    rule_id='gdpr-privacy-policy',
                    description='No privacy policy link found',
                    impact='serious',
                    fix_suggestion='Add a link to a privacy policy page',
                    fixable=False
                ))
            # Form data notice (simplified)
            forms = soup.find_all('form')
            for form in forms:
                if not form.find(string=lambda t: t and 'data' in t.lower() and ('collect' in t.lower() or 'use' in t.lower())):
                    issues.append(ComplianceIssue(
                        rule_id='gdpr-data-notice',
                        description='Form does not include data collection notice',
                        impact='moderate',
                        element=str(form)[:100],
                        fix_suggestion='Add a notice near the form explaining data usage',
                        fixable=False
                    ))
        return issues
