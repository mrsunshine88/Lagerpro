import { test, expect, request } from '@playwright/test';

async function resetDatabase() {
  const context = await request.newContext();
  const response = await context.post('http://localhost:3000/api/test/reset');
  if (!response.ok()) {
    throw new Error('Failed to reset database');
  }
}

test.describe('Autentisering & Åtkomstkontroll', () => {
  test.beforeEach(async () => {
    await resetDatabase();
  });

  test('ska kunna logga in som admin och se alla flikar', async ({ page }) => {
    await page.goto('/');

    // 1. Öppna inloggningsmodalen
    await page.click('button:has-text("Personalinloggning")');
    await expect(page.locator('.modal-card')).toBeVisible();

    // 2. Fyll i felaktiga uppgifter först
    await page.fill('input[type="email"]', 'wrong@admin.com');
    await page.fill('input[type="password"]', 'wrongpass');
    await page.click('button[type="submit"]');
    
    // Verifiera att felmeddelande visas
    await expect(page.locator('text=Felaktig e-postadress eller lösenord')).toBeVisible();

    // 3. Logga in med korrekta admin-uppgifter
    await page.fill('input[type="email"]', 'apersson508@gmail.com');
    await page.fill('input[type="password"]', '020406');
    await page.click('button[type="submit"]');

    // 4. Verifiera att vi är inloggade och ser admin-flikar
    await expect(page.locator('.nav-tab:has-text("Startmeny")')).toBeVisible();
    await expect(page.locator('.nav-tab:has-text("Kassa (POS)")')).toBeVisible();
    await expect(page.locator('.nav-tab:has-text("Lagerregister")')).toBeVisible();
    await expect(page.locator('.nav-tab:has-text("Bokningar")')).toBeVisible();
    await expect(page.locator('.nav-tab:has-text("Ekonomi & Statistik")')).toBeVisible(); // Admin only tab
    await expect(page.locator('button[title="Admin-panel"]')).toBeVisible(); // Admin only button

    // 5. Logga ut
    await page.click('button[title="Logga ut"]');
    
    // Verifiera att vi är utloggade och ser publika portalen igen
    await expect(page.locator('text=Personalinloggning')).toBeVisible();
    await expect(page.locator('text=Butikens Bokningsportal')).toBeVisible();
  });

  test('ska kunna logga in som cashier och inte se admin-funktioner', async ({ page }) => {
    await page.goto('/');

    // 1. Logga in som cashier (staff@test.com / staff123)
    await page.click('button:has-text("Personalinloggning")');
    await page.fill('input[type="email"]', 'staff@test.com');
    await page.fill('input[type="password"]', 'staff123');
    await page.click('button[type="submit"]');

    // 2. Verifiera inloggningsvyer för vanlig personal
    await expect(page.locator('.nav-tab:has-text("Startmeny")')).toBeVisible();
    await expect(page.locator('.nav-tab:has-text("Kassa (POS)")')).toBeVisible();
    await expect(page.locator('.nav-tab:has-text("Lagerregister")')).toBeVisible();
    await expect(page.locator('.nav-tab:has-text("Bokningar")')).toBeVisible();
    
    // 3. Verifiera att admin-flikar och knappar INTE visas
    await expect(page.locator('.nav-tab:has-text("Ekonomi & Statistik")')).not.toBeVisible();
    await expect(page.locator('button[title="Admin-panel"]')).not.toBeVisible();
  });
});
