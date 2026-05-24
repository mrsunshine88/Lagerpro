import { test, expect, request } from '@playwright/test';

async function resetDatabase() {
  const context = await request.newContext();
  const response = await context.post('http://localhost:3000/api/test/reset');
  if (!response.ok()) {
    throw new Error('Failed to reset database');
  }
}

test.describe('Admin-panel & Hantering', () => {
  test.beforeEach(async ({ page }) => {
    await resetDatabase();

    // 1. Logga in som admin
    await page.goto('/');
    await page.click('button:has-text("Personalinloggning")');
    await page.fill('input[type="email"]', 'apersson508@gmail.com');
    await page.fill('input[type="password"]', '020406');
    await page.click('button[type="submit"]');
    await expect(page.locator('.nav-tab:has-text("Startmeny")')).toBeVisible();
  });

  test('ska kunna hantera rabattkoder under Lagerinställningar', async ({ page }) => {
    // 1. Öppna inställningsmodalen
    await page.click('button[title="Inställningar"]');
    await expect(page.locator('text=Lagerinställningar')).toBeVisible();

    // 2. Skapa en ny rabattkod "SUMMER20"
    const form = page.locator('h3:has-text("Hantera Rabattkoder") + form');
    await form.locator('select').selectOption('Skor');
    await form.locator('input[placeholder="T.ex. LARS"]').fill('SUMMER20');
    // Rabatt % input
    await form.locator('input[placeholder="20"]').fill('20');
    // Checka i "Fri frakt"
    await form.locator('input[type="checkbox"]').check();

    // Hantera eventuell alert vid skapande
    const dialogPromise = page.waitForEvent('dialog');
    await form.locator('button[type="submit"]:has-text("Skapa rabattkod")').click();

    // Verifiera att rabattkoden skapades och visas i tabellen
    const dialog = await dialogPromise;
    expect(dialog.message()).toContain('Rabattkod skapad!');
    await dialog.accept();

    await expect(page.locator('.discount-table')).toContainText('SUMMER20');
    await expect(page.locator('.discount-table')).toContainText('20%');

    // Stäng modalen
    await page.click('.modal-header button.btn-close');
    await expect(page.locator('text=Lagerinställningar')).not.toBeVisible();
  });

  test('ska kunna hantera en bokning genom statusflödet', async ({ page }) => {
    // 1. Först, skapa en bokning från publika portalen
    await page.click('button[title="Logga ut"]');
    await expect(page.locator('text=Personalinloggning')).toBeVisible();

    // Vänta på att Nike Air laddar
    await expect(page.locator('text=Nike Air')).toBeVisible();

    // Lägg Nike Air i varukorgen
    const row = page.locator('.variant-row', { hasText: 'Storlek: 42' });
    await row.locator('button:has-text("Boka")').click();

    // Gå till varukorg och beställ
    await page.click('button:has-text("Visa varukorg")');
    await page.fill('input[placeholder="Ditt förnamn..."]', 'Adam');
    await page.fill('input[placeholder="Ditt efternamn..."]', 'Svensson');
    await page.fill('input[placeholder="T.ex. 0701234567"]', '0707777777');
    await page.click('button[type="submit"]:has-text("Bekräfta bokning")');
    await expect(page.locator('text=Bokning klar!')).toBeVisible();

    // Stäng kvitto
    await page.click('button:has-text("Stäng")');

    // 2. Logga in igen som admin
    await page.click('button:has-text("Personalinloggning")');
    await page.fill('input[type="email"]', 'apersson508@gmail.com');
    await page.fill('input[type="password"]', '020406');
    await page.click('button[type="submit"]');

    // Gå till fliken "Bokningar"
    await page.click('.nav-tab:has-text("Bokningar")');
    await expect(page.locator('text=Adam Svensson')).toBeVisible();
    
    const bookingRow = page.locator('.bookings-table tbody tr', { hasText: 'Adam Svensson' });
    await expect(bookingRow).toContainText('Väntar');

    // 3. Reservera bokningen (ändra status till reserved)
    await bookingRow.locator('button:has-text("Reservera")').click();
    // Verifiera att status uppdaterades till reserved (Undanlagd)
    await expect(bookingRow).toContainText('Undanlagd');

    // 4. Bekräfta hämtning (ändra status till confirmed)
    await bookingRow.locator('button:has-text("Bekräfta hämtning")').click();
    // Verifiera att status uppdaterades till confirmed (Hämtad)
    await expect(bookingRow).toContainText('Hämtad');
  });
});
