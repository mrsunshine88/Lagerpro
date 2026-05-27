import psycopg2

def clean_placeholder():
    db_url = "postgresql://lager:lager@localhost:5439/lager"
    print(f"Connecting to database to update placeholder stock: {db_url}")
    conn = psycopg2.connect(db_url)
    cur = conn.cursor()
    try:
        # Set placeholder variant stock to 0
        cur.execute("UPDATE variants SET stock = 0 WHERE sku = 'PLACEHOLDER'")
        conn.commit()
        print("Updated stock of SKU 'PLACEHOLDER' to 0.")
        
        # Verify the stock now
        cur.execute("SELECT id, sku, stock FROM variants")
        rows = cur.fetchall()
        print("\n============= VARIANTS AFTER CLEANUP =============")
        for r in rows:
            print(f"  ID: {r[0]} | SKU: {r[1]} | Stock: {r[2]}")
            
    except Exception as e:
        print(f"Error: {e}")
        conn.rollback()
    finally:
        cur.close()
        conn.close()

if __name__ == "__main__":
    clean_placeholder()
