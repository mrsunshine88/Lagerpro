import os
import re
import sys
import subprocess

# --- AUTOMATIC DEPENDENCY INSTALLER FOR WINDOWS ---
required_modules = {
    'flask': 'flask',
    'pandas': 'pandas',
    'openpyxl': 'openpyxl',
    'qrcode': 'qrcode',
    'pillow': 'pillow',
    'psycopg2': 'psycopg2-binary'
}
for module_name, pip_name in required_modules.items():
    try:
        __import__(module_name)
    except ImportError:
        print(f"[SYSTEM] Saknat Python-paket upptäckt: {pip_name}. Installerar automatiskt...")
        try:
            subprocess.check_call([sys.executable, "-m", "pip", "install", pip_name])
            print(f"[SYSTEM] Installation av {pip_name} klar!")
        except Exception as e:
            print(f"[FEL] Kunde inte installera {pip_name} automatiskt: {e}")

import psycopg2
from psycopg2.extras import DictCursor
import pandas as pd
import qrcode
from io import BytesIO
from datetime import datetime
from flask import Flask, request, jsonify, render_template, send_file, session, send_from_directory
from werkzeug.security import generate_password_hash, check_password_hash

app = Flask(__name__)
app.secret_key = os.urandom(24)

DATABASE_URL = os.environ.get('DATABASE_URL')
DEFAULT_PASSWORD = "lager"

class PostgresCursorWrapper:
    def __init__(self, cur, conn_raw):
        self._cur = cur
        self._conn_raw = conn_raw
        
    def __getattr__(self, name):
        return getattr(self._cur, name)
        
    @property
    def lastrowid(self):
        try:
            with self._conn_raw.cursor() as temp_cur:
                temp_cur.execute("SELECT lastval()")
                return temp_cur.fetchone()[0]
        except Exception:
            return None

    def execute(self, sql, params=None):
        if isinstance(sql, str):
            sql = sql.replace('?', '%s')
        self._cur.execute(sql, params)
        return self

class PostgresConnectionWrapper:
    def __init__(self, conn):
        self._conn = conn
        
    def __enter__(self):
        return self
        
    def __exit__(self, exc_type, exc_val, exc_tb):
        if exc_type is not None:
            self._conn.rollback()
        else:
            try:
                self._conn.commit()
            except Exception:
                pass
        self._conn.close()
        
    def cursor(self):
        return PostgresCursorWrapper(self._conn.cursor(cursor_factory=DictCursor), self._conn)
        
    def execute(self, sql, params=None):
        cur = self.cursor()
        cur.execute(sql, params)
        return cur
        
    def commit(self):
        self._conn.commit()
        
    def rollback(self):
        self._conn.rollback()
        
    def close(self):
        self._conn.close()

def get_db():
    url = DATABASE_URL
    if not url:
        # Fallback default local string
        url = "postgresql://postgres:postgres@localhost:5432/lager"
    conn = psycopg2.connect(url)
    return PostgresConnectionWrapper(conn)

def init_db():
    with get_db() as conn:
        # Create products table
        conn.execute('''
            CREATE TABLE IF NOT EXISTS products (
                id SERIAL PRIMARY KEY,
                name TEXT NOT NULL,
                category TEXT NOT NULL,
                description TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        ''')
        
        # Create variants table
        conn.execute('''
            CREATE TABLE IF NOT EXISTS variants (
                id SERIAL PRIMARY KEY,
                product_id INTEGER,
                sku TEXT UNIQUE,
                stock INTEGER DEFAULT 0,
                size TEXT,
                color TEXT,
                purchase_price REAL DEFAULT 0.0,
                selling_price REAL DEFAULT 0.0,
                original_price REAL DEFAULT 0.0,
                FOREIGN KEY (product_id) REFERENCES products (id) ON DELETE CASCADE
            )
        ''')
        
        # Create transactions table for sales/purchases tracking
        conn.execute('''
            CREATE TABLE IF NOT EXISTS transactions (
                id SERIAL PRIMARY KEY,
                variant_id INTEGER,
                type TEXT NOT NULL, -- 'sale', 'purchase', 'adjustment'
                quantity INTEGER NOT NULL,
                purchase_price REAL DEFAULT 0.0,
                selling_price REAL DEFAULT 0.0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (variant_id) REFERENCES variants (id) ON DELETE CASCADE
            )
        ''')
        
        # Create settings table
        conn.execute('''
            CREATE TABLE IF NOT EXISTS settings (
                key TEXT PRIMARY KEY,
                value TEXT
            )
        ''')
        
        # Create users table
        conn.execute('''
            CREATE TABLE IF NOT EXISTS users (
                id SERIAL PRIMARY KEY,
                email TEXT UNIQUE NOT NULL,
                password TEXT NOT NULL,
                role TEXT NOT NULL DEFAULT 'user', -- 'admin' or 'user'
                allowed_projects TEXT DEFAULT 'all' -- comma-separated list of project names, or 'all'
            )
        ''')
        
        # Create bookings table
        conn.execute('''
            CREATE TABLE IF NOT EXISTS bookings (
                id SERIAL PRIMARY KEY,
                variant_id INTEGER NOT NULL,
                customer_first_name TEXT NOT NULL,
                customer_last_name TEXT NOT NULL,
                customer_phone TEXT NOT NULL,
                status TEXT DEFAULT 'pending', -- 'pending', 'confirmed', 'cancelled'
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (variant_id) REFERENCES variants (id) ON DELETE CASCADE
            )
        ''')
        
        # Seed default admin user (always update to requested admin password)
        conn.execute('''
            INSERT INTO users (id, email, password, role, allowed_projects)
            VALUES (1, 'apersson508@gmail.com', ?, 'admin', 'all')
            ON CONFLICT (id) DO UPDATE SET
                email = EXCLUDED.email,
                password = EXCLUDED.password,
                role = EXCLUDED.role,
                allowed_projects = EXCLUDED.allowed_projects
        ''', (generate_password_hash('020406'),))
        
        # --- DATABASE MIGRATIONS ---
        # Add new price columns if variants table already existed without them
        try:
            conn.execute("ALTER TABLE variants ADD COLUMN IF NOT EXISTS purchase_price REAL DEFAULT 0.0")
        except Exception:
            pass # Already exists or table not ready
            
        try:
            conn.execute("ALTER TABLE variants ADD COLUMN IF NOT EXISTS selling_price REAL DEFAULT 0.0")
        except Exception:
            pass # Already exists or table not ready
            
        conn.commit()

# --- HELPER FUNCTIONS ---
def check_auth():
    if session.get('authenticated') is True:
        return True
    return False

def needs_hashing(pw: str) -> bool:
    """Return True if the stored password is NOT already a Werkzeug hash."""
    return not pw.startswith('pbkdf2:') and not pw.startswith('scrypt:')

def migrate_plaintext_passwords():
    """One-time migration: hash any passwords not already hashed."""
    with get_db() as conn:
        users = conn.execute("SELECT id, password FROM users").fetchall()
        for u in users:
            if needs_hashing(u['password']):
                conn.execute(
                    "UPDATE users SET password = ? WHERE id = ?",
                    (generate_password_hash(u['password']), u['id'])
                )
        conn.commit()

init_db()
migrate_plaintext_passwords()  # Hash any existing plaintext passwords on startup

