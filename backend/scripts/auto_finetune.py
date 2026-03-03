import schedule
import time
import subprocess
import logging
import os
from datetime import datetime

logging.basicConfig(filename='finetune.log', level=logging.INFO,
                    format='%(asctime)s - %(levelname)s - %(message)s')

def run_pipeline():
    logging.info("Starting fine-tuning pipeline...")
    try:
        # Export data
        logging.info("Exporting training data...")
        subprocess.run(["python", "scripts/export_training_data.py"], check=True, capture_output=True, text=True)
        # Train model
        logging.info("Training model...")
        result = subprocess.run(["python", "scripts/train_model.py"], check=True, capture_output=True, text=True)
        logging.info("Pipeline completed successfully.")
        logging.debug(result.stdout)
    except subprocess.CalledProcessError as e:
        logging.error(f"Pipeline failed: {e.stderr}")
    except Exception as e:
        logging.exception("Unexpected error")

if __name__ == "__main__":
    logging.info("Scheduler started.")
    # Run once immediately
    run_pipeline()
    # Schedule daily at 3 AM
    schedule.every().day.at("03:00").do(run_pipeline)
    while True:
        schedule.run_pending()
        time.sleep(60)
