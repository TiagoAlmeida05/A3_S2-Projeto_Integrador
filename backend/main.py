from fastapi import FastAPI

# This is the "app" variable that Uvicorn is looking for!
app = FastAPI()

@app.get("/")
def read_root():
    return {"message": "My FastAPI server is successfully running!"}