def check_admin():
    return check_auth() and session.get('user_role') == 'admin'

# --- WEB PAGE ROUTES ---
@app.route('/sw.js')
def serve_sw():
    return send_from_directory('static/js', 'sw.js', mimetype='application/javascript')

@app.route('/')
def index():
    if session.get('authenticated') is True:
        return render_template('index.html')
    return render_template('index.html', require_login=True)

@app.route('/api/session-info')
def session_info():
    if not check_auth():
        return jsonify({"authenticated": False}), 401
    return jsonify({
        "authenticated": True,
        "email": session.get('user_email'),
        "role": session.get('user_role'),
        "allowed_projects": session.get('allowed_projects')
    })

@app.route('/api/login', methods=['POST'])
def login():
    data = request.json or {}
    email = data.get('email', '').strip().lower()
    password = data.get('password', '').strip()
    
    # Support typo version in login check
    lookup_email = email
    if email == 'apersson508@gmai..com':
        lookup_email = 'apersson508@gmail.com'
        
    with get_db() as conn:
        user = conn.execute("SELECT * FROM users WHERE LOWER(email) = ?", (lookup_email,)).fetchone()
        
    if user and check_password_hash(user['password'], password):
        session['authenticated'] = True
        session['user_id'] = user['id']
        session['user_email'] = user['email']
        session['user_role'] = user['role']
        session['allowed_projects'] = user['allowed_projects']
        return jsonify({"success": True})
        
    return jsonify({"success": False, "error": "Felaktig e-postadress eller lösenord"}), 401

@app.route('/api/logout', methods=['POST'])
def logout():
    session.clear()
    return jsonify({"success": True})

# --- PRODUCT & STOCK API ENDPOINTS ---
@app.route('/api/products', methods=['GET'])
def get_products():
    if not check_auth():
        return jsonify({"error": "Unauthorized"}), 401
        
    user_role = session.get('user_role', 'user')
    allowed_projects = session.get('allowed_projects', 'all')
    
    with get_db() as conn:
        if user_role == 'admin' or allowed_projects == 'all':
            products = conn.execute("SELECT * FROM products ORDER BY id DESC").fetchall()
        else:
            # Standard user restricted project filtering
            projects_list = [p.strip() for p in allowed_projects.split(',') if p.strip()]
            placeholders = ','.join('?' for _ in projects_list)
            
            if not projects_list:
                return jsonify([]) # No allowed projects assigned yet
                
            query = f"SELECT * FROM products WHERE category IN ({placeholders}) ORDER BY id DESC"
            products = conn.execute(query, projects_list).fetchall()
            
        result = []
        for p in products:
            p_dict = dict(p)
            variants = conn.execute(
                "SELECT * FROM variants WHERE product_id = ? ORDER BY size, color", 
                (p['id'],)
            ).fetchall()
            p_dict['variants'] = [dict(v) for v in variants]
            result.append(p_dict)
        return jsonify(result)

@app.route('/api/inventory/sold')
def get_total_sold():
    if not check_auth():
        return jsonify({"error": "Unauthorized"}), 401
    with get_db() as conn:
        row = conn.execute("SELECT SUM(quantity) FROM transactions WHERE type = 'sale'").fetchone()
        count = row[0] if row[0] else 0
        return jsonify({"total_sold": count})

@app.route('/api/projects/discount', methods=['GET', 'POST'])
def project_discount_endpoint():
    if not check_auth():
        return jsonify({"error": "Unauthorized"}), 401
        
    if request.method == 'GET':
        project = request.args.get('project', 'Allmänt')
        with get_db() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT value FROM settings WHERE key = ?", (f"discount_{project}",))
            row = cursor.fetchone()
            discount = float(row[0]) if row else 0.0
            return jsonify({"project": project, "discount_percent": discount})
            
    # POST - Admin only
    if session.get('user_role') != 'admin':
        return jsonify({"error": "Forbidden"}), 403
        
    data = request.json or {}
    project = data.get('project', 'Allmänt')
    discount = float(data.get('discount_percent', 0.0))
    
    with get_db() as conn:
        cursor = conn.cursor()
        
        # Save setting
        cursor.execute("INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value", (f"discount_{project}", str(discount)))
        
        # Get all products belonging to this project
        cursor.execute("SELECT id FROM products WHERE category = ?", (project,))
        product_ids = [row[0] for row in cursor.fetchall()]
        
        if product_ids:
            for p_id in product_ids:
                # Update selling_price based on original_price
                cursor.execute("""
                    UPDATE variants 
                    SET selling_price = CASE 
                        WHEN original_price > 0 THEN ROUND(original_price * (1.0 - ? / 100.0), 0)
                        ELSE selling_price
                    END
                    WHERE product_id = ?
                """, (discount, p_id))
        conn.commit()
        
    return jsonify({"success": True, "message": f"Applied {discount}% discount to {project} successfully!", "discount_percent": discount})

@app.route('/api/projects/investment', methods=['GET', 'POST'])
def project_investment_endpoint():
    if not check_auth():
        return jsonify({"error": "Unauthorized"}), 401
        
    if request.method == 'GET':
        project = request.args.get('project', 'Allmänt')
        with get_db() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT value FROM settings WHERE key = ?", (f"investment_{project}",))
            row = cursor.fetchone()
            investment = float(row[0]) if row and row[0] else 0.0
            return jsonify({"project": project, "investment": investment})
            
    # POST - Admin only
    if session.get('user_role') != 'admin':
        return jsonify({"error": "Forbidden"}), 403
        
    data = request.json or {}
    project = data.get('project', 'Allmänt')
    investment = float(data.get('investment', 0.0))
    
    with get_db() as conn:
        cursor = conn.cursor()
        # Save setting
        cursor.execute("INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value", (f"investment_{project}", str(investment)))
        conn.commit()
        
    return jsonify({"success": True, "message": f"Saved {investment} kr investment for {project} successfully!", "investment": investment})


@app.route('/api/products', methods=['POST'])
def add_product():
    if not check_auth():
        return jsonify({"error": "Unauthorized"}), 401
        
    data = request.json or {}
    name = data.get('name')
    category = data.get('category', 'Skor')
    description = data.get('description', '')
    variants = data.get('variants', [])
    
    if not name:
        return jsonify({"error": "Produktnamn saknas"}), 400
        
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute(
            "INSERT INTO products (name, category, description) VALUES (?, ?, ?)",
            (name, category, description)
        )
        product_id = cursor.lastrowid
        
        for v in variants:
            size = v.get('size', '')
            color = v.get('color', '')
            stock = int(v.get('stock', 0))
            p_price = float(v.get('purchase_price', 0.0))
            s_price = float(v.get('selling_price', 0.0))
            orig_price = float(v.get('original_price') or v.get('selling_price') or 0.0)
            
            sku = v.get('sku')
            if not sku:
                clean_name = re.sub(r'[^a-zA-Z0-9]', '', name)[:4].upper()
                clean_color = re.sub(r'[^a-zA-Z0-9]', '', color)[:3].upper() if color else "UNI"
                clean_size = re.sub(r'[^a-zA-Z0-9]', '', size) if size else "U"
                timestamp = datetime.now().strftime("%f")[-3:]
                sku = f"LGR-{clean_name}-{clean_size}-{clean_color}-{timestamp}"
                
            cursor.execute(
                "INSERT INTO variants (product_id, sku, stock, size, color, purchase_price, selling_price, original_price) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
                (product_id, sku, stock, size, color, p_price, s_price, orig_price)
            )
            
            # Log initial stock as purchase transaction
            if stock > 0:
                var_id = cursor.lastrowid
                cursor.execute(
                    "INSERT INTO transactions (variant_id, type, quantity, purchase_price, selling_price) VALUES (?, 'purchase', ?, ?, ?)",
                    (var_id, stock, p_price, s_price)
                )
                
        conn.commit()
        
    return jsonify({"success": True, "product_id": product_id})

