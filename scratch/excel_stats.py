import pandas as pd

excel_path = "export_2026-05-25 (1).xlsx"
df = pd.read_excel(excel_path)

print("--- EXCEL FILE STATS ---")
print("Total rows:", len(df))
print("\nCategories distribution:")
print(df['Kategori'].value_counts(dropna=False))

print("\nStock by Category (Ramdala Krukor / Stock):")
stock_col = 'I lager Ramdala Krukor'
if stock_col in df.columns:
    df_grouped = df.groupby('Kategori', dropna=False)[stock_col].agg(['sum', 'count'])
    print(df_grouped)
    print("Total stock across all items:", df[stock_col].sum())
else:
    print("Stock column not found")

print("\nPrice stats:")
print(df['Pris'].describe())

print("\nRows with missing barcodes:")
print(df['Streckkod'].isna().sum())
