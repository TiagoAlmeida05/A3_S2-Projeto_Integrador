# 📊 Project QDA: Qualitative Data Analysis Tool

An open-source desktop application for qualitative research, allowing users to import documents, highlight text, and manage complex coding hierarchies.

## 🏗 Project Architecture

This project uses a **Sidecar Architecture**:

* **Frontend:** React + Tailwind CSS running inside **Electron**.
* **Backend:** FastAPI (Python) handling heavy processing (AI, PDF parsing, Exports).
* **Database:** SQLite

---

## 📂 Folder Structure & Responsibilities

| Folder/File | Purpose | Key Contents |
| --- | --- | --- |
| `/frontend` | The User Interface. | React components, Tailwind styles, Fetch API calls. |
| `/backend` | The "Brain" of the app. | FastAPI routes, SQLModel definitions, AI logic. |
| `main.js` | Electron Entry Point. | Manages the desktop window and spawns the backend. |
| `requirements.txt` | Python Deps. | Libraries like `fastapi`, `sqlmodel`, `psycopg2`. |

---

## 🛠 Prerequisites

Before starting, ensure everyone on the team has:

1. **Node.js** (v18+)
2. **Python** (3.10+)
3. **Docker Desktop** (or Docker Engine + Compose on Linux)
4. **Git**

---

## 📥 Installation

### 1. Clone the repo

```bash
git clone https://github.com/YOUR_ORGANIZATION/repo-name.git
cd repo-name

```

### 2. Backend Setup

**Linux / WSL / macOS**

```bash
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt

```

**Windows (PowerShell)**

```powershell
cd backend
python -m venv venv
.\venv\Scripts\Activate.ps1
pip install -r requirements.txt

```

### 3. Frontend & Desktop Setup

From the **root** folder:

```bash
npm install          # Installs Electron
cd frontend
npm install          # Installs React & Tailwind

```

---

## 🚀 Development Workflow

To run the project on `localhost`, you need to start the components in this specific order. Open **4 terminal tabs**:

### Tab 1: Backend (FastAPI)

*Ensure venv is active*

```bash
cd backend
uvicorn main:app --reload --port 8000

```

### Tab 2: Frontend (Vite)

```bash
cd frontend
npm run dev

```

### Tab 3: Desktop (Electron)

*Wait for Tab 3 to show "Local: http://localhost:5173"*

```bash
# From the root folder
npm start

```

---

## 📋 Team Rules & Git Flow

* **Main Branch:** Protected. Never push directly to `main`.
* **Feature Branches:** Create a branch for every task (`feature/add-pdf-import`).
* **Pull Requests:** At least one peer review is required before merging.
* **Database:** If you change backend/models.py, you must delete your local .db file and let FastAPI regenerate it, or write an Alembic migration script. Do not commit the .db file to GitHub.

---

## 🐧 Linux/WSL Notes

* **Electron Sandbox:** If the window doesn't open on some Linux distros, use: `npx electron . --no-sandbox`.
* **WSLg:** If you are using WSL, ensure you are on Windows 11 or have a Wayland/X11 server configured to see the Electron GUI.

---


Backend notes

- System dependency: ffmpeg is required for audio processing (splitting, transcoding).

Why ffmpeg is a system dependency
- `ffmpeg` is a standalone command-line binary not distributed via PyPI.
- The code uses `subprocess` to invoke `ffmpeg` and expects the binary on PATH.
- Pip can install Python bindings (e.g., PyAV) but that still often requires system ffmpeg libraries or a bundled wheel; installing the OS package ensures predictable behavior.

Quick install

- Debian / Ubuntu:

```bash
sudo apt update
sudo apt install ffmpeg -y
```

- macOS (Homebrew):

```bash
brew install ffmpeg
```

If you want, I can pin versions for `faster-whisper` and `openpyxl` in `backend/requirements.txt` as well.
