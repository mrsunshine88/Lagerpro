# Lagersystem & E-handel (Lagerpro) - Funktionsmatris & Testplan

Detta dokument beskriver samtliga funktioner i applikationen och fungerar som den centrala kravspecifikationen (Source of Truth). Genom att kartlägga dessa funktioner kan vi skriva **Playwright E2E-tester** som validerar att koden uppfyller kraven, vilket skapar ett robust skyddsnät inför framtida refaktoreringar (t.ex. att dela upp den stora `App.tsx`-filen).

---

## 1. Roller och Behörigheter

Systemet stöder tre huvudsakliga användarroller med olika behörighetsnivåer:

| Roll | Beskrivning | Tillgängliga flikar & funktioner |
| :--- | :--- | :--- |
| **Gäst / Offentlig kund** | En icke-inloggad besökare på webbplatsen. | Offentlig produktkatalog, sök och filtrering, kundvagn, bokning/beställning (hämta/skicka), samt Swish-betalningssimulator. |
| **Butikspersonal / Användare** | En inloggad medarbetare (roll: `user`). | **Hub**, **POS (Kassa)**, **Lagersaldo (Inventory)** med produktvy, samt **Bokningar** för att hantera kundreservationer. |
| **Superadmin / Admin** | En inloggad administratör (roll: `admin`). | Alla funktioner för Butikspersonal + **Analys (Analytics)**, fullständiga ekonomiska kalkyler, projektinställningar (Lump-sum investeringar), hantering av rabattkoder, samt användarhantering. |

---

## 2. Funktionsmatris (Feature Matrix)

Här är en detaljerad genomgång av applikationens funktioner per område, vilka vi kommer att täcka med Playwright-tester.

### A. Autentisering & Säkerhet
* **F-A1: Inloggning:** Användare och administratörer kan logga in via ett e-post- och lösenordsformulär. Systemet använder JWT-tokens för sessionshantering.
* **F-A2: Auto-seedare:** Om databasen är tom skapas automatiskt ett administratörskonto (`apersson508@gmail.com`) med lösenord (`020406`).
* **F-A3: Utloggning:** Inloggade användare kan säkert logga ut, vilket rensar tokens i `localStorage` och återställer gränssnittet till den publika vyn.
* **F-A4: Rollbaserad åtkomstkontroll (RBAC):** Flikar och API-ändpunkter (t.ex. analys och rabattkoder) döljs och blockeras för användare med rollen `user` samt oinloggade gäster.

### B. Offentlig Katalog & Kundreservering (E-handel)
* **F-B1: Produktlista & Saldokontroll:** Visar alla aktiva produkter med tillgängliga varianter (storlekar/färger) och deras priser. Produkter som är helt slut döljs som standard eller indikeras som slutsålda.
* **F-B2: Sök & Filtrering:** Kunder kan söka på fritext (namn/beskrivning) och filtrera på kategori, storlek samt maxpris.
* **F-B3: Kundvagn (Offentlig):** Kunder kan lägga till specifika storlekar/varianter i varukorgen. Systemet hindrar att man blandar produkter från projekt med olika utcheckningsmetoder (t.ex. ren e-handel och fysiska butiksbokningar).
* **F-B4: Utcheckning - Butiksbokning (Reservation):** Kunder kan reservera produkter för upphämtning. De anger namn, telefonnummer och eventuella meddelanden. En bokning skapas i status `pending`.
* **F-B5: Utcheckning - E-handel med Swish-betalning:** För projekt inställda på e-handel kan kunden välja frakt eller upphämtning, ange leveransadress, validera rabattkoder, och betala via en interaktiv Swish-betalningssimulator.
* **F-B6: Rabattkodskalkylator (Realtid):** Validerar rabattkoder direkt mot backend och räknar om totalsumman samt applicerar fri frakt vid godkänd kod.

### C. Butikskassa (POS - Point of Sale)
* **F-C1: POS-Varukorg:** Personalen kan välja produkter och lägga i kassans varukorg.
* **F-C2: Sök & Kategori-snabblänkar:** Kassan erbjuder snabbsök och filtrering efter produktkategori för snabb hantering under stress.
* **F-C3: Rabatter i POS:** Personalen kan lägga till procentuell rabatt på köpet direkt i kassan.
* **F-C4: Registrera köp (POS Checkout):** Genomför köpet, drar av motsvarande mängd från lagersaldot och skapar en transaktion i databasen.
* **F-C5: Streckkodsskanner-simulator:** Möjlighet att simulera en fysisk streckkodsskanning genom att mata in en SKU. Produkten hittas direkt och läggs automatiskt i POS-varukorgen.

### D. Lagerhantering (Inventory)
* **F-D1: CRUD-produkter och varianter:** Personalen kan lägga till nya produkter med namn, kategori och beskrivning, samt lägga till/redigera enskilda varianter (storlek, färg, inköpspris, försäljningspris, originalpris, lagersaldo, SKU).
* **F-D2: QR-kodsgenerator:** Möjlighet att generera och visa en QR-kod (etikett) för varje produktvariant direkt i webbläsaren.
* **F-D3: Excel-importmotor:** Användare kan ladda upp en Excel-fil med produkter/varianter. Systemet visar en interaktiv förhandsvisning ("import proposals") där personalen granskar datan innan de slutgiltigt godkänner importen till databasen.

