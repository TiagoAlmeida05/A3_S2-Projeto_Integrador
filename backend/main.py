from typing import Optional

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import database
from pydantic import BaseModel

# This is the "app" variable that Uvicorn is looking for!
app = FastAPI()

origins = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class ProjectCreate(BaseModel):
    name: str
    description: Optional[str] = None

@app.get("/")
async def root():
    return {"message": "Hello World"}

@app.post("/projects/")
def create_project_route(project: ProjectCreate):
    project_id = database.create_project(project.name, project.description)
    return {"id": project_id, **project.dict()}

@app.get("/projects")
def get_projects_route():
    projects = database.get_all_projects()
    return projects