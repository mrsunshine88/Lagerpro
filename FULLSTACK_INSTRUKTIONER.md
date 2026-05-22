# Fullstack React & NestJS - Instruktioner för Driftsättning & Utveckling

Hej! Detta lagersystem har uppgraderats till en professionell, modern och mycket robust fullstack-arkitektur bestående av:
1. **Frontend (FE):** En supersnabb Single Page Application (SPA) byggd med **React 19**, **Vite** och **strict TypeScript**, med fullt bevarat premium dark-mode gränssnitt.
2. **Backend (BE):** En högpresterande **NestJS**-server byggd med **TypeScript** och **MikroORM v7** som kommunicerar direkt mot **PostgreSQL**.

---

## 1. Fördelar med den nya arkitekturen
* **Enterprise-standard:** NestJS är branschstandard för säkra och skalbara serverapplikationer.
* **Typ-säkerhet (Strict TypeScript):** Typescript garanterar att det inte uppstår dolda runtime-fel i varken backend eller frontend.
* **MikroORM v7 (Data Mapper):** Professionell databashantering med automatisk schema-hantering.
* **Självläkande databas:** Servern kontrollerar och skapar/uppdaterar automatiskt alla tabeller och fält i Postgres vid varje start! Ingen manuell SQL-körning krävs för att sätta upp en ny tom databas.
* **Auto-seedare:** Om databasen är helt ny och tom, skapar servern automatiskt standardkontot `apersson508@gmail.com` (lösenord: `020406`) så att ni kan logga in direkt.

---

## 2. Hur man startar systemet lokalt (Zero-Setup)

### Alternativ A: Starta med Startpanelen (Enkelt!)
Dubbelklicka på filen **`STARTA_LAGERSYSTEM.bat`** i rotmappen.
* Välj alternativ `1` för att starta den nya Fullstack-versionen.
* Detta kommer automatiskt att öppna två terminalfönster (ett för backend på port 3000, ett för frontend på port 5173) och automatiskt öppna er webbläsare mot React-appen!

### Alternativ B: Starta manuellt via terminalen

#### 1. Starta Backend
Öppna en terminal i mappen `backend/`:
```bash
npm run start:dev
```
*Servern startar på `http://localhost:3000`.*

#### 2. Starta Frontend
Öppna en separat terminal i mappen `frontend/`:
```bash
npm run dev
```
*Frontend körs på `http://localhost:5173`.*

---

## 3. Konfigurera PostgreSQL-anslutningen
Som standard ansluter systemet till en lokal Postgres-databas (`postgresql://postgres:postgres@localhost:5432/lager`).

För att byta till din chefs databas (lokalt eller i molnet på t.ex. Neon.tech, Supabase eller Render):
1. Sätt miljövariabeln **`DATABASE_URL`** till er anslutningssträng (connection string) innan ni startar NestJS-servern.
   * **PowerShell:**
     ```powershell
     $env:DATABASE_URL="postgresql://användare:lösenord@adress.com:5432/databasnamn"
     ```
   * **CMD:**
     ```cmd
     set DATABASE_URL=postgresql://användare:lösenord@adress.com:5432/databasnamn
     ```
2. Starta backend. NestJS kommer nu att ansluta, bygga upp tabellerna och driftsätta systemet direkt mot molndatabasen!

---

## 4. Struktur för filer & kod

```text
Lager/
├── backend/                   # NESTJS BACKEND
│   ├── src/
│   │   ├── entities/         # MikroORM databas-entiteter (Product, Variant, Booking, User etc)
│   │   ├── auth/             # JWT-autentisering, inloggning, behörighetsroller
│   │   ├── products/         # API för produkter & varianter
│   │   ├── bookings/         # API för kundreservationer
│   │   ├── transactions/     # API för transaktionshistorik
│   │   ├── settings/         # Inställningar för lump-sum investeringar
│   │   ├── analytics/        # Avancerad break-even kalkyl & statistik
│   │   ├── utilities/        # QR-kodsskapare och Excel-importör
│   │   └── main.ts           # DB Auto-uppdaterare & Seed-logic
│   ├── package.json
│   └── tsconfig.json
├── frontend/                  # REACT FRONTEND
│   ├── src/
│   │   ├── App.tsx           # Hela React-applikationen med full typ-säkerhet
│   │   ├── index.css         # Custom Premium CSS-layout (neon huer, glassmorphism)
│   │   └── main.tsx          # Vite React startpunkt
│   ├── public/               # Shoebilder, ikoner, PWA-manifest
│   ├── package.json
│   └── tsconfig.json
├── STARTA_LAGERSYSTEM.bat     # Smart startskript för Windows
└── FULLSTACK_INSTRUKTIONER.md # Detta dokument
```

---

## 5. Driftsättning i produktion (Molnet)

När ni vill lägga upp sidan på nätet på t.ex. **Render.com**, **Railway.app** eller **Heroku**:

### 1. Bygg frontend
Kör följande i `frontend/`-mappen:
```bash
npm run build
```
Detta genererar en färdig kompilerad produktionsmapp `frontend/dist/`.

### 2. Bygg backend
Kör följande i `backend/`-mappen:
```bash
npm run build
```
Detta kompilerar TypeScript till högpresterande JavaScript i `backend/dist/`.

### 3. Driftsättning på Render / VPS
* Lägg till miljövariabeln `DATABASE_URL` med er Postgres-anslutningssträng.
* Sätt startkommandot för er tjänst till: `node backend/dist/main.js`.
* Backend kommer att köra igång API:et på den port som plattformen tilldelar (`process.env.PORT`).

---

*Hör av dig till oss om du eller din chef har några frågor! Lycka till med driftsättningen av ert nya, supersnabba Fullstack-lagersystem! 🚀*
