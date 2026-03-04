import os
from sqlalchemy import create_engine, text
import bcrypt

# Your Supabase connection string
DATABASE_URL = "postgresql://postgres.xvqmeiiqezacweqpfvaw:vibecoderadmin7304@aws-1-ap-south-1.pooler.supabase.com:5432/postgres?sslmode=require"

engine = create_engine(DATABASE_URL)

email = "vibeking@1.in"
password = "admin7304"
username = "admin"

# Generate bcrypt hash (same as your backend uses)
hashed = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

with engine.connect() as conn:
    # Check if user already exists
    result = conn.execute(text("SELECT id FROM users WHERE email = :email"), {"email": email})
    if result.first():
        print("User already exists.")
    else:
        conn.execute(
            text("""
                INSERT INTO users (username, email, hashed_password, is_admin, created_at)
                VALUES (:username, :email, :hashed, :is_admin, NOW())
            """),
            {
                "username": username,
                "email": email,
                "hashed": hashed,
                "is_admin": 1
            }
        )
        conn.commit()
        print("✅ Admin user created successfully!")