@app.route('/api/variants/<int:variant_id>/stock', methods=['POST'])
def update_stock(variant_id):
    if not check_auth():
        return jsonify({"error": "Unauthorized"}), 401
        
    data = request.json or {}
    change = int(data.get('change', 0))
    absolute = data.get('absolute')
    
    with get_db() as conn:
        cursor = conn.cursor()
        
        # Get current variant details
        variant = cursor.execute("SELECT * FROM variants WHERE id = ?", (variant_id,)).fetchone()
        if not variant:
            return jsonify({"error": "Variant hittades inte"}), 404
            
        old_stock = variant['stock']
        new_stock = old_stock
        
        if absolute is not None:
            new_stock = max(0, int(absolute))
            change = new_stock - old_stock
        else:
            new_stock = max(0, old_stock + change)
            
        cursor.execute("UPDATE variants SET stock = ? WHERE id = ?", (new_stock, variant_id))
        
        # Log Transaction
        if change < 0:
            # Sales transaction
            cursor.execute(
                "INSERT INTO transactions (variant_id, type, quantity, purchase_price, selling_price) VALUES (?, 'sale', ?, ?, ?)",
                (variant_id, abs(change), variant['purchase_price'], variant['selling_price'])
            )
        elif change > 0:
            # Restock / Purchase transaction
            cursor.execute(
                "INSERT INTO transactions (variant_id, type, quantity, purchase_price, selling_price) VALUES (?, 'purchase', ?, ?, ?)",
                (variant_id, change, variant['purchase_price'], variant['selling_price'])
            )
            
        conn.commit()
        return jsonify({"success": True, "new_stock": new_stock})

@app.route('/api/pos/checkout', methods=['POST'])
def pos_checkout():
    if not check_auth():
        return jsonify({"error": "Unauthorized"}), 401
        
    data = request.json or {}
    items = data.get('items', [])
    
    if not items:
        return jsonify({"error": "Varukorgen är tom"}), 400
        
    with get_db() as conn:
        cursor = conn.cursor()
        
        # Verify stock levels for all items first
        for item in items:
            var_id = int(item['variantId'])
            qty = int(item['quantity'])
            
            variant = cursor.execute("SELECT stock, name FROM variants v JOIN products p ON v.product_id = p.id WHERE v.id = ?", (var_id,)).fetchone()
            if not variant:
                return jsonify({"error": "Sko hittades inte"}), 404
            if variant['stock'] < qty:
                return jsonify({"error": f"Lagersaldo otillräckligt för {variant['name']}."}), 400
                
        # Perform updates
        for item in items:
            var_id = int(item['variantId'])
            qty = int(item['quantity'])
            
            variant = cursor.execute("SELECT purchase_price, selling_price, stock FROM variants WHERE id = ?", (var_id,)).fetchone()
            new_stock = max(0, variant['stock'] - qty)
            
            # Use the actual selling_price from the request if provided (order-level discount override)
            # This ensures economics tracks what the customer actually paid
            actual_selling_price = float(item.get('selling_price', variant['selling_price']))
            
            cursor.execute("UPDATE variants SET stock = ? WHERE id = ?", (new_stock, var_id))
            cursor.execute(
                "INSERT INTO transactions (variant_id, type, quantity, purchase_price, selling_price) VALUES (?, 'sale', ?, ?, ?)",
                (var_id, qty, variant['purchase_price'], actual_selling_price)
            )
            
        conn.commit()
        
    return jsonify({"success": True, "message": "Köp registrerat framgångsrikt!"})

@app.route('/api/variants/<int:variant_id>', methods=['PUT'])
def edit_variant_details(variant_id):
    if not check_auth():
        return jsonify({"error": "Unauthorized"}), 401
        
    data = request.json or {}
    purchase_price = float(data.get('purchase_price', 0.0))
    selling_price = float(data.get('selling_price', 0.0))
    original_price = float(data.get('original_price') or data.get('selling_price') or 0.0)
    size = data.get('size', '').strip()
    color = data.get('color', '').strip()
    
    with get_db() as conn:
        conn.execute(
            '''
            UPDATE variants 
            SET purchase_price = ?, selling_price = ?, original_price = ?, size = ?, color = ?
            WHERE id = ?
            ''',
            (purchase_price, selling_price, original_price, size, color, variant_id)
        )
        conn.commit()
        
    return jsonify({"success": True})

@app.route('/api/variants/<int:variant_id>', methods=['DELETE'])
def delete_variant(variant_id):
    if not check_auth():
        return jsonify({"error": "Unauthorized"}), 401
        
    with get_db() as conn:
        conn.execute("DELETE FROM variants WHERE id = ?", (variant_id,))
        conn.commit()
    return jsonify({"success": True})

@app.route('/api/products/<int:product_id>', methods=['DELETE'])
def delete_product(product_id):
    if not check_auth():
        return jsonify({"error": "Unauthorized"}), 401
        
    with get_db() as conn:
        conn.execute("DELETE FROM products WHERE id = ?", (product_id,))
        conn.execute("DELETE FROM variants WHERE product_id = ?", (product_id,))
        conn.commit()
    return jsonify({"success": True})

