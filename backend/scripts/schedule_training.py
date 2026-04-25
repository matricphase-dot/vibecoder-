# backend/scripts/schedule_training.py
from apscheduler.schedulers.background import BackgroundScheduler
import subprocess
import sys
from pathlib import Path

def job():
    subprocess.run([sys.executable, str(Path(__file__).parent / "nightly_train.py")])

scheduler = BackgroundScheduler()
scheduler.add_job(job, 'cron', hour=3, minute=0)
scheduler.start()

import time
try:
    while True:
        time.sleep(60)
except KeyboardInterrupt:
    scheduler.shutdown()
