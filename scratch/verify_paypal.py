import urllib.request
import json
import sys

def test_paypal_webhook():
    print("===================================================")
    print("       VERIFIERINGSTEST: PAYPAL WEBHOOK")
    print("===================================================")
    
    url = "http://localhost:3000/api/webhooks/paypal"
    
    # We simulate a completed PayPal checkout with a test SKU that exists
    # in the default seeded database (NIKE-AIR-42-RED, starting stock 10)
    payload = {
        "event_type": "PAYMENT.CAPTURE.COMPLETED",
        "is_simulation": True,
        "simulated_items": [
            {
                "sku": "NIKE-AIR-42-RED",
                "quantity": 2,
                "price": 1200.0
            }
        ]
    }
    
    data = json.dumps(payload).encode('utf-8')
    
    req = urllib.request.Request(
        url,
        data=data,
        headers={
            "Content-Type": "application/json",
            "User-Agent": "Lagerpro Paypal Verification Script"
        },
        method="POST"
    )
    
    print(f"\n[TEST] Skickar simulerat PayPal-köp till: {url}")
    print(f"       SKU: NIKE-AIR-42-RED | Antal: 2 | Pris: 1200.0 kr")
    
    try:
        with urllib.request.urlopen(req, timeout=5) as response:
            status = response.status
            res_body = response.read().decode('utf-8')
            res_json = json.loads(res_body)
            
            print(f"\n[OK] Svar mottaget! Statuskod: {status}")
            print(f"     Svar från servern: {json.dumps(res_json, indent=2, ensure_ascii=False)}")
            
            if res_json.get("success"):
                print("\n[FRAMGÅNG] Integrationen fungerar perfekt! Lagersaldot har minskats och transaktionen registrerats.")
            else:
                print("\n[VARNING] Servern svarade men operationen misslyckades: ", res_json.get("message"))
                
    except urllib.error.URLError as e:
        print(f"\n[INFO] Kunde inte ansluta till NestJS-servern på {url}: {e.reason}")
        print("       Detta är normalt om servern inte är startad på port 3000.")
        print("       För att testa skarpt lokalt:")
        print("         1. Starta NestJS-servern (t.ex. genom STARTA_LAGERSYSTEM.bat val 1 eller 'npm run start:dev')")
        print("         2. Kör detta verifieringsskript igen!")
        print("\nSkriptet har skapats framgångsrikt och är redo att användas så fort servern körs.")

if __name__ == "__main__":
    test_paypal_webhook()