@app.route('/api/products/<int:product_id>', methods=['PUT'])
def edit_product_api(product_id):
    if not check_auth():
        return jsonify({"error": "Unauthorized"}), 401
        
    data = request.json or {}
    name = data.get('name')
    category = data.get('category', 'Skor')
    description = data.get('description', '')
    variants = data.get('variants', [])
    
    if not name:
        return jsonify({"error": "Produktnamn saknas"}), 400
        
    with get_db() as conn:
        cursor = conn.cursor()
        
        # Check if product exists
        product = cursor.execute("SELECT * FROM products WHERE id = ?", (product_id,)).fetchone()
        if not product:
            return jsonify({"error": "Produkten hittades inte"}), 404
            
        # Update product metadata
        cursor.execute(
            "UPDATE products SET name = ?, category = ?, description = ? WHERE id = ?",
            (name, category, description, product_id)
        )
        
        # Get existing variants of this product
        existing_rows = cursor.execute("SELECT id FROM variants WHERE product_id = ?", (product_id,)).fetchall()
        existing_ids = {row['id'] for row in existing_rows}
        processed_ids = set()
        
        for v in variants:
            v_id = v.get('id')
            size = v.get('size', '')
            color = v.get('color', '')
            stock = int(v.get('stock', 0))
            p_price = float(v.get('purchase_price', 0.0))
            s_price = float(v.get('selling_price', 0.0))
            orig_price = float(v.get('original_price') or v.get('selling_price') or 0.0)
            sku = v.get('sku')
            
            if not sku:
                clean_name = re.sub(r'[^a-zA-Z0-9]', '', name)[:4].upper()
                clean_color = re.sub(r'[^a-zA-Z0-9]', '', color)[:3].upper() if color else "UNI"
                clean_size = re.sub(r'[^a-zA-Z0-9]', '', size) if size else "U"
                timestamp = datetime.now().strftime("%f")[-3:]
                sku = f"LGR-{clean_name}-{clean_size}-{clean_color}-{timestamp}"
                
            if v_id and int(v_id) in existing_ids:
                v_id = int(v_id)
                processed_ids.add(v_id)
                # Check current stock to log an adjustment if changed
                old_stock_row = cursor.execute("SELECT stock FROM variants WHERE id = ?", (v_id,)).fetchone()
                old_stock = old_stock_row['stock'] if old_stock_row else 0
                
                # Update existing variant
                cursor.execute(
                    "UPDATE variants SET sku = ?, stock = ?, size = ?, color = ?, purchase_price = ?, selling_price = ?, original_price = ? WHERE id = ?",
                    (sku, stock, size, color, p_price, s_price, orig_price, v_id)
                )
                
                # Log adjustment transaction if stock changed
                if stock != old_stock:
                    diff = stock - old_stock
                    cursor.execute(
                        "INSERT INTO transactions (variant_id, type, quantity, purchase_price, selling_price) VALUES (?, 'adjustment', ?, ?, ?)",
                        (v_id, diff, p_price, s_price)
                    )
            else:
                # Insert new variant
                cursor.execute(
                    "INSERT INTO variants (product_id, sku, stock, size, color, purchase_price, selling_price, original_price) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
                    (product_id, sku, stock, size, color, p_price, s_price, orig_price)
                )
                new_var_id = cursor.lastrowid
                
                # Log initial stock as purchase transaction
                if stock > 0:
                    cursor.execute(
                        "INSERT INTO transactions (variant_id, type, quantity, purchase_price, selling_price) VALUES (?, 'purchase', ?, ?, ?)",
                        (new_var_id, stock, p_price, s_price)
                    )
                    
        # Delete variants that were removed in the edit modal
        removed_ids = existing_ids - processed_ids
        for r_id in removed_ids:
            cursor.execute("DELETE FROM variants WHERE id = ?", (r_id,))
            
        conn.commit()
        
    return jsonify({"success": True})

# --- PUBLIC CATALOG AND RESERVATIONS API ---
@app.route('/api/public/products', methods=['GET'])
def get_public_products():
    with get_db() as conn:
        # Fetch all products
        products = conn.execute("SELECT * FROM products ORDER BY id DESC").fetchall()
        result = []
        for p in products:
            p_dict = dict(p)
            # Fetch variants that have stock > 0 (only bookable variants)
            variants = conn.execute(
                "SELECT id, size, color, stock, selling_price, original_price, sku FROM variants WHERE product_id = ? AND stock > 0 ORDER BY size, color", 
                (p['id'],)
            ).fetchall()
            
            # Only include the product if it has at least one active variant with stock > 0
            if variants:
                p_dict['variants'] = [dict(v) for v in variants]
                result.append(p_dict)
                
        return jsonify(result)

@app.route('/api/public/bookings', methods=['POST'])
def create_booking_api():
    data = request.json or {}
    variant_id = data.get('variant_id')
    first_name = data.get('first_name', '').strip()
    last_name = data.get('last_name', '').strip()
    phone = data.get('phone', '').strip()
    
    if not variant_id or not first_name or not last_name or not phone:
        return jsonify({"error": "Alla fält (variant, namn, efternamn, telefon) måste fyllas i"}), 400
        
    with get_db() as conn:
        cursor = conn.cursor()
        
        # Check if the variant exists and has stock > 0
        variant = cursor.execute("SELECT * FROM variants WHERE id = ?", (variant_id,)).fetchone()
        if not variant:
            return jsonify({"error": "Den valda storleken/skon hittades inte"}), 404
            
        if variant['stock'] <= 0:
            return jsonify({"error": "Den valda storleken är tyvärr slut i lager för tillfället"}), 400
            
        # Insert booking
        cursor.execute(
            "INSERT INTO bookings (variant_id, customer_first_name, customer_last_name, customer_phone, status) VALUES (?, ?, ?, ?, 'pending')",
            (variant_id, first_name, last_name, phone)
        )
        
        # Decrement variant stock by 1
        cursor.execute("UPDATE variants SET stock = stock - 1 WHERE id = ?", (variant_id,))
        
        conn.commit()
        
    return jsonify({"success": True})

# --- ADMIN BOOKINGS MANAGEMENT ---
@app.route('/api/bookings', methods=['GET'])
def get_bookings_api():
    if not check_auth():
        return jsonify({"error": "Unauthorized"}), 401
        
    with get_db() as conn:
        # Join bookings, variants, and products to return rich info for admin
        bookings = conn.execute('''
            SELECT 
                b.id, b.customer_first_name, b.customer_last_name, b.customer_phone, b.status, b.created_at,
                v.size, v.color, v.sku, v.selling_price, v.purchase_price,
                p.name AS product_name, p.category AS product_category
            FROM bookings b
            JOIN variants v ON b.variant_id = v.id
            JOIN products p ON v.product_id = p.id
            ORDER BY b.id DESC
        ''').fetchall()
        
        return jsonify([dict(b) for b in bookings])

@app.route('/api/bookings/<int:booking_id>/confirm', methods=['POST'])
def confirm_booking_api(booking_id):
    if not check_auth():
        return jsonify({"error": "Unauthorized"}), 401
        
    with get_db() as conn:
        cursor = conn.cursor()
        
        # Check booking
        booking = cursor.execute("SELECT * FROM bookings WHERE id = ?", (booking_id,)).fetchone()
        if not booking:
            return jsonify({"error": "Bokningen hittades inte"}), 404
            
        if booking['status'] not in ('pending', 'reserved'):
            return jsonify({"error": f"Bokningen kan inte godkännas eftersom den har status: {booking['status']}"}), 400
            
        # Get variant details for transaction
        variant = cursor.execute("SELECT * FROM variants WHERE id = ?", (booking['variant_id'],)).fetchone()
        if not variant:
            return jsonify({"error": "Tillhörande variant hittades inte"}), 404
            
        # Update booking status to confirmed
        cursor.execute("UPDATE bookings SET status = 'confirmed' WHERE id = ?", (booking_id,))
        
        # Register sale transaction
        cursor.execute(
            "INSERT INTO transactions (variant_id, type, quantity, purchase_price, selling_price) VALUES (?, 'sale', 1, ?, ?)",
            (booking['variant_id'], variant['purchase_price'], variant['selling_price'])
        )
        
        conn.commit()
        
    return jsonify({"success": True})

@app.route('/api/bookings/<int:booking_id>/cancel', methods=['POST'])
def cancel_booking_api(booking_id):
    if not check_auth():
        return jsonify({"error": "Unauthorized"}), 401
        
    with get_db() as conn:
        cursor = conn.cursor()
        
        # Check booking
        booking = cursor.execute("SELECT * FROM bookings WHERE id = ?", (booking_id,)).fetchone()
        if not booking:
            return jsonify({"error": "Bokningen hittades inte"}), 404
            
        if booking['status'] not in ('pending', 'reserved'):
            return jsonify({"error": f"Bokningen kan inte avbrytas eftersom den har status: {booking['status']}"}), 400
            
        # Update booking status to cancelled
        cursor.execute("UPDATE bookings SET status = 'cancelled' WHERE id = ?", (booking_id,))
        
        # Increment variant stock back by 1
        cursor.execute("UPDATE variants SET stock = stock + 1 WHERE id = ?", (booking['variant_id'],))
        
        conn.commit()
        
    return jsonify({"success": True})

