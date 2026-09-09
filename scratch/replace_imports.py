import os
import re

def migrate_import(filepath, depth):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    target = "import axios from 'axios';"
    if depth == 0:
        replacement = "import axios from './apiClient';"
    else:
        prefix = "../" * depth
        replacement = f"import axios from '{prefix}apiClient';"

    content = content.replace(target, replacement)
    content = content.replace('import axios from "axios";', replacement)

    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)

files_depth = {
    "frontend/src/App.tsx": 0,
    "frontend/src/features/public/PublicCatalog.tsx": 2,
    "frontend/src/features/inventory/InventoryTab.tsx": 2,
    "frontend/src/features/bookings/BookingsTab.tsx": 2,
    "frontend/src/features/pos/PosTab.tsx": 2,
    "frontend/src/features/analytics/AnalyticsTab.tsx": 2
}

for filepath, depth in files_depth.items():
    if os.path.exists(filepath):
        migrate_import(filepath, depth)
        print(f"Migrated import in {filepath}")
