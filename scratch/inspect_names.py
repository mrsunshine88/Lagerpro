import pandas as pd
import re

excel_path = "export_2026-05-25 (1).xlsx"
df = pd.read_excel(excel_path)

print("Unique categories in Excel file:")
print(df['Kategori'].value_counts(dropna=False))

print("\nSample names for 'skor' category:")
shoe_names = df[df['Kategori'] == 'skor']['Namn'].dropna().unique()
for name in shoe_names[:30]:
    print(" -", name)

print("\nSample names for other categories:")
other_names = df[df['Kategori'] != 'skor']['Namn'].dropna().unique()
for name in other_names[:30]:
    print(" -", name)