@app.route('/api/bookings/<int:booking_id>/reserve', methods=['POST'])
def reserve_booking_api(booking_id):
    if not check_auth():
        return jsonify({"error": "Unauthorized"}), 401
        
    with get_db() as conn:
        cursor = conn.cursor()
        
        # Check booking
        booking = cursor.execute("SELECT * FROM bookings WHERE id = ?", (booking_id,)).fetchone()
        if not booking:
            return jsonify({"error": "Bokningen hittades inte"}), 404
            
        if booking['status'] != 'pending':
            return jsonify({"error": f"Bokningen kan inte markeras som reserverad eftersom den har status: {booking['status']}"}), 400
            
        # Update booking status to reserved
        cursor.execute("UPDATE bookings SET status = 'reserved' WHERE id = ?", (booking_id,))
        
        conn.commit()
        
    return jsonify({"success": True})

@app.route('/api/scan', methods=['POST'])
def scan_barcode():
    if not check_auth():
        return jsonify({"error": "Unauthorized"}), 401
        
    data = request.json or {}
    sku = data.get('sku', '').strip()
    
    if not sku:
        return jsonify({"error": "Ingen kod skannad"}), 400
        
    with get_db() as conn:
        variant = conn.execute(
            '''
            SELECT v.*, p.name as product_name, p.category as product_category 
            FROM variants v
            JOIN products p ON v.product_id = p.id
            WHERE v.sku = ?
            ''',
            (sku,)
        ).fetchone()
        
        if variant:
            return jsonify({"success": True, "found": True, "variant": dict(variant)})
            
    return jsonify({"success": True, "found": False, "message": f"Koden '{sku}' hittades inte i lagret."})

# --- FINANCIAL ANALYTICS API ---
@app.route('/api/analytics', methods=['GET'])
def get_analytics():
    if not check_auth():
        return jsonify({"error": "Unauthorized"}), 401
        
    with get_db() as conn:
        cursor = conn.cursor()
        
        # Get all distinct categories
        cursor.execute("SELECT DISTINCT category FROM products")
        categories_list = [row['category'] for row in cursor.fetchall()]
        
        category_costs = {}
        category_investments = {}
        for cat in categories_list:
            # Fetch investment from settings for this category
            cursor.execute("SELECT value FROM settings WHERE key = ?", (f"investment_{cat}",))
            setting_inv_row = cursor.fetchone()
            investment = float(setting_inv_row[0]) if setting_inv_row and setting_inv_row[0] else 0.0
            
            # If no investment is set in settings, fallback to purchase transactions
            if investment <= 0:
                inv_row = cursor.execute('''
                    SELECT SUM(t.quantity * t.purchase_price) 
                    FROM transactions t
                    JOIN variants v ON t.variant_id = v.id
                    JOIN products p ON v.product_id = p.id
                    WHERE p.category = ? AND t.type = 'purchase'
                ''', (cat,)).fetchone()
                investment = inv_row[0] if inv_row and inv_row[0] else 0.0
            
            category_investments[cat] = investment
            
            # Sum current stock count
            cursor.execute('''
                SELECT SUM(v.stock) 
                FROM variants v 
                JOIN products p ON v.product_id = p.id 
                WHERE p.category = ?
            ''', (cat,))
            stock_row = cursor.fetchone()
            current_stock = stock_row[0] if stock_row and stock_row[0] else 0
            
            # Sum sold count
            cursor.execute('''
                SELECT SUM(t.quantity) 
                FROM transactions t 
                JOIN variants v ON t.variant_id = v.id 
                JOIN products p ON v.product_id = p.id 
                WHERE p.category = ? AND t.type = 'sale'
            ''', (cat,))
            sold_row = cursor.fetchone()
            sold_count = sold_row[0] if sold_row and sold_row[0] else 0
            
            total_shoes = current_stock + sold_count
            if total_shoes > 0:
                category_costs[cat] = investment / total_shoes
            else:
                category_costs[cat] = 0.0

        # 1. Total Stock Value (Genomsnittlig inköpskostnad för nuvarande lager)
        cursor.execute('''
            SELECT v.stock, p.category 
            FROM variants v
            JOIN products p ON v.product_id = p.id
        ''')
        variants_rows = cursor.fetchall()
        total_stock_cost = sum(row['stock'] * category_costs.get(row['category'], 0.0) for row in variants_rows)
        
        # 2. Total Potential Sales Value (Försäljningsvärde för nuvarande lager)
        potential_sales_row = cursor.execute("SELECT SUM(stock * selling_price) FROM variants").fetchone()
        potential_sales_val = potential_sales_row[0] if potential_sales_row[0] else 0.0
        
        # 3. Potential Profit in Stock (Potentiell vinst i nuvarande lager)
        potential_profit = potential_sales_val - total_stock_cost
        
        # 4. Total Package Investments
        total_investment = sum(category_investments.values())
        
        # 5. Total Revenues (Faktiska historiska försäljningar)
        total_rev_row = cursor.execute("SELECT SUM(quantity * selling_price) FROM transactions WHERE type = 'sale'").fetchone()
        total_revenue = total_rev_row[0] if total_rev_row[0] else 0.0
        
        # 6. Actual Net Cash Profit (Likviditet: Försäljningar - Inköpskostnad)
        net_profit = total_revenue - total_investment
        
        # --- SALES METRICS PER PERIOD ---
        periods = {
            'today': "created_at >= CURRENT_DATE",
            'week': "created_at >= date_trunc('week', CURRENT_DATE)::date", # start of current week (Monday)
            'month': "created_at >= date_trunc('month', CURRENT_DATE)::date" # start of current month
        }
        
        financials = {}
        for period_name, condition in periods.items():
            # Get revenue for period
            rev_row = cursor.execute(f'''
                SELECT SUM(quantity * selling_price) as revenue
                FROM transactions
                WHERE type = 'sale' AND {condition}
            ''').fetchone()
            rev = rev_row['revenue'] if rev_row['revenue'] else 0.0
            
            # Calculate cost dynamically based on each item's average cost per shoe
            cursor.execute(f'''
                SELECT t.quantity, p.category
                FROM transactions t
                JOIN variants v ON t.variant_id = v.id
                JOIN products p ON v.product_id = p.id
                WHERE t.type = 'sale' AND {condition.replace('created_at', 't.created_at')}
            ''')
            period_sales = cursor.fetchall()
            cst = sum(sale['quantity'] * category_costs.get(sale['category'], 0.0) for sale in period_sales)
            
            prof = rev - cst
            margin = (prof / rev * 100) if rev > 0 else 0.0
            
            financials[period_name] = {
                "revenue": rev,
                "cost": cst,
                "profit": prof,
                "margin": margin
            }
            
        # Recent Sales History
        recent_sales_query = '''
            SELECT t.quantity, t.selling_price, t.purchase_price, t.created_at,
                   v.size, v.color, p.name as model_name, p.category
            FROM transactions t
            JOIN variants v ON t.variant_id = v.id
            JOIN products p ON v.product_id = p.id
            WHERE t.type = 'sale'
            ORDER BY t.id DESC
            LIMIT 15
        '''
        sales_history_rows = cursor.execute(recent_sales_query).fetchall()
        sales_history = []
        for s in sales_history_rows:
            s_dict = dict(s)
            # Override purchase_price with category-based average cost per shoe
            s_dict['purchase_price'] = category_costs.get(s_dict['category'], 0.0)
            sales_history.append(s_dict)
            
        # 7. Project Summaries (Breakdown per Category/Project)
        project_summaries = []
        for cat_name in categories_list:
            cat_cost_per_shoe = category_costs.get(cat_name, 0.0)
            
            # Stock metrics for this project
            stock_row = cursor.execute('''
                SELECT SUM(v.stock * v.selling_price) as potential
                FROM variants v
                JOIN products p ON v.product_id = p.id
                WHERE p.category = ?
            ''', (cat_name,)).fetchone()
            cat_stock_potential = stock_row['potential'] if stock_row['potential'] else 0.0
            
            # Total Stock Count
            count_row = cursor.execute('''
                SELECT SUM(v.stock) FROM variants v JOIN products p ON v.product_id = p.id WHERE p.category = ?
            ''', (cat_name,)).fetchone()
            cat_stock_count = count_row[0] if count_row[0] else 0
            
            # Dynamically calculate stock cost
            cat_stock_cost = cat_stock_count * cat_cost_per_shoe
            
            # Investment for this project
            cat_investment = category_investments.get(cat_name, 0.0)
            
            # Revenue for this project
            rev_row = cursor.execute('''
                SELECT SUM(t.quantity * t.selling_price) 
                FROM transactions t
                JOIN variants v ON t.variant_id = v.id
                JOIN products p ON v.product_id = p.id
                WHERE p.category = ? AND t.type = 'sale'
            ''', (cat_name,)).fetchone()
            cat_revenue = rev_row[0] if rev_row[0] else 0.0
            
            cat_net = cat_revenue - cat_investment
            cat_be_pct = (cat_revenue / cat_investment * 100) if cat_investment > 0 else 0.0
            
            project_summaries.append({
                "name": cat_name,
                "stock_count": cat_stock_count,
                "stock_cost": cat_stock_cost,
                "potential_sales": cat_stock_potential,
                "total_investment": cat_investment,
                "total_revenue": cat_revenue,
                "net_profit": cat_net,
                "be_percentage": cat_be_pct,
                "cost_per_shoe": cat_cost_per_shoe
            })
            
        is_lump_sum = True
        adj_total_cost = total_stock_cost
        adj_potential_profit = potential_profit

        return jsonify({
            "is_lump_sum": is_lump_sum,
            "stock_metrics": {
                "total_cost": adj_total_cost,
                "potential_sales": potential_sales_val,
                "potential_profit": adj_potential_profit
            },
            "break_even": {
                "total_investment": total_investment,
                "total_revenue": total_revenue,
                "net_profit": net_profit
            },
            "financials": financials,
            "recent_sales": sales_history,
            "project_summaries": project_summaries
        })

