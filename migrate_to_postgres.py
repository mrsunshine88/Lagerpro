import os
import sys
import sqlite3
import psycopg2
from psycopg2.extras import DictCursor

def migrate():
    # 1. Check for DATABASE_URL
    database_url = os.environ.get('DATABASE_URL')
    if not database_url and os.path.exists('.env'):
        try:
            with open('.env', 'r', encoding='utf-8') as f:
                for line in f:
                    line = line.strip()
                    if line and not line.startswith('#') and '=' in line:
                        k, v = line.split('=', 1)
                        if k.strip() == 'DATABASE_URL':
                            database_url = v.strip()
                            print(f"[INFO] Laddade databaskoppling från .env-fil!")
                            break
        except Exception:
            pass

    if not database_url:
        print("[FEL] Miljövariabeln 'DATABASE_URL' är inte inställd!")
        print("Vänligen ställ in den i ditt terminalfönster eller din miljö, t.ex:")
        print("  Windows PowerShell: $env:DATABASE_URL=\"postgresql://användare:lösenord@server:port/databas\"")
        print("  Windows CMD: set DATABASE_URL=postgresql://användare:lösenord@server:port/databas")
        print("\nEller skriv in anslutningssträngen direkt här för att starta migreringen:")
        database_url = input("> ").strip()
        if not database_url:
            print("[INFO] Migreringen avbröts.")
            sys.exit(1)
        try:
            with open('.env', 'w', encoding='utf-8') as f:
                f.write(f"DATABASE_URL={database_url}\n")
            print("[INFO] Sparade anslutningssträngen till .env för framtida bruk och automatisk start!")
        except Exception:
            pass

    sqlite_db_path = 'database.db'
    if not os.path.exists(sqlite_db_path):
        print(f"[FEL] Hittade inte SQLite-filen '{sqlite_db_path}'! Körs skriptet i rätt mapp?")
        sys.exit(1)

    print(f"\n[INFO] Ansluter till SQLite-databasen ({sqlite_db_path})...")
    sqlite_conn = sqlite3.connect(sqlite_db_path)
    sqlite_conn.row_factory = sqlite3.Row
    sqlite_cur = sqlite_conn.cursor()

    print("[INFO] Ansluter till PostgreSQL-databasen...")
    try:
        pg_conn = psycopg2.connect(database_url)
        pg_cur = pg_conn.cursor(cursor_factory=DictCursor)
        print("[INFO] Anslutning lyckades!\n")
    except Exception as e:
        print(f"[FEL] Kunde inte ansluta till PostgreSQL: {e}")
        sqlite_conn.close()
        sys.exit(1)

    tables = ['products', 'variants', 'transactions', 'settings', 'users', 'bookings']

    try:
        # First, ensure Postgres schema is initialized by running the app's table creation sql if needed.
        print("[1/3] Förbereder databasschemat i PostgreSQL...")
        
        # Perform a CASCADE truncate to clear existing data to prevent duplicates
        for table in reversed(tables):
            try:
                pg_cur.execute(f"TRUNCATE TABLE {table} CASCADE;")
                print(f"  - Rensade befintlig data i tabell '{table}' (TRUNCATE)")
            except Exception:
                pg_conn.rollback()
                print(f"  - Tabell '{table}' finns inte än eller kunde inte rensas. Den kommer att skapas.")

        # Define table schemas explicitly to be robust and stand-alone
        pg_cur.execute('''
            CREATE TABLE IF NOT EXISTS products (
                id SERIAL PRIMARY KEY,
                name TEXT NOT NULL,
                category TEXT NOT NULL,
                description TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        ''')
        pg_cur.execute('''
            CREATE TABLE IF NOT EXISTS variants (
                id SERIAL PRIMARY KEY,
                product_id INTEGER REFERENCES products (id) ON DELETE CASCADE,
                sku TEXT UNIQUE,
                stock INTEGER DEFAULT 0,
                size TEXT,
                color TEXT,
                purchase_price REAL DEFAULT 0.0,
                selling_price REAL DEFAULT 0.0,
                original_price REAL DEFAULT 0.0
            )
        ''')
        pg_cur.execute('''
            CREATE TABLE IF NOT EXISTS transactions (
                id SERIAL PRIMARY KEY,
                variant_id INTEGER REFERENCES variants (id) ON DELETE CASCADE,
                type TEXT NOT NULL,
                quantity INTEGER NOT NULL,
                purchase_price REAL DEFAULT 0.0,
                selling_price REAL DEFAULT 0.0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        ''')
        pg_cur.execute('''
            CREATE TABLE IF NOT EXISTS settings (
                key TEXT PRIMARY KEY,
                value TEXT
            )
        ''')
        pg_cur.execute('''
            CREATE TABLE IF NOT EXISTS users (
                id SERIAL PRIMARY KEY,
                email TEXT UNIQUE NOT NULL,
                password TEXT NOT NULL,
                role TEXT NOT NULL DEFAULT 'user',
                allowed_projects TEXT DEFAULT 'all'
            )
        ''')
        pg_cur.execute('''
            CREATE TABLE IF NOT EXISTS bookings (
                id SERIAL PRIMARY KEY,
                variant_id INTEGER REFERENCES variants (id) ON DELETE CASCADE,
                customer_first_name TEXT NOT NULL,
                customer_last_name TEXT NOT NULL,
                customer_phone TEXT NOT NULL,
                status TEXT DEFAULT 'pending',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        ''')
        pg_conn.commit()
        print("  - Alla tabeller skapade/verifierade i PostgreSQL!")

        print("\n[2/3] Överför data från SQLite till PostgreSQL...")

        # 2. Migrate tables in safe dependency order
        # products
        sqlite_cur.execute("SELECT * FROM products")
        products = sqlite_cur.fetchall()
        print(f"  - Kopierar {len(products)} produkter...")
        for row in products:
            pg_cur.execute(
                "INSERT INTO products (id, name, category, description, created_at) VALUES (%s, %s, %s, %s, %s)",
                (row['id'], row['name'], row['category'], row['description'], row['created_at'])
            )

        # variants
        sqlite_cur.execute("SELECT * FROM variants")
        variants = sqlite_cur.fetchall()
        print(f"  - Kopierar {len(variants)} varianter...")
        for row in variants:
            pg_cur.execute(
                "INSERT INTO variants (id, product_id, sku, stock, size, color, purchase_price, selling_price, original_price) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)",
                (row['id'], row['product_id'], row['sku'], row['stock'], row['size'], row['color'], row['purchase_price'], row['selling_price'], row['original_price'])
            )

        # transactions
        sqlite_cur.execute("SELECT * FROM transactions")
        transactions = sqlite_cur.fetchall()
        print(f"  - Kopierar {len(transactions)} transaktioner...")
        for row in transactions:
            pg_cur.execute(
                "INSERT INTO transactions (id, variant_id, type, quantity, purchase_price, selling_price, created_at) VALUES (%s, %s, %s, %s, %s, %s, %s)",
                (row['id'], row['variant_id'], row['type'], row['quantity'], row['purchase_price'], row['selling_price'], row['created_at'])
            )

        # settings
        sqlite_cur.execute("SELECT * FROM settings")
        settings = sqlite_cur.fetchall()
        print(f"  - Kopierar {len(settings)} inställningar...")
        for row in settings:
            pg_cur.execute(
                "INSERT INTO settings (key, value) VALUES (%s, %s)",
                (row['key'], row['value'])
            )

        # users
        sqlite_cur.execute("SELECT * FROM users")
        users = sqlite_cur.fetchall()
        print(f"  - Kopierar {len(users)} användare...")
        for row in users:
            pg_cur.execute(
                "INSERT INTO users (id, email, password, role, allowed_projects) VALUES (%s, %s, %s, %s, %s)",
                (row['id'], row['email'], row['password'], row['role'], row['allowed_projects'])
            )

        # bookings
        sqlite_cur.execute("SELECT * FROM bookings")
        bookings = sqlite_cur.fetchall()
        print(f"  - Kopierar {len(bookings)} bokningar...")
        for row in bookings:
            pg_cur.execute(
                "INSERT INTO bookings (id, variant_id, customer_first_name, customer_last_name, customer_phone, status, created_at) VALUES (%s, %s, %s, %s, %s, %s, %s)",
                (row['id'], row['variant_id'], row['customer_first_name'], row['customer_last_name'], row['customer_phone'], row['status'], row['created_at'])
            )

        pg_conn.commit()
        print("  - Dataöverföring klar!")

        # 3. Reset database sequences in Postgres so serial IDs start at max + 1
        print("\n[3/3] Återställer ID-sekvenser i PostgreSQL...")
        serial_tables = ['products', 'variants', 'transactions', 'users', 'bookings']
        for table in serial_tables:
            pg_cur.execute(f"SELECT COALESCE(MAX(id), 0) FROM {table}")
            max_id = pg_cur.fetchone()[0]
            if max_id == 0:
                pg_cur.execute(f"SELECT setval(pg_get_serial_sequence('{table}', 'id'), 1, false)")
            else:
                seq_query = f"SELECT setval(pg_get_serial_sequence('{table}', 'id'), %s, true)"
                pg_cur.execute(seq_query, (max_id,))
            print(f"  - Sekvens för '{table}' återställd till ID {max_id or 1}")

        pg_conn.commit()
        print("\n[KLAR] Migreringen lyckades utan fel!")
        print("Du kan nu starta lagersystemet och använda din PostgreSQL-databas!")

    except Exception as e:
        pg_conn.rollback()
        print(f"\n[FEL] Ett fel uppstod under migreringen: {e}")
        print("[INFO] Ändringarna har rullats tillbaka och inga data sparades i PostgreSQL.")
    finally:
        sqlite_conn.close()
        pg_conn.close()

if __name__ == '__main__':
    migrate()
