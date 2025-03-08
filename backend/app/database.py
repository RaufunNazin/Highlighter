from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
import os
from dotenv import load_dotenv

load_dotenv()

url = os.getenv("DB_URL")
engine = create_engine(url)
SessionLocal = sessionmaker(autocommit = False, autoflush = False, bind = engine)
Base = declarative_base()

def get_db() :
    db = SessionLocal()
    try :
        yield db
    finally :
        db.close()