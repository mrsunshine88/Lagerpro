import pandas as pd

excel_path = "export_2026-05-25 (1).xlsx"
df = pd.read_excel(excel_path)
print("Columns list:")
for idx, col in enumerate(df.columns):
    print(f"  {idx}: {col}")

print("\nSample rows (first 10):")
cols_to_print = ['Namn', 'Namn alt. 1', 'Värde alt. 1', 'Namn alt. 2', 'Värde alt. 2', 'SKU', 'Pris', 'Inköpspris', 'Streckkod', 'Kategori', 'I lager Ramdala Krukor', 'Variant id', 'Produkt id']
# filter columns that actually exist
cols_to_print = [c for c in cols_to_print if c in df.columns]

print(df[cols_to_print].head(10).to_string())

# Summarize unique categories, sizes, etc.
print("\nUnique values counts:")
if 'Kategori' in df.columns:
    print("Categories:", df['Kategori'].unique())
if 'Värde alt. 1' in df.columns:
    print("Värde alt. 1 (Sizes/Colors?):", df['Värde alt. 1'].unique()[:10])
if 'Namn alt. 1' in df.columns:
    print("Namn alt. 1:", df['Namn alt. 1'].unique())
if 'Namn alt. 2' in df.columns:
    print("Namn alt. 2:", df['Namn alt. 2'].unique())
if 'Värde alt. 2' in df.columns:
    print("Värde alt. 2:", df['Värde alt. 2'].unique()[:10])