# --- QR CODE GENERATOR ---
@app.route('/api/generate-qr/<int:variant_id>')
def generate_qr(variant_id):
    with get_db() as conn:
        variant = conn.execute(
            '''
            SELECT v.sku, p.name, v.size, v.color 
            FROM variants v 
            JOIN products p ON v.product_id = p.id 
            WHERE v.id = ?
            ''', 
            (variant_id,)
        ).fetchone()
        
    if not variant:
        return "Variant not found", 404
        
    qr = qrcode.QRCode(version=1, box_size=10, border=2)
    qr.add_data(variant['sku'])
    qr.make(fit=True)
    img = qr.make_image(fill_color="black", back_color="white")
    
    img_buffer = BytesIO()
    img.save(img_buffer, 'PNG')
    img_buffer.seek(0)
    return send_file(img_buffer, mimetype='image/png')

# --- EXCEL IMPORT PARSER ---
@app.route('/api/import-excel', methods=['POST'])
def parse_excel():
    if not check_auth():
        return jsonify({"error": "Unauthorized"}), 401
        
    if 'file' not in request.files:
        return jsonify({"error": "Ingen fil uppladdad"}), 400
        
    file = request.files['file']
    if file.filename == '':
        return jsonify({"error": "Ingen fil vald"}), 400
        
    try:
        df = pd.read_excel(file)
        cols = {str(c).lower().strip(): c for c in df.columns}
        
        cat_col = next((cols[c] for c in cols if 'skoart' in c or 'kategori' in c or 'typ' in c), df.columns[0])
        model_col = next((cols[c] for c in cols if 'modell' in c or 'namn' in c), df.columns[1])
        size_col = next((cols[c] for c in cols if 'storlek' in c or 'storlekar' in c), df.columns[2])
        color_col = next((cols[c] for c in cols if 'färg' in c or 'färger' in c), df.columns[3])
        stock_col = next((cols[c] for c in cols if 'antal' in c or 'lager' in c), df.columns[4])
        
        proposals = []
        
        for idx, row in df.iterrows():
            if pd.isna(row[model_col]) or str(row[model_col]).strip() == '' or '240' in str(row[model_col]) or 'Summa' in str(row[model_col]):
                continue
                
            category = str(row[cat_col]).strip() if not pd.isna(row[cat_col]) else 'Skor'
            model = str(row[model_col]).strip()
            size_str = str(row[size_col]).strip() if not pd.isna(row[size_col]) else ''
            color_str = str(row[color_col]).strip() if not pd.isna(row[color_col]) else 'Svart'
            total_stock = int(row[stock_col]) if not pd.isna(row[stock_col]) else 0
            
            sizes_parsed = []
            explicit_matches = re.findall(r'(\d+)\s*-\s*(\d+)\s*(?:st)?', size_str)
            
            colors = [c.strip() for c in re.split(r'[,/]', color_str) if c.strip()]
            if not colors:
                colors = ['Svart']
                
            if explicit_matches:
                matched_sum = 0
                for size, qty in explicit_matches:
                    q = int(qty)
                    sizes_parsed.append({"size": size, "qty": q})
                    matched_sum += q
                
                cleaned_size_str = size_str
                for size, qty in explicit_matches:
                    cleaned_size_str = re.sub(rf'{size}\s*-\s*{qty}\s*(?:st)?\.?', '', cleaned_size_str)
                
                remaining_sizes = re.findall(r'\b(\d+)\b', cleaned_size_str)
                if remaining_sizes:
                    leftover_qty = max(0, total_stock - matched_sum)
                    qty_per_leftover = leftover_qty // len(remaining_sizes)
                    for r_sz in remaining_sizes:
                        sizes_parsed.append({"size": r_sz, "qty": qty_per_leftover})
            else:
                sizes = [s.strip() for s in re.split(r'[,/\s]+', size_str) if s.strip()]
                if not sizes:
                    sizes = ['Universal']
                
                qty_per_size = total_stock // len(sizes)
                remainder = total_stock % len(sizes)
                
                for i, sz in enumerate(sizes):
                    q = qty_per_size + (1 if i < remainder else 0)
                    sizes_parsed.append({"size": sz, "qty": q})
            
            row_variants = []
            
            if len(sizes_parsed) == 1 and len(colors) == 1:
                row_variants.append({
                    "size": sizes_parsed[0]['size'],
                    "color": colors[0],
                    "stock": total_stock,
                    "confidence": "high"
                })
            else:
                for i, sz_info in enumerate(sizes_parsed):
                    col = colors[i] if i < len(colors) else colors[0]
                    row_variants.append({
                        "size": sz_info['size'],
                        "color": col,
                        "stock": sz_info['qty'],
                        "confidence": "medium" if len(colors) == 1 else "needs_verification"
                    })
            
            proposals.append({
                "row_index": int(idx + 2),
                "category": category,
                "model": model,
                "original_sizes": size_str,
                "original_colors": color_str,
                "total_stock": total_stock,
                "variants": row_variants,
                "available_colors": colors,
                "needs_verification": any(v['confidence'] == 'needs_verification' for v in row_variants)
            })
            
        return jsonify({"success": True, "proposals": proposals})
        
    except Exception as e:
        return jsonify({"success": False, "error": f"Det gick inte att läsa Excel-filen: {str(e)}"}), 500

