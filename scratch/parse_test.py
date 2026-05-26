import pandas as pd
import re

excel_path = "export_2026-05-25 (1).xlsx"
df = pd.read_excel(excel_path)

def parse_name(name):
    name = str(name).strip()
    
    # 1. Try to extract size at the end of the string
    # Matches a number (integer or decimal like 39 or 39.5 or 39,5) at the end of the string
    size_match = re.search(r'\s+(\d+[\.,]?\d*)\s*$', name)
    
    size = None
    color = ""
    model = name
    
    if size_match:
        size = size_match.group(1)
        # remove the size from the name to get the rest
        rest = name[:size_match.start()].strip()
    else:
        rest = name
        
    # 2. Try to separate model and color
    # The first word is typically the model name, and the rest is the color
    parts = rest.split(maxsplit=1)
    if len(parts) == 2:
        model = parts[0]
        color = parts[1]
    elif len(parts) == 1:
        model = parts[0]
        color = ""
        
    return {
        "original": name,
        "model": model,
        "color": color if color else "Universal",
        "size": size if size else "Universal"
    }

parsed_data = []
for idx, row in df.iterrows():
    name = row['Namn']
    if pd.isna(name):
        continue
    category = row['Kategori'] if not pd.isna(row['Kategori']) else 'Allmänt'
    parsed = parse_name(name)
    parsed['category'] = category
    parsed['stock'] = float(row['I lager Ramdala Krukor']) if not pd.isna(row['I lager Ramdala Krukor']) else 0.0
    parsed['price'] = float(row['Pris']) if not pd.isna(row['Pris']) else 0.0
    parsed['purchase_price'] = float(row['Inköpspris']) if not pd.isna(row['Inköpspris']) else 0.0
    parsed['barcode'] = str(row['Streckkod']).split('.')[0] if not pd.isna(row['Streckkod']) else ""
    parsed_data.append(parsed)

parsed_df = pd.DataFrame(parsed_data)
print("--- SUMMARY OF PARSING ---")
print(f"Total parsed rows: {len(parsed_df)}")
print("\nSample of parsed shoes:")
print(parsed_df[parsed_df['category'] == 'skor'].head(15).to_string(index=False))

print("\nSample of parsed non-shoes or general items:")
print(parsed_df[parsed_df['category'] != 'skor'].head(15).to_string(index=False))

print("\nRows with size = 'Universal':")
print(parsed_df[parsed_df['size'] == 'Universal'].head(10).to_string(index=False))
