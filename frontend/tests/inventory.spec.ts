import { test, expect, request } from '@playwright/test';

async function resetDatabase() {
  const context = await request.newContext();
  const response = await context.post('http://localhost:3000/api/test/reset');
  if (!response.ok()) {
    throw new Error('Failed to reset database');
  }
}

test.describe('Lagerregister (Inventory)', () => {
  test.beforeEach(async ({ page }) => {
    await resetDatabase();

    // Logga in som admin före varje test för att nå Lagerregister
    await page.goto('/');
    await page.click('button:has-text("Personalinloggning")');
    await page.fill('input[type="email"]', 'apersson508@gmail.com');
    await page.fill('input[type="password"]', '020406');
    await page.click('button[type="submit"]');
    
    // Gå till Lagerregister fliken
    await page.click('.nav-tab:has-text("Lagerregister")');
    await expect(page.locator('text=Ditt lagerregister')).toBeVisible();
  });

  test('ska kunna lägga till en ny produkt med varianter', async ({ page }) => {
    // 1. Klicka på "Lägg till produkt" knappen
    await page.click('button:has-text("Lägg till produkt")');
    await expect(page.locator('.modal-header h2:has-text("Lägg till produkt")')).toBeVisible();

    // 2. Fyll i produktdata
    await page.fill('input[placeholder="T.ex. Adidas Ultraboost..."]', 'Adidas Gazelle');
    await page.locator('.modal-body select').selectOption('Skor');
    await page.fill('input[placeholder="T.ex. Storlekarna är något små..."]', 'Retro klassisk sneaker');

    // 3. Lägg till en variant
    await page.click('button:has-text("+ Lägg till variant")');
    await page.fill('input[placeholder="Storlek"]', '43');
    await page.fill('input[placeholder="Färg"]', 'Svart');
    await page.fill('input[placeholder="Lager"]', '8');
    await page.fill('input[placeholder="Inköpspris"]', '400');
    await page.fill('input[placeholder="Säljpris"]', '1000');

    // 4. Spara produkten
    await page.click('button:has-text("Spara produkt")');

    // 5. Verifiera att modalen stängs och den nya produkten visas i listan
    await expect(page.locator('.modal-header h2:has-text("Lägg till produkt")')).not.toBeVisible();
    await expect(page.locator('text=Adidas Gazelle')).toBeVisible();
    await expect(page.locator('.product-card:has-text("Adidas Gazelle")')).toContainText('Storlek: 43');
  });

  test('ska kunna söka och filtrera i lagret', async ({ page }) => {
    // Verifiera att Nike Air syns
    await expect(page.locator('text=Nike Air')).toBeVisible();

    // Sök efter Adidas och se att ingenting hittas
    await page.fill('input[placeholder="Sök på modell, kategori, färg, storlek eller SKU..."]', 'Adidas');
    await expect(page.locator('text=Nike Air')).not.toBeVisible();

    // Sök efter Nike och se att den återkommer
    await page.fill('input[placeholder="Sök på modell, kategori, färg, storlek eller SKU..."]', 'Nike');
    await expect(page.locator('text=Nike Air')).toBeVisible();
  });
});