@app.route('/api/confirm-import', methods=['POST'])
def confirm_import():
    if not check_auth():
        return jsonify({"error": "Unauthorized"}), 401
        
    data = request.json or {}
    items = data.get('items', [])
    
    if not items:
        return jsonify({"error": "Ingen data att spara"}), 400
        
    try:
        with get_db() as conn:
            cursor = conn.cursor()
            
            for item in items:
                category = item.get('category', 'Skor')
                model = item.get('model')
                variants = item.get('variants', [])
                
                if not model:
                    continue
                
                cursor.execute(
                    "SELECT id FROM products WHERE name = ? AND category = ?", 
                    (model, category)
                )
                prod_row = cursor.fetchone()
                
                if prod_row:
                    product_id = prod_row[0]
                else:
                    cursor.execute(
                        "INSERT INTO products (name, category, description) VALUES (?, ?, ?)",
                        (model, category, "")
                    )
                    product_id = cursor.lastrowid
                    
                for v in variants:
                    size = str(v.get('size', '')).strip()
                    color = str(v.get('color', '')).strip()
                    stock = int(v.get('stock', 0))
                    p_price = float(v.get('purchase_price', 0.0))
                    s_price = float(v.get('selling_price', 0.0))
                    
                    clean_name = re.sub(r'[^a-zA-Z0-9]', '', model)[:4].upper()
                    clean_color = re.sub(r'[^a-zA-Z0-9]', '', color)[:3].upper() if color else "UNI"
                    clean_size = re.sub(r'[^a-zA-Z0-9]', '', size) if size else "U"
                    timestamp = datetime.now().strftime("%f")[-3:]
                    sku = f"LGR-{clean_name}-{clean_size}-{clean_color}-{timestamp}"
                    
                    # Check if exact variant exists
                    cursor.execute(
                        "SELECT id FROM variants WHERE product_id = ? AND size = ? AND color = ?",
                        (product_id, size, color)
                    )
                    var_row = cursor.fetchone()
                    
                    if var_row:
                        # Update stock & pricing
                        cursor.execute(
                            "UPDATE variants SET stock = stock + ?, purchase_price = ?, selling_price = ? WHERE id = ?",
                            (stock, p_price, s_price, var_row[0])
                        )
                        var_id = var_row[0]
                    else:
                        # Insert variant
                        cursor.execute(
                            "INSERT INTO variants (product_id, sku, stock, size, color, purchase_price, selling_price) VALUES (?, ?, ?, ?, ?, ?, ?)",
                            (product_id, sku, stock, size, color, p_price, s_price)
                        )
                        var_id = cursor.lastrowid
                        
                    # Log Transaction
                    if stock > 0:
                        cursor.execute(
                            "INSERT INTO transactions (variant_id, type, quantity, purchase_price, selling_price) VALUES (?, 'purchase', ?, ?, ?)",
                            (var_id, stock, p_price, s_price)
                        )
            conn.commit()
            
        return jsonify({"success": True})
        
    except Exception as e:
        return jsonify({"success": False, "error": f"Kunde inte spara lagret: {str(e)}"}), 500

@app.route('/api/settings/password', methods=['POST'])
def change_password():
    is_local = request.remote_addr in ('127.0.0.1', 'localhost', '::1')
    if not is_local and not check_auth():
        return jsonify({"error": "Unauthorized"}), 401
        
    data = request.json or {}
    new_pw = data.get('password', '').strip()
    
    if len(new_pw) < 4:
        return jsonify({"error": "Lösenordet måste vara minst 4 tecken långt."}), 400
        
    with get_db() as conn:
        conn.execute(
            "INSERT OR REPLACE INTO settings (key, value) VALUES ('password', ?)",
            (new_pw,)
        )
        conn.commit()
        
    return jsonify({"success": True, "message": "Lösenordet har uppdaterats."})

@app.route('/api/settings/profile', methods=['POST'])
def update_profile():
    if not check_auth():
        return jsonify({"error": "Unauthorized"}), 401
        
    data = request.json or {}
    email = data.get('email', '').strip().lower()
    password = data.get('password', '').strip()
    user_id = session.get('user_id')
    
    if not email:
        return jsonify({"error": "E-postadressen får inte vara tom."}), 400
        
    if '@' not in email or '.' not in email:
        return jsonify({"error": "Ogiltig e-postadress."}), 400
        
    try:
        with get_db() as conn:
            # Check if email is already taken by another user
            existing = conn.execute("SELECT id FROM users WHERE LOWER(email) = ? AND id != ?", (email, user_id)).fetchone()
            if existing:
                return jsonify({"error": "E-postadressen används redan av en annan användare."}), 400
                
            if password:
                if len(password) < 4:
                    return jsonify({"error": "Lösenordet måste vara minst 4 tecken långt."}), 400
                conn.execute(
                    "UPDATE users SET email = ?, password = ? WHERE id = ?",
                    (email, generate_password_hash(password), user_id)
                )
            else:
                conn.execute(
                    "UPDATE users SET email = ? WHERE id = ?",
                    (email, user_id)
                )
            conn.commit()
            
        # Update session info
        session['user_email'] = email
        
        return jsonify({"success": True, "message": "Dina profilinställningar har sparats!"})
        
    except Exception as e:
        return jsonify({"error": f"Kunde inte uppdatera profil: {str(e)}"}), 500

# --- USER & ROLE MANAGEMENT API ENDPOINTS (ADMIN ONLY) ---
@app.route('/api/users', methods=['GET'])
def get_users():
    if not check_admin():
        return jsonify({"error": "Forbidden"}), 403
    with get_db() as conn:
        users = conn.execute("SELECT id, email, role, allowed_projects FROM users ORDER BY id ASC").fetchall()
        return jsonify([dict(u) for u in users])

@app.route('/api/users', methods=['POST'])
def create_user():
    if not check_admin():
        return jsonify({"error": "Forbidden"}), 403
    data = request.json or {}
    email = data.get('email', '').strip().lower()
    password = data.get('password', '').strip()
    role = data.get('role', 'user').strip()
    allowed_projects = data.get('allowed_projects', 'all').strip()
    
    if not email or not password:
        return jsonify({"error": "E-postadress och lösenord krävs."}), 400
        
    try:
        with get_db() as conn:
            conn.execute('''
                INSERT INTO users (email, password, role, allowed_projects)
                VALUES (?, ?, ?, ?)
            ''', (email, generate_password_hash(password), role, allowed_projects))
            conn.commit()
        return jsonify({"success": True})
    except sqlite3.IntegrityError:
        return jsonify({"error": "E-postadressen är redan registrerad."}), 400

