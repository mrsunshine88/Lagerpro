import { test, expect, request } from '@playwright/test';

async function resetDatabase() {
  const context = await request.newContext();
  const response = await context.post('http://localhost:3000/api/test/reset');
  if (!response.ok()) {
    throw new Error('Failed to reset database');
  }
}

test.describe('Publik Bokningsportal', () => {
  test.beforeEach(async () => {
    await resetDatabase();
  });

  test('ska kunna söka och filtrera efter produkter', async ({ page }) => {
    await page.goto('/');

    // Verifiera att testprodukten "Nike Air" syns
    await expect(page.locator('text=Nike Air')).toBeVisible();

    // Sök efter en annan sko och verifiera att Nike döljs eller att vi ser tomt resultat
    await page.fill('input[placeholder="Sök efter produkt, färg, storlek eller kategori..."]', 'Adidas');
    await expect(page.locator('text=Nike Air')).not.toBeVisible();
    await expect(page.locator('text=Inga matchande produkter i lager')).toBeVisible();

    // Rensa sökning
    await page.fill('input[placeholder="Sök efter produkt, färg, storlek eller kategori..."]', 'Nike');
    await expect(page.locator('text=Nike Air')).toBeVisible();
  });

  test('ska kunna lägga till i varukorg och slutföra en butiksbokning', async ({ page }) => {
    await page.goto('/');

    // Vänta på att produkterna laddats från backend och "Nike Air" visas
    await expect(page.locator('text=Nike Air')).toBeVisible();

    // 1. Lägg till en Nike Air storlek 42 i varukorgen (det är en bokningskategori)
    // Hitta raden med "Storlek: 42" och klicka på dess "Boka" knapp
    const row = page.locator('.variant-row', { hasText: 'Storlek: 42' });
    await row.locator('button:has-text("Boka")').click();

    // Verifiera att knappen "Visa varukorg" blir synlig i headern
    await expect(page.locator('button:has-text("Visa varukorg")')).toBeVisible();

    // 2. Klicka på "Visa varukorg" för att öppna kassan
    await page.click('button:has-text("Visa varukorg")');
    await expect(page.locator('text=Varukorg & Kassa')).toBeVisible();

    // 3. Fyll i kunduppgifter
    await page.fill('input[placeholder="Ditt förnamn..."]', 'Kalle');
    await page.fill('input[placeholder="Ditt efternamn..."]', 'Karlsson');
    await page.fill('input[placeholder="T.ex. 0701234567"]', '0709999999');
    await page.fill('textarea[placeholder="Skriv dina önskemål eller meddelande här..."]', 'Testmeddelande för bokning');

    // 4. Verifiera totalsumman
    await expect(page.locator('text=Totalt att boka:')).toBeVisible();
    // Välj det sista pris-elementet i översikten (totalen) för att undvika strict mode violation
    await expect(page.locator('.glass-panel', { hasText: 'Totalt att boka:' }).locator('text=1200 kr').last()).toBeVisible();

    // 5. Bekräfta bokningen
    await page.click('button[type="submit"]:has-text("Bekräfta bokning")');

    // 6. Verifiera orderbekräftelse / digitalt kvitto
    await expect(page.locator('text=Bokning klar!')).toBeVisible();
    await expect(page.locator('text=Vi har lagt undan dina produkter i butiken')).toBeVisible();
    await expect(page.locator('text=Kalle Karlsson')).toBeVisible();
    await expect(page.locator('text=0709999999')).toBeVisible();
    await expect(page.locator('#receipt-print-area >> text=Nike Air')).toBeVisible();

    // Stäng kvittot / kassan
    await page.click('button:has-text("Stäng")');
    // Verifiera att kassan är stängd och varukorgen nollställd
    await expect(page.locator('button:has-text("Visa varukorg")')).not.toBeVisible();
  });

  test('ska kunna validera rabattkod i varukorgen', async ({ page }) => {
    await page.goto('/');

    // Vänta på att produkterna laddats från backend
    await expect(page.locator('text=Nike Air')).toBeVisible();

    // Lägg Nike Air 42 i varukorgen
    const row = page.locator('.variant-row', { hasText: 'Storlek: 42' });
    await row.locator('button:has-text("Boka")').click();

    // Öppna varukorgen
    await page.click('button:has-text("Visa varukorg")');

    // Ange en ogiltig rabattkod och se felmeddelande
    await page.fill('input[placeholder="Skriv kod här..."]', 'FELKOD');
    // Vänta på validering (debounce/API-svar)
    await expect(page.locator('text=Ogiltig rabattkod')).toBeVisible();

    // Ange en giltig rabattkod "PROMO10"
    await page.fill('input[placeholder="Skriv kod här..."]', 'PROMO10');
    // Verifiera att koden är aktiverad
    await expect(page.locator('text=✓ Kod aktiverad! Ger 10% rabatt.')).toBeVisible();

    // Verifiera omräknad summa (1200 kr - 120 kr = 1080 kr)
    await expect(page.locator('text=Rabatt (Kod: PROMO10 -10%):')).toBeVisible();
    await expect(page.locator('text=-120 kr')).toBeVisible();
    await expect(page.locator('.glass-panel', { hasText: 'Totalt att boka:' }).locator('text=1080 kr').last()).toBeVisible();
  });
});
