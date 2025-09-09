import { expect, test } from '../fixtures';

test.describe('Onboarding', () => {
  test('first visit redirects to onboarding', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForURL(/onboarding/);
    await expect(page).toHaveURL(/onboarding/);
  });
});


