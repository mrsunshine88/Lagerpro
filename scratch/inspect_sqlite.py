import sqlite3

db_path = "database.db"
conn = sqlite3.connect(db_path)
cur = conn.cursor()

# Get table names
cur.execute("SELECT name FROM sqlite_master WHERE type='table';")
tables = [row[0] for row in cur.fetchall()]
print("Tables in SQLite database.db:", tables)

for table in tables:
    cur.execute(f"SELECT COUNT(*) FROM {table}")
    count = cur.fetchone()[0]
    print(f"Table '{table}' has {count} rows.")
    
    # Get columns
    cur.execute(f"PRAGMA table_info({table})")
    cols = [col[1] for col in cur.fetchall()]
    print(f"  Columns: {cols}")
    
    # Show 3 sample rows
    cur.execute(f"SELECT * FROM {table} LIMIT 3")
    rows = cur.fetchall()
    print("  Sample rows:")
    for r in rows:
        print("    ", r)
conn.close()
