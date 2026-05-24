import { test, expect, request } from '@playwright/test';

async function resetDatabase() {
  const context = await request.newContext();
  const response = await context.post('http://localhost:3000/api/test/reset');
  if (!response.ok()) {
    throw new Error('Failed to reset database');
  }
}

test.describe('POS (Butikskassa)', () => {
  test.beforeEach(async ({ page }) => {
    await resetDatabase();

    // Logga in som admin före varje test för att nå POS
    await page.goto('/');
    await page.click('button:has-text("Personalinloggning")');
    await page.fill('input[type="email"]', 'apersson508@gmail.com');
    await page.fill('input[type="password"]', '020406');
    await page.click('button[type="submit"]');
    
    // Gå till POS fliken
    await page.click('.nav-tab:has-text("Kassa (POS)")');
    await expect(page.locator('text=Kassa & Snabbköp')).toBeVisible();
  });

  test('ska kunna lägga till produkt i POS-varukorg och slutföra köp', async ({ page }) => {
    // 1. Verifiera att testprodukten "Nike Air" och dess varianter visas
    await expect(page.locator('text=Nike Air')).toBeVisible();

    // 2. Klicka på Nike Air storlek 42 variantknappen (Röd, 1200 kr)
    await page.click('button:has-text("Storlek: 42 (Röd)")');

    // 3. Verifiera att varukorgen uppdateras
    await expect(page.locator('.pos-cart-item')).toContainText('Nike Air');
    await expect(page.locator('.pos-cart-item')).toContainText('St: 42 (Röd)');
    await expect(page.locator('text=Summa att betala:')).toBeVisible();
    await expect(page.locator('span:has-text("Summa att betala:") + span')).toContainText('1200 kr');

    // 4. Lägg till en procentuell rabatt (t.ex. 10%)
    const slider = page.locator('input[type="range"]');
    await slider.fill('10'); // Sätter värdet till 10%

    // Verifiera att priset reduceras (1200 kr - 120 kr = 1080 kr)
    await expect(page.locator('text=Ordinarie pris:')).toBeVisible();
    await expect(page.locator('text=Du sparar:')).toBeVisible();
    await expect(page.locator('span:has-text("Summa att betala:") + span')).toContainText('1080 kr');

    // 5. Slutför köp och hantera webbläsarens alert
    const dialogPromise = page.waitForEvent('dialog');
    await page.click('button:has-text("Slutför & Registrera Köp")');

    // Verifiera att vi fick rätt bekräftelsemeddelande
    const dialog = await dialogPromise;
    expect(dialog.message()).toContain('Köp registrerat framgångsrikt');
    await dialog.accept();

    // Verifiera att POS-varukorgen är tom efter genomfört köp
    await expect(page.locator('text=Varukorgen är tom.')).toBeVisible();
  });

  test('ska kunna skanna streckkod/SKU och lägga i varukorgen direkt', async ({ page }) => {
    // 1. Öppna skanner-simulatorn
    await page.click('.pos-products-panel button:has-text("Skanna")');
    await expect(page.locator('text=Skanna streckkod')).toBeVisible();

    // 2. Fyll i en befintlig SKU "NIKE-AIR-42-RED"
    await page.fill('input[placeholder="T.ex. LGR-ADID-42-BLK..."]', 'NIKE-AIR-42-RED');
    await page.click('button:has-text("Sök streckkod")');

    // 3. Verifiera att simulatorn bekräftar träff
    await expect(page.locator('text=Hittade: Nike Air - 42 (Röd) och lade till i kassan!')).toBeVisible();

    // Stäng modalen
    await page.click('.modal-header button.btn-close');

    // 4. Verifiera att produkten lades till i POS-varukorgen
    await expect(page.locator('.pos-cart-item')).toContainText('Nike Air');
    await expect(page.locator('.pos-cart-item')).toContainText('St: 42 (Röd)');
  });
});
