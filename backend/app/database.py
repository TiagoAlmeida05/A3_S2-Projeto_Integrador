import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base

data_dir = os.environ.get("JUPITER_DATA_DIR", ".")
os.makedirs(data_dir, exist_ok=True)

db_path = os.path.join(data_dir, "qda_data.db")
SQLALCHEMY_DATABASE_URL = f"sqlite:///{db_path}"

engine = create_engine(
    SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False}
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()