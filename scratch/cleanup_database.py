import sqlite3
import os

def clean_database():
    db_path = "database.db"
    if not os.path.exists(db_path):
        print(f"[FEL] Hittade inte databasfilen '{db_path}'.")
        return

    print("--- STARTAR DATABASRENSNING ---")
    conn = sqlite3.connect(db_path)
    cur = conn.cursor()

    try:
        # Get count before cleaning
        cur.execute("SELECT COUNT(*) FROM products")
        old_products = cur.fetchone()[0]
        cur.execute("SELECT COUNT(*) FROM variants")
        old_variants = cur.fetchone()[0]
        cur.execute("SELECT COUNT(*) FROM transactions")
        old_transactions = cur.fetchone()[0]
        cur.execute("SELECT COUNT(*) FROM bookings")
        old_bookings = cur.fetchone()[0]

        print(f"[INFO] Nuvarande saldon före städning:")
        print(f"  - Produkter: {old_products}")
        print(f"  - Varianter: {old_variants}")
        print(f"  - Transaktioner: {old_transactions}")
        print(f"  - Bokningar: {old_bookings}")

        print("\nTömmer tabeller...")
        
        # 1. Clear inventory data
        cur.execute("DELETE FROM bookings;")
        cur.execute("DELETE FROM transactions;")
        cur.execute("DELETE FROM variants;")
        cur.execute("DELETE FROM products;")
        
        # 2. Reset SQLite sequences
        cur.execute("DELETE FROM sqlite_sequence WHERE name IN ('products', 'variants', 'transactions', 'bookings');")
        
        print("[OK] Alla produkter, varianter, transaktioner och bokningar har raderats!")
        print("[OK] ID-sekvenser har återställts till 1.")

        # 3. Verify Users table (MUST keep admin!)
        cur.execute("SELECT id, email, role FROM users")
        users = cur.fetchall()
        print("\n[VERIFIERING] Registrerade användare efter städning:")
        for u in users:
            print(f"  - ID: {u[0]} | E-post: {u[1]} | Roll: {u[2]}")
            
        admin_exists = any(u[1] == 'apersson508@gmail.com' for u in users)
        if not admin_exists:
            raise Exception("KRITISKT FEL: Admin-användaren apersson508@gmail.com togs bort! Rullar tillbaka ändringarna!")

        # 4. Verify Settings table
        cur.execute("SELECT key, value FROM settings")
        settings = cur.fetchall()
        print("\n[VERIFIERING] Bevarade inställningar:")
        for s in settings:
            # Mask sensitive info
            val = "••••" if "password" in s[0] or "key" in s[0] or "cert" in s[0] or "secret" in s[0] else s[1]
            print(f"  - {s[0]}: {val}")

        # Commit changes
        conn.commit()
        print("\n[KLAR] Databasrensningen slutfördes framgångsrikt och sparades!")

    except Exception as e:
        conn.rollback()
        print(f"\n[FEL] Ett fel uppstod under städningen: {e}")
        print("[INFO] Ändringarna har rullats tillbaka. Databasen förblir oförändrad.")
    finally:
        conn.close()

if __name__ == "__main__":
    clean_database()
