import os
import re

def migrate_file(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    # Import
    if "import axios from 'axios';" in content:
        content = content.replace("import axios from 'axios';", "import { supabase } from '../../supabaseClient';")
    if "import axios from 'axios';" in content: # App.tsx is in root src
        content = content.replace("import axios from 'axios';", "import { supabase } from './supabaseClient';")

    # Replace App.tsx fetchProducts
    content = re.sub(
        r'const res = await axios\.get\(`\$\{API_BASE_URL\}/api/products`, getAxiosConfig\(\)\);\s*setProducts\(res\.data\);',
        r'const { data } = await supabase.from("products").select("*, variants(*)"); setProducts(data || []);',
        content
    )

    content = re.sub(
        r'const res = await axios\.get\(`\$\{API_BASE_URL\}/api/public/products`\);\s*setPublicProducts\(res\.data\);',
        r'const { data } = await supabase.from("products").select("*, variants(*)"); setPublicProducts(data || []);',
        content
    )

    content = re.sub(
        r'const res = await axios\.get\(`\$\{API_BASE_URL\}/api/bookings`, getAxiosConfig\(\)\);\s*setBookings\(res\.data\);',
        r'const { data } = await supabase.from("bookings").select("*").order("created_at", { ascending: false }); setBookings(data || []);',
        content
    )

    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)

# Define files
files = [
    "frontend/src/App.tsx",
    "frontend/src/features/public/PublicCatalog.tsx",
    "frontend/src/features/inventory/InventoryTab.tsx",
    "frontend/src/features/bookings/BookingsTab.tsx",
    "frontend/src/features/pos/PosTab.tsx",
    "frontend/src/features/analytics/AnalyticsTab.tsx"
]

for file in files:
    if os.path.exists(file):
        migrate_file(file)
        print(f"Migrated {file}")
