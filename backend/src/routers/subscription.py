from fastapi import APIRouter, Depends, Request
from src import models
from src.auth import get_current_user

router = APIRouter(prefix="/api/subscription", tags=["subscription"])

# Plan definitions (stored for future use)
PLANS = [
    {"id": "free", "name": "Free", "price": 0, "max_projects": 999},
    {"id": "pro_monthly", "name": "Pro Monthly", "price": 9.99, "currency": "USD", "interval": "month"},
    {"id": "pro_yearly", "name": "Pro Yearly", "price": 99.99, "currency": "USD", "interval": "year"},
]

@router.get("/plans")
async def list_plans():
    """Return available subscription plans."""
    return PLANS

@router.post("/create-paypal-order")
async def create_paypal_order(plan_id: str, current_user: models.User = Depends(get_current_user)):
    """
    Stub for PayPal order creation.
    When ready, integrate with PayPal SDK.
    """
    return {
        "approval_url": f"https://www.paypal.com/checkout?plan={plan_id}&user={current_user.id}",
        "message": "PayPal integration placeholder"
    }

@router.post("/create-razorpay-order")
async def create_razorpay_order(plan_id: str, current_user: models.User = Depends(get_current_user)):
    """
    Stub for Razorpay order creation.
    When ready, integrate with Razorpay SDK.
    """
    return {
        "order_id": "dummy_order_id",
        "amount": 999,
        "currency": "INR",
        "message": "Razorpay integration placeholder"
    }

@router.post("/webhook/paypal")
async def paypal_webhook(request: Request):
    """Stub for PayPal webhook handler."""
    payload = await request.json()
    # Verify signature and update user plan
    return {"status": "received", "message": "PayPal webhook stub"}

@router.post("/webhook/razorpay")
async def razorpay_webhook(request: Request):
    """Stub for Razorpay webhook handler."""
    payload = await request.json()
    # Verify signature and update user plan
    return {"status": "received", "message": "Razorpay webhook stub"}

@router.get("/my-plan")
async def my_plan(current_user: models.User = Depends(get_current_user)):
    """Return current user's plan (always free for now)."""
    # For passive mode, always return free plan
    return {
        "plan": "free",
        "projects_used": 0,  # Not enforced
        "max_projects": 999,
        "trial_start": None
    }
