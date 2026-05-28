import psycopg2

conn = psycopg2.connect(
    dbname="lagerpro",
    user="lager",
    password="lager",
    host="localhost",
    port="5439"
)

cur = conn.cursor()

try:
    cur.execute("ALTER TABLE products ADD COLUMN brand VARCHAR(255);")
except Exception as e:
    print(e)
    conn.rollback()
else:
    conn.commit()

try:
    cur.execute("ALTER TABLE products ADD COLUMN is_sponsored BOOLEAN DEFAULT false;")
except Exception as e:
    print(e)
    conn.rollback()
else:
    conn.commit()

try:
    cur.execute("ALTER TABLE variants ADD COLUMN image_url VARCHAR(255);")
except Exception as e:
    print(e)
    conn.rollback()
else:
    conn.commit()

cur.close()
conn.close()
print("Migration completed.")
