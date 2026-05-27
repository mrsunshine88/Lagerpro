import psycopg2
from psycopg2.extras import DictCursor

def run_calculation():
    db_url = "postgresql://lager:lager@localhost:5439/lager"
    conn = psycopg2.connect(db_url)
    cur = conn.cursor(cursor_factory=DictCursor)

    try:
        # Get all distinct categories
        cur.execute("SELECT DISTINCT category FROM products")
        categories = [r[0] for r in cur.fetchall() if r[0]]
        print(f"Categories: {categories}")

        category_costs = {}
        category_investments = {}

        for cat in categories:
            # Fetch investment
            cur.execute("SELECT value FROM settings WHERE key = %s", (f"investment_{cat}",))
            row = cur.fetchone()
            investment = float(row[0]) if row and row[0] else 0.0
            category_investments[cat] = investment

            # Current stock
            cur.execute("""
                SELECT SUM(v.stock) 
                FROM variants v
                JOIN products p ON v.product_id = p.id
                WHERE p.category = %s
            """, (cat,))
            current_stock = cur.fetchone()[0] or 0

            # Sold sum
            cur.execute("""
                SELECT SUM(t.quantity) 
                FROM transactions t
                JOIN variants v ON t.variant_id = v.id
                JOIN products p ON v.product_id = p.id
                WHERE p.category = %s AND t.type = 'sale'
            """, (cat,))
            sold_count = cur.fetchone()[0] or 0

            total_shoes = current_stock + sold_count
            cost_per_shoe = investment / total_shoes if total_shoes > 0 else 0.0
            category_costs[cat] = cost_per_shoe

            print(f"Category: '{cat}' | Investment: {investment} | Stock: {current_stock} | Sold: {sold_count} | Total Shoes: {total_shoes} | Cost per shoe: {cost_per_shoe}")

        # Total stock value
        cur.execute("""
            SELECT v.stock, p.category, v.sku, p.name
            FROM variants v
            JOIN products p ON v.product_id = p.id
        """)
        variants = cur.fetchall()
        total_stock_cost = 0.0
        print("\nVariants stock cost breakdown:")
        for v in variants:
            cost_per_shoe = category_costs.get(v['category'], 0.0)
            stock_cost = v['stock'] * cost_per_shoe
            total_stock_cost += stock_cost
            print(f"  SKU: '{v['sku']}' | Product: '{v['name']}' | Stock: {v['stock']} | Cat: '{v['category']}' | Cost/Shoe: {cost_per_shoe} | Stock Cost: {stock_cost}")

        print(f"\nCalculated Total Stock Cost (Bundet Kapital): {total_stock_cost}")

    except Exception as e:
        print(f"Error: {e}")
    finally:
        cur.close()
        conn.close()

if __name__ == "__main__":
    run_calculation()