### E. Bokningshantering (Bookings Admin)
* **F-E1: Bokningslista:** Visar alla inkomna kundreservationer sorterade kronologiskt med status.
* **F-E2: Statusflöde:** Möjlighet för personal att uppdatera en bokning genom dess livscykel:
  * `Pending` (Väntande) $\rightarrow$ `Reserved` (Reserverad/Undanlagd på hyllan) $\rightarrow$ `Confirmed` (Slutförd/Hämtad och betald) eller `Cancelled` (Avbruten/Återförd till lagret).
* **F-E3: Lagersaldosynkronisering:** När en bokning avbryts (`Cancelled`) återförs produkterna automatiskt till lagersaldot. När en bokning bekräftas (`Confirmed`) bokförs försäljningen i ekonomin.

### F. Ekonomi, Rabattkoder & Inställningar (Endast Admin)
* **F-F1: Ekonomisk Dashboard (Break-Even):** Visar grafer/tabeller med totalt investerat kapital, ackumulerad försäljning, nettovinst samt framsteg mot break-even (både totalt och uppdelat per projekt).
* **F-F2: Projektinställningar (Lump-Sum vs Enskild):** Konfigurering av projekt (t.ex. startinvestering för inköp) för att beräkna korrekt break-even.
* **F-F3: Frakt & Utcheckningsinställningar:** Styr om ett specifikt projekt (kategori) ska använda "Bokningsläge" (hämta i butik) eller "E-handelsläge" (Swish-betalning + fraktval).
* **F-F4: Rabattkods-CRUD:** Skapa, redigera och ta bort rabattkoder med specifika villkor (procentuell rabatt, fri frakt, giltighetstid, eller begränsad till ett specifikt projekt/kategori).
* **F-F5: Swish-konfiguration:** Hantering av Swish-nummer och certifikat för betalintegrationen.
* **F-F6: Användarhantering (Admin Panel):** Skapa och hantera inloggningskonton för övrig personal samt begränsa vilka projekt (varumärken/kategorier) som en viss användare har tillgång till.

---

## 3. Playwright E2E-testarkitektur (Skyddsnätet)

För att garantera att ingenting går sönder när källkoden skrivs om, sätter vi upp ett E2E-testpaket med **Playwright**. Dessa tester kommer att köras mot den kompilerade frontend-applikationen och kommunicera med NestJS-backend (som lämpligen körs mot en testdatabas eller rensas före varje testkörning).

### Rekommenderat testupplägg (Test Cases)

Vi skapar 5 primära testfiler i en ny `frontend/tests/`-katalog:

```text
frontend/
├── tests/
│   ├── auth.spec.ts         # Testar F-A1, F-A3, F-A4 (Login, Logout, RBAC)
│   ├── public.spec.ts       # Testar F-B1 till F-B6 (Sök, Kundvagn, Bokning, Swish Checkout)
│   ├── pos.spec.ts          # Testar F-C1 till F-C5 (Kassa, Rabatter, Simulator för Skanning)
│   ├── inventory.spec.ts    # Testar F-D1 till F-D3 (CRUD produkter, Excel-förhandsvisning)
│   └── admin.spec.ts        # Testar F-E1 till F-E3, F-F1 till F-F6 (Bokningar status, Rabattkoder CRUD, Inställningar)
```

#### Exempel på ett Playwright-testflöde (Butiksköp i POS):
1. Logga in med standarduppgifterna `apersson508@gmail.com` / `020406`.
2. Gå till fliken **POS**.
3. Sök efter en produkt (t.ex. "Sneaker X").
4. Klicka på en variant och lägg till i varukorgen.
5. Ange 10% rabatt i rabattfältet.
6. Klicka på "Slutför köp".
7. Verifiera att lagersaldot för produkten har minskat med 1 st under fliken **Inventory**.
8. Verifiera under **Analytics** att omsättningen har ökat.

---

## 4. Refaktoreringsstrategi: Från Monolit till Modulär kod

När Playwright-testerna körs grönt och täcker alla funktioner har vi det perfekta skyddsnätet. Då kan vi dela upp `App.tsx` (3 400+ rader) i en ren, modern och lättläst komponentstruktur utan att oroa oss för dolda buggar.

### Mål-arkitektur för Frontend:
```text
frontend/src/
├── main.tsx
├── App.tsx                  # Endast globalt state, routing och övergripande layout
├── index.css
├── components/              # Återanvändbara gränssnittskomponenter
│   ├── ui/                  # Knappar, Modaler, Inputs, Tabeller (Glassmorphism-styled)
│   ├── Navbar.tsx           # Navigering och inloggningsstatus
│   └── QRModal.tsx          # QR-kodsvisare
└── features/                # Domänspecifika moduler
    ├── auth/
    │   └── LoginModal.tsx
    ├── hub/
    │   └── HubTab.tsx
    ├── pos/
    │   ├── PosTab.tsx
    │   ├── Cart.tsx
    │   └── ScannerSimulator.tsx
    ├── inventory/
    │   ├── InventoryTab.tsx
    │   ├── ProductFormModal.tsx
    │   └── ExcelImportModal.tsx
    ├── bookings/
    │   └── BookingsTab.tsx
    └── analytics/
        ├── AnalyticsTab.tsx
        ├── BreakEvenChart.tsx
        ├── DiscountCodesManager.tsx
        └── SettingsManager.tsx
```

Genom att behålla testerna helt orörda under denna omstrukturering kan vi kontinuerligt köra:
```bash
npx playwright test
```
Om alla tester lyser grönt vet vi med absolut säkerhet att det nya, snygga, uppdelade gränssnittet fungerar **exakt likadant** som den gamla monolith-koden!
