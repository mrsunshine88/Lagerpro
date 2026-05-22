# Instruktioner för driftsättning och PostgreSQL-migrering

Hej! Det här lagersystemet (Flask-applikationen) har byggts om från att använda en lokal SQLite-fil (`database.db`) till att bli helt förberett för en robust **PostgreSQL-databas**.

Detta innebär att applikationen nu kan laddas upp i molnet (t.ex. på Render, Heroku eller en egen VPS-server) på ett säkert sätt utan risk för att förlora lagersaldon eller bokningar vid omstarter av servern.

---

## 1. Vad som är ändrat
* **PostgreSQL-stöd:** Koden i `app.py` ansluter nu till databaser via standard-miljövariabeln `DATABASE_URL`.
* **Bakåtkompatibilitet:** Vi har byggt en smart "wrapper" i koden som gör att alla befintliga SQL-frågor och funktioner fungerar identiskt mot Postgres.
* **Migreringsverktyg:** Det finns ett nytt skript `migrate_to_postgres.py` som flyttar all befintlig data från SQLite-filen till Postgres-databasen på under en minut.

---

## 2. Förberedelser (Detta behövs)
För att köra igång systemet mot Postgres behöver du en anslutningssträng (Connection String) till en PostgreSQL-databas.

Du kan använda valfri Postgres-databas (t.ex. en lokal installation eller i molnet). Två mycket bra och kostnadsfria molnalternativ är:
* **Neon.tech** (Serverless Postgres – skapas på 30 sekunder)
* **Supabase.com** (Postgres-plattform med bra gratisnivå)

När du skapat databasen kopierar du anslutningssträngen. Den ser ut ungefär så här:
`postgresql://användare:lösenord@adress.com:5432/databasnamn`

---

## 3. Steg-för-steg: Flytta datan (Migrering)
Innan ni stänger av SQLite-databasen bör ni flytta över all er befintliga data (produkter, varianter, saldo, transaktioner och bokningar) till Postgres.

1. Öppna terminalen i projektmappen.
2. Kör migreringsskriptet:
   ```bash
   python migrate_to_postgres.py
   ```
3. Skriptet kommer att känna av att miljövariabeln saknas och be dig att klistra in din Postgres-anslutningssträng direkt i terminalen.
4. Klistra in strängen och tryck på **Enter**. Skriptet kommer nu att:
   * Skapa alla nödvändiga tabeller i PostgreSQL.
   * Kopiera över all data i rätt ordning för att inte bryta främmande nycklar.
   * **Synka ID-sekvenserna** i Postgres så att framtida automatiska ID-nummer genereras i rätt ordning (från max-ID + 1).

*När skriptet visar `[KLAR] Migreringen lyckades utan fel!` är all er data tryggt överförd till molnet.*

---

## 4. Konfigurera och starta applikationen

### Köra lokalt (med Postgres)
Ställ in miljövariabeln `DATABASE_URL` och starta applikationen:

* **I PowerShell (Windows):**
  ```powershell
  $env:DATABASE_URL="DIN_ANSLUTNINGSSTRÄNG_HÄR"
  python app.py
  ```
* **I CMD (Windows):**
  ```cmd
  set DATABASE_URL=DIN_ANSLUTNINGSSTRÄNG_HÄR
  python app.py
  ```
* **I Terminal (macOS/Linux):**
  ```bash
  export DATABASE_URL="DIN_ANSLUTNINGSSTRÄNG_HÄR"
  python app.py
  ```

### Driftsättning i molnet (t.ex. Render.com)
Om ni lägger upp applikationen på **Render.com** (vilket rekommenderas eftersom det är mycket enkelt för Flask-appar):
1. Skapa en **Web Service** och koppla ert Git-repo.
2. Under fliken **Environment** (Miljöinställningar) i Render:
   * Lägg till en variabel: `DATABASE_URL`
   * Sätt värdet till din Postgres-anslutningssträng.
3. Starta tjänsten. Render kommer att starta appen och installera alla paket (inklusive `psycopg2-binary`) automatiskt.

---

*Hör gärna av dig om du eller din chef har några frågor kring databasstrukturen eller driftsättningen!*
