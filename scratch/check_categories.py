import psycopg2

def check_categories():
    db_url = "postgresql://lager:lager@localhost:5439/lager"
    conn = psycopg2.connect(db_url)
    cur = conn.cursor()
    try:
        cur.execute("SELECT id, name, category FROM products")
        products = cur.fetchall()
        print("============= PRODUCT CATEGORIES DETAIL =============")
        for p in products:
            print(f"Product ID: {p[0]} | Name: {repr(p[1])} | Category: {repr(p[2])} | Len: {len(p[2]) if p[2] else 0}")
            
        cur.execute("SELECT key, value FROM settings")
        settings = cur.fetchall()
        print("\n============= SETTING KEYS DETAIL =============")
        for s in settings:
            print(f"Setting Key: {repr(s[0])} | Value: {repr(s[1])}")
    except Exception as e:
        print(f"Error: {e}")
    finally:
        cur.close()
        conn.close()

if __name__ == "__main__":
    check_categories()
