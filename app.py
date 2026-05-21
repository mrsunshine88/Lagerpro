import os
import re
import sys
import subprocess
import sqlite3

# --- AUTOMATIC DEPENDENCY INSTALLER FOR WINDOWS ---
required_modules = ['flask', 'pandas', 'openpyxl', 'qrcode', 'pillow']
for module in required_modules:
    try:
        __import__(module)
    except ImportError:
        print(f"[SYSTEM] Saknat Python-paket upptäckt: {module}. Installerar automatiskt...")
        try:
            subprocess.check_call([sys.executable, "-m", "pip", "install", module])
            print(f"[SYSTEM] Installation av {module} klar!")
        except Exception as e:
            print(f"[FEL] Kunde inte installera {module} automatiskt: {e}")

import pandas as pd
import qrcode
from io import BytesIO
from datetime import datetime
from flask import Flask, request, jsonify, render_template, send_file, session

app = Flask(__name__)
app.secret_key = os.urandom(24)

DB_PATH = os.path.join(os.path.dirname(__file__), 'database.db')
DEFAULT_PASSWORD = "lager"

def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    with get_db() as conn:
        # Create products table
        conn.execute('''
            CREATE TABLE IF NOT EXISTS products (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                category TEXT NOT NULL,
                description TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        ''')
        
        # Create variants table
        conn.execute('''
            CREATE TABLE IF NOT EXISTS variants (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
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
                id INTEGER PRIMARY KEY AUTOINCREMENT,
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
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                email TEXT UNIQUE NOT NULL,
                password TEXT NOT NULL,
                role TEXT NOT NULL DEFAULT 'user', -- 'admin' or 'user'
                allowed_projects TEXT DEFAULT 'all' -- comma-separated list of project names, or 'all'
            )
        ''')
        
        # Seed default admin user (always update to requested admin password)
        conn.execute('''
            INSERT OR REPLACE INTO users (id, email, password, role, allowed_projects)
            VALUES (1, 'apersson508@gmail.com', '020406', 'admin', 'all')
        ''')
        
        # --- DATABASE MIGRATIONS ---
        # Add new price columns if variants table already existed without them
        try:
            conn.execute("ALTER TABLE variants ADD COLUMN purchase_price REAL DEFAULT 0.0")
        except sqlite3.OperationalError:
            pass # Already exists
            
        try:
            conn.execute("ALTER TABLE variants ADD COLUMN selling_price REAL DEFAULT 0.0")
        except sqlite3.OperationalError:
            pass # Already exists
            
        conn.commit()

init_db()

# --- HELPER FUNCTIONS ---
def check_auth():
    if session.get('authenticated') is True:
        return True
    
    # Allow authentication token fallback if needed
    auth_header = request.headers.get('Authorization')
    if auth_header:
        with get_db() as conn:
            user = conn.execute("SELECT * FROM users WHERE password = ?", (auth_header,)).fetchone()
            if user:
                session['authenticated'] = True
                session['user_id'] = user['id']
                session['user_email'] = user['email']
                session['user_role'] = user['role']
                session['allowed_projects'] = user['allowed_projects']
                return True
            
    return False

def check_admin():
    return check_auth() and session.get('user_role') == 'admin'

