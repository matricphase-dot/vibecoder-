import os
from sendgrid import SendGridAPIClient
from sendgrid.helpers.mail import Mail

def send_email(to_email, subject, html_content):
    """Send an email using SendGrid."""
    sg = SendGridAPIClient(os.getenv('SENDGRID_API_KEY'))
    from_email = os.getenv('FROM_EMAIL', 'noreply@vibecoder.com')
    message = Mail(
        from_email=from_email,
        to_emails=to_email,
        subject=subject,
        html_content=html_content
    )
    try:
        response = sg.send(message)
        print(f"Email sent to {to_email}. Status: {response.status_code}")
        return True
    except Exception as e:
        print(f"Error sending email: {e}")
        return False

def send_invite_email(to_email, inviter_name, workspace_name, invite_link):
    """Send a workspace invitation email."""
    subject = f"You've been invited to join {workspace_name} on VibeCoder"
    html = f"""
    <html>
      <body>
        <h2>Invitation to join {workspace_name}</h2>
        <p>{inviter_name} has invited you to join the workspace <strong>{workspace_name}</strong> on VibeCoder.</p>
        <p>Click the link below to accept the invitation:</p>
        <p><a href="{invite_link}">{invite_link}</a></p>
        <p>If you don't have an account, you'll be prompted to create one.</p>
        <br>
        <p>– The VibeCoder Team</p>
      </body>
    </html>
    """
    return send_email(to_email, subject, html)

def send_password_reset_email(to_email, reset_link):
    """Send a password reset email."""
    subject = "Reset your VibeCoder password"
    html = f"""
    <html>
      <body>
        <h2>Password Reset Request</h2>
        <p>We received a request to reset your password.</p>
        <p>Click the link below to set a new password (valid for 1 hour):</p>
        <p><a href="{reset_link}">{reset_link}</a></p>
        <p>If you didn't request this, you can ignore this email.</p>
        <br>
        <p>– The VibeCoder Team</p>
      </body>
    </html>
    """
    return send_email(to_email, subject, html)
