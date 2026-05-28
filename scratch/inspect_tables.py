import psycopg2

conn = psycopg2.connect(
    dbname="lagerpro",
    user="lager",
    password="lager",
    host="localhost",
    port="5439"
)

cur = conn.cursor()
cur.execute("SELECT table_name FROM information_schema.tables WHERE table_schema='public';")
print("Tables in public schema:")
for row in cur.fetchall():
    print(row[0])

cur.close()
conn.close()
