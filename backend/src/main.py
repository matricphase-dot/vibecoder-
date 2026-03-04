import os
import sentry_sdk
from sentry_sdk.integrations.asgi import SentryAsgiMiddleware
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from src.routers import auth, workspaces, projects, domains, linter, deploy, export, preferences, compliance, activity, marketplace, subscription, test

sentry_sdk.init(
    dsn=os.getenv('SENTRY_DSN'),
    traces_sample_rate=1.0,
    environment=os.getenv('ENVIRONMENT', 'development')
)

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.add_middleware(SentryAsgiMiddleware)

app.include_router(auth.router)
app.include_router(test.router)
app.include_router(workspaces.router)
app.include_router(test.router)
app.include_router(projects.router)
app.include_router(test.router)
app.include_router(domains.router)
app.include_router(test.router)
app.include_router(linter.router)
app.include_router(test.router)
app.include_router(deploy.router)
app.include_router(test.router)
app.include_router(export.router)
app.include_router(test.router)
app.include_router(preferences.router)
app.include_router(test.router)
app.include_router(compliance.router)
app.include_router(test.router)
app.include_router(activity.router)
app.include_router(test.router)
app.include_router(marketplace.router)
app.include_router(test.router)
app.include_router(subscription.router)
app.include_router(test.router)\n
@app.get("/")
async def root():
    return {"message": "VibeCoder API is running"}


