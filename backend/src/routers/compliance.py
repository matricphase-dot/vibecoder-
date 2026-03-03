from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.orm import Session
import os
from datetime import datetime

from src import models, schemas
from src.database import get_db
from src.auth import get_current_user
from src.core.compliance_scanner import ComplianceScanner

router = APIRouter(prefix="/api/compliance", tags=["compliance"])

@router.post("/scan/{project_id}", response_model=schemas.ComplianceScanResponse)
async def scan_project(
    project_id: int,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    # Check project exists and user has access
    project = db.query(models.Project).filter(
        models.Project.id == project_id,
        models.Project.workspace_id.in_([ws.id for ws in current_user.workspaces])
    ).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    # Determine project path
    project_path = os.path.join("workspace", f"project_{project_id}")
    if not os.path.exists(project_path):
        raise HTTPException(status_code=404, detail="Project files not found")
    
    scanner = ComplianceScanner(project_path)
    
    # Run scans (accessibility + GDPR)
    a11y_issues = await scanner.run_accessibility_scan()
    gdpr_issues = await scanner.run_gdpr_scan()
    all_issues = a11y_issues + gdpr_issues
        # Also run security scan
    from src.core.security_scanner import SecurityScanner
    scanner = SecurityScanner(project_path)
    security_issues = scanner.run_all()
    all_issues.extend([ComplianceIssue(**i) for i in security_issues])
    
    # Count by impact
    summary = {
        "critical": sum(1 for i in all_issues if i.impact == "critical"),
        "serious": sum(1 for i in all_issues if i.impact == "serious"),
        "moderate": sum(1 for i in all_issues if i.impact == "moderate"),
        "minor": sum(1 for i in all_issues if i.impact == "minor"),
        "total": len(all_issues)
    }
    
    # Save to database
    scan = models.ComplianceScan(
        project_id=project_id,
        scan_type="both",
        results=[i.dict() for i in all_issues],
        summary=summary
    )
    db.add(scan)
    db.commit()
    db.refresh(scan)
    
    return {
        "scan_id": scan.id,
        "project_id": project_id,
        "scan_type": "both",
        "issues": all_issues,
        "summary": summary,
        "created_at": scan.created_at
    }

@router.post("/fix/{project_id}")
async def fix_issue(
    project_id: int,
    issue_id: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    # Similar access check
    project = db.query(models.Project).filter(
        models.Project.id == project_id,
        models.Project.workspace_id.in_([ws.id for ws in current_user.workspaces])
    ).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    project_path = os.path.join("workspace", f"project_{project_id}")
    scanner = ComplianceScanner(project_path)  # reuse to get file list
    
    # Apply fix based on rule_id (simplified example)
    if issue_id == "image-alt":
        # Add alt attribute to images without alt
        for html_file in scanner._find_html_files():
            with open(html_file, 'r+', encoding='utf-8') as f:
                content = f.read()
                # Use regex or BeautifulSoup to add alt=""
                # For simplicity, we'll just demonstrate
                modified = content.replace("<img ", "<img alt='' ")
                f.seek(0)
                f.write(modified)
                f.truncate()
        return {"message": "Fixed image-alt issues"}
    elif issue_id == "gdpr-cookie-consent":
        # Add a simple cookie banner (inject HTML before </body>)
        banner_html = '''
<div id="cookie-consent-banner" style="position:fixed; bottom:0; left:0; right:0; background:#333; color:#fff; padding:1rem; text-align:center;">
    This site uses cookies. By continuing, you agree to our use of cookies.
    <button onclick="document.getElementById('cookie-consent-banner').style.display='none'">Accept</button>
</div>
'''
        for html_file in scanner._find_html_files():
            with open(html_file, 'r+', encoding='utf-8') as f:
                content = f.read()
                if '</body>' in content:
                    modified = content.replace('</body>', banner_html + '\n</body>')
                    f.seek(0)
                    f.write(modified)
                    f.truncate()
        return {"message": "Added cookie consent banner"}
    else:
        raise HTTPException(status_code=400, detail="Issue not fixable or fix not implemented")


