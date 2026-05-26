import os

db_url = os.environ.get('DATABASE_URL')
print("DATABASE_URL in environment:", db_url)

# Let's see if we can find any other databases or configurations
for k, v in os.environ.items():
    if "DATABASE" in k or "CONN" in k or "URL" in k or "POSTGRES" in k:
        print(f"  {k}: {v}")