@app.route('/api/users/<int:user_id>', methods=['PUT'])
def update_user(user_id):
    if not check_admin():
        return jsonify({"error": "Forbidden"}), 403
    data = request.json or {}
    password = data.get('password', '').strip()
    role = data.get('role', 'user').strip()
    allowed_projects = data.get('allowed_projects', 'all').strip()
    
    with get_db() as conn:
        # Prevent editing the master account apersson508@gmail.com
        target_user = conn.execute("SELECT email FROM users WHERE id = ?", (user_id,)).fetchone()
        target_email = target_user['email'].strip().lower() if target_user else ''
        if user_id == 1 or target_email in ('apersson508@gmail.com', 'apersson508@gmai..com'):
            return jsonify({"error": "Detta huvudkonto (apersson508@gmail.com) kan inte redigeras från användarhanteringen."}), 400

        if password:
            conn.execute('''
                UPDATE users SET password = ?, role = ?, allowed_projects = ? WHERE id = ?
            ''', (generate_password_hash(password), role, allowed_projects, user_id))
        else:
            conn.execute('''
                UPDATE users SET role = ?, allowed_projects = ? WHERE id = ?
            ''', (role, allowed_projects, user_id))
        conn.commit()
    return jsonify({"success": True})

@app.route('/api/users/<int:user_id>', methods=['DELETE'])
def delete_user(user_id):
    if not check_admin():
        return jsonify({"error": "Forbidden"}), 403
        
    with get_db() as conn:
        # Prevent deleting the master account apersson508@gmail.com
        target_user = conn.execute("SELECT email FROM users WHERE id = ?", (user_id,)).fetchone()
        target_email = target_user['email'].strip().lower() if target_user else ''
        if user_id == 1 or target_email in ('apersson508@gmail.com', 'apersson508@gmai..com'):
            return jsonify({"error": "Detta huvudkonto (apersson508@gmail.com) kan inte raderas."}), 400

        # Prevent self deletion
        if target_user and user_id == session.get('user_id'):
            return jsonify({"error": "Du kan inte radera ditt eget inloggade konto."}), 400
            
        conn.execute("DELETE FROM users WHERE id = ?", (user_id,))
        conn.commit()
    return jsonify({"success": True})

# --- PROJECTS LIST & CREATION ENDPOINTS ---
@app.route('/api/projects', methods=['GET'])
def get_projects_list():
    if not check_auth():
        return jsonify({"error": "Unauthorized"}), 401
    with get_db() as conn:
        categories = conn.execute("SELECT DISTINCT category FROM products WHERE category IS NOT NULL").fetchall()
        projects = [c[0].strip() for c in categories if c[0].strip()]
        return jsonify(projects)

@app.route('/api/projects', methods=['POST'])
def create_project():
    if not check_admin():
        return jsonify({"error": "Forbidden"}), 403
    data = request.json or {}
    project_name = data.get('name', '').strip()
    if not project_name:
        return jsonify({"error": "Projektnamn kan inte vara tomt."}), 400
        
    # To register a new project without any items, we create a placeholder product in this category
    with get_db() as conn:
        # Check if already exists
        exists = conn.execute("SELECT id FROM products WHERE category = ?", (project_name,)).fetchone()
        if not exists:
            conn.execute(
                "INSERT INTO products (name, category, description) VALUES (?, ?, ?)",
                (f"Startprodukt ({project_name})", project_name, "Placeholder för nyskapat projekt.")
            )
            product_id = conn.execute("SELECT last_insert_rowid()").fetchone()[0]
            # Create a placeholder variant with 0 stock so it behaves nicely
            conn.execute(
                "INSERT INTO variants (product_id, sku, stock, size, color, purchase_price, selling_price) VALUES (?, 'PLACEHOLDER', 0, 'Standard', 'Universal', 0, 0)",
                (product_id,)
            )
            conn.commit()
            
    return jsonify({"success": True})

@app.route('/api/projects', methods=['DELETE'])
def delete_project():
    if not check_admin():
        return jsonify({"error": "Forbidden"}), 403
    data = request.json or {}
    project_name = data.get('name', '').strip()
    if not project_name:
        return jsonify({"error": "Projektnamn kan inte vara tomt."}), 400
    
    with get_db() as conn:
        # 1. Fetch all product IDs in this project category
        product_rows = conn.execute(
            "SELECT id FROM products WHERE category = ?", (project_name,)
        ).fetchall()
        product_ids = [r[0] for r in product_rows]
        
        if product_ids:
            placeholders = ','.join('?' for _ in product_ids)
            
            # 2. Fetch all variant IDs belonging to these products
            variant_rows = conn.execute(
                f"SELECT id FROM variants WHERE product_id IN ({placeholders})",
                product_ids
            ).fetchall()
            variant_ids = [r[0] for r in variant_rows]
            
            if variant_ids:
                v_placeholders = ','.join('?' for _ in variant_ids)
                # 3. Delete transactions linked to these variants
                conn.execute(
                    f"DELETE FROM transactions WHERE variant_id IN ({v_placeholders})",
                    variant_ids
                )
                # 4. Delete bookings linked to these variants
                conn.execute(
                    f"DELETE FROM bookings WHERE variant_id IN ({v_placeholders})",
                    variant_ids
                )
                # 5. Delete variants
                conn.execute(
                    f"DELETE FROM variants WHERE id IN ({v_placeholders})",
                    variant_ids
                )
            
            # 6. Delete the products themselves
            conn.execute(
                f"DELETE FROM products WHERE id IN ({placeholders})",
                product_ids
            )
        
        # 7. Delete project-specific settings (discount + investment)
        conn.execute("DELETE FROM settings WHERE key = ?", (f"discount_{project_name}",))
        conn.execute("DELETE FROM settings WHERE key = ?", (f"investment_{project_name}",))
        
        # 8. Remove this project from any users' allowed_projects list
        users_with_project = conn.execute(
            "SELECT id, allowed_projects FROM users WHERE allowed_projects != 'all'"
        ).fetchall()
        for user in users_with_project:
            projects_list = [p.strip() for p in user['allowed_projects'].split(',') if p.strip()]
            if project_name in projects_list:
                projects_list.remove(project_name)
                new_val = ','.join(projects_list) if projects_list else ''
                conn.execute(
                    "UPDATE users SET allowed_projects = ? WHERE id = ?",
                    (new_val, user['id'])
                )
        
        conn.commit()
    
    return jsonify({"success": True, "message": f"Projektet '{project_name}' har raderats."})

# Printing gorgeous banner at python server startup
print("\n" + "="*60)
print("              LAGERPRO SERVER ÄR IGÅNG!")
print("="*60)
print(" 1. Lokal adress på datorn:   http://localhost:5000")
print(" 2. För att ansluta från mobilen var du än är i världen:")
print("    Öppna ett nytt terminalfönster (PowerShell/CMD) och skriv:")
print("        ngrok http 5000")
print("    Kopiera sedan 'https://xxx.ngrok.app' länken till mobilen.")
print(" Lösenord för fjärranslutning är standard: lager")
print("="*60 + "\n")

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)
