import os
import re

files_to_fix = [
    "frontend/src/features/public/PublicCatalog.tsx",
    "frontend/src/features/inventory/InventoryTab.tsx",
    "frontend/src/features/bookings/BookingsTab.tsx",
    "frontend/src/features/pos/PosTab.tsx",
    "frontend/src/features/analytics/AnalyticsTab.tsx"
]

for filepath in files_to_fix:
    if os.path.exists(filepath):
        with open(filepath, 'r', encoding='utf-8') as f:
            content = f.read()
        
        # Check if 'axios.' or 'axios(' is used in the file
        if 'axios.' in content or 'axios(' in content:
            # Check if it's imported
            if 'import axios' not in content:
                # Add import to the top of the file
                content = "import axios from '../../apiClient';\n" + content
                with open(filepath, 'w', encoding='utf-8') as f:
                    f.write(content)
                print(f"Fixed missing axios import in {filepath}")
            else:
                print(f"Axios already imported in {filepath}")