# --- WEB PAGE ROUTES ---
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
        
    if user and user['password'] == password:
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
        project = request.args.get('project', 'Cinnamonskor')
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
    project = data.get('project', 'Cinnamonskor')
    discount = float(data.get('discount_percent', 0.0))
    
    with get_db() as conn:
        cursor = conn.cursor()
        
        # Save setting
        cursor.execute("INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)", (f"discount_{project}", str(discount)))
        
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
        project = request.args.get('project', 'Cinnamonskor')
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
    project = data.get('project', 'Cinnamonskor')
    investment = float(data.get('investment', 0.0))
    
    with get_db() as conn:
        cursor = conn.cursor()
        # Save setting
        cursor.execute("INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)", (f"investment_{project}", str(investment)))
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
        
        # 1. Total Stock Value (Inköpskostnad för nuvarande lager)
        stock_val_row = cursor.execute("SELECT SUM(stock * purchase_price) FROM variants").fetchone()
        total_stock_cost = stock_val_row[0] if stock_val_row[0] else 0.0
        
        # 2. Total Potential Sales Value (Försäljningsvärde för nuvarande lager)
        potential_sales_row = cursor.execute("SELECT SUM(stock * selling_price) FROM variants").fetchone()
        potential_sales_val = potential_sales_row[0] if potential_sales_row[0] else 0.0
        
        # 3. Potential Profit in Stock (Potentiell vinst i nuvarande lager)
        potential_profit = potential_sales_val - total_stock_cost
        
        # 4. Total Package Investments (Faktiska historiska paketinköp + Klumpsumma investeringar)
        cursor.execute("SELECT value FROM settings WHERE key LIKE 'investment_%'")
        settings_investments = sum(float(row[0]) for row in cursor.fetchall() if row[0])
        
        if settings_investments > 0:
            total_investment = settings_investments
        else:
            total_inv_row = cursor.execute("SELECT SUM(quantity * purchase_price) FROM transactions WHERE type = 'purchase'").fetchone()
            total_investment = total_inv_row[0] if total_inv_row[0] else 0.0
        
        # 5. Total Revenues (Faktiska historiska försäljningar)
        total_rev_row = cursor.execute("SELECT SUM(quantity * selling_price) FROM transactions WHERE type = 'sale'").fetchone()
        total_revenue = total_rev_row[0] if total_rev_row[0] else 0.0
        
        # 6. Actual Net Cash Profit (Likviditet: Försäljningar - Inköpskostnad)
        net_profit = total_revenue - total_investment
        
        # --- SALES METRICS PER PERIOD ---
        # We compute sales (revenue, cost, profit) for Today, This Week, and This Month
        periods = {
            'today': "created_at >= date('now', 'localtime')",
            'week': "created_at >= date('now', 'weekday 0', '-7 days')", # start of current week
            'month': "created_at >= date('now', 'start of month')"
        }
        
        financials = {}
        for period_name, condition in periods.items():
            query = f'''
                SELECT 
                    SUM(quantity * selling_price) as revenue,
                    SUM(quantity * purchase_price) as cost
                FROM transactions 
                WHERE type = 'sale' AND {condition}
            '''
            row = cursor.execute(query).fetchone()
            rev = row['revenue'] if row['revenue'] else 0.0
            cst = row['cost'] if row['cost'] else 0.0
            
            # If lump-sum investment mode and purchase_price=0 on transactions,
            # calculate a proportional cost share: (period_revenue / total_revenue) * total_investment
            if cst == 0.0 and settings_investments > 0 and total_revenue > 0:
                cst = (rev / total_revenue) * settings_investments
            elif cst == 0.0 and settings_investments > 0 and total_revenue == 0:
                cst = 0.0  # No sales yet, nothing to proportion
            
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
        sales_history = cursor.execute(recent_sales_query).fetchall()
        
        # 7. Project Summaries (Breakdown per Category/Project)
        project_summaries = []
        categories_query = "SELECT DISTINCT category FROM products"
        cats = cursor.execute(categories_query).fetchall()
        
        for cat_row in cats:
            cat_name = cat_row['category']
            
            # Stock metrics for this project
            stock_row = cursor.execute('''
                SELECT SUM(v.stock * v.purchase_price) as cost,
                       SUM(v.stock * v.selling_price) as potential
                FROM variants v
                JOIN products p ON v.product_id = p.id
                WHERE p.category = ?
            ''', (cat_name,)).fetchone()
            cat_stock_cost = stock_row['cost'] if stock_row['cost'] else 0.0
            cat_stock_potential = stock_row['potential'] if stock_row['potential'] else 0.0
            
            # Total Stock Count
            count_row = cursor.execute('''
                SELECT SUM(v.stock) FROM variants v JOIN products p ON v.product_id = p.id WHERE p.category = ?
            ''', (cat_name,)).fetchone()
            cat_stock_count = count_row[0] if count_row[0] else 0
            
            # Investment for this project
            setting_inv = cursor.execute("SELECT value FROM settings WHERE key = ?", (f"investment_{cat_name}",)).fetchone()
            if setting_inv and setting_inv[0]:
                cat_investment = float(setting_inv[0])
            else:
                inv_row = cursor.execute('''
                    SELECT SUM(t.quantity * t.purchase_price) 
                    FROM transactions t
                    JOIN variants v ON t.variant_id = v.id
                    JOIN products p ON v.product_id = p.id
                    WHERE p.category = ? AND t.type = 'purchase'
                ''', (cat_name,)).fetchone()
                cat_investment = inv_row[0] if inv_row[0] else 0.0
            
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
                "be_percentage": cat_be_pct
            })
            
        is_lump_sum = (total_stock_cost == 0.0 and total_investment > 0.0)
        adj_total_cost = total_investment if is_lump_sum else total_stock_cost
        adj_potential_profit = (potential_sales_val - max(0.0, total_investment - total_revenue)) if is_lump_sum else potential_profit

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
            "recent_sales": [dict(s) for s in sales_history],
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
            ''', (email, password, role, allowed_projects))
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
        if password:
            conn.execute('''
                UPDATE users SET password = ?, role = ?, allowed_projects = ? WHERE id = ?
            ''', (password, role, allowed_projects, user_id))
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
        # Prevent self deletion
        current_admin = conn.execute("SELECT id FROM users WHERE id = ?", (user_id,)).fetchone()
        if current_admin and user_id == session.get('user_id'):
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
