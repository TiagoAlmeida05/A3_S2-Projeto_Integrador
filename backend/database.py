import sqlite3

DB_NAME = 'database.db'

def get_db_connection():
    conn = sqlite3.connect(DB_NAME)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS projects (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            description TEXT
        )
    ''')
    conn.commit()
    conn.close()

def create_project(name, description):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute('INSERT INTO projects (name, description) VALUES (?, ?)', (name, description))
    conn.commit()
    new_id = cursor.lastrowid
    conn.close()
    return new_id

def get_all_projects():
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute('SELECT * FROM projects ORDER BY id DESC')
    projects = cursor.fetchall()
    conn.close()
    return [dict(project) for project in projects]

if __name__ == '__main__':
    init_db()