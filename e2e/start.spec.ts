/**
 * V2-startscherm — elke startactie end-to-end, met echte klikken.
 *
 *   Nieuwe soundscape → wizard · Kies een wereld → kaart van die wereld ·
 *   Ik heb een code → codevenster · Voor docenten → /teacher ·
 *   Hoe werkt het? → uitleg · hulp → feedbackvenster · Privacy · taalknop.
 *
 * Ook: geen horizontale scroll en de hoofdknop boven de vouw op een telefoon.
 */
import { test, expect, type Page } from '@playwright/test';
import { prepare } from './helpers';

async function screenOf(page: Page): Promise<string> {
  return page.evaluate(async () => {
    const { useAppStore } = await import('/src/stores/appStore.ts');
    return useAppStore.getState().currentScreen;
  });
}

test.beforeEach(async ({ page }) => {
  await prepare(page);
  await page.goto('/');
  await expect(page.getByRole('button', { name: 'Nieuwe soundscape' })).toBeVisible();
});

test('Nieuwe soundscape opent de keuzeflow', async ({ page }) => {
  await page.getByRole('button', { name: 'Nieuwe soundscape' }).click();
  await expect(page.getByText('Hoe wil je componeren?')).toBeVisible();
});

test('Kies een wereld → de kaart van die wereld', async ({ page }) => {
  await page.getByRole('button', { name: 'Kies een wereld' }).click();
  const dialog = page.getByRole('dialog', { name: 'Kies je wereld' });
  await expect(dialog).toBeVisible();
  // Een andere wereld dan de standaard: bewijst dat de keuze doorwerkt
  await dialog.getByRole('button', { name: /Winterspelen/ }).click();
  await expect(page.getByTitle('Skipiste')).toBeVisible({ timeout: 20_000 });
  expect(await screenOf(page)).toBe('map');
  expect(new URL(page.url()).pathname).toBe('/kaart');
  const themeId = await page.evaluate(async () => {
    const { useThemeStore } = await import('/src/stores/themeStore.ts');
    return useThemeStore.getState().activeThemeId;
  });
  expect(themeId).toBe('winterspelen');
});

test('Ik heb een code opent het codevenster', async ({ page }) => {
  await page.getByRole('button', { name: 'Ik heb een code' }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await expect(page.getByRole('dialog').locator('input').first()).toBeVisible();
});

test('Voor docenten gaat naar /teacher', async ({ page }) => {
  await page.getByRole('button', { name: 'Voor docenten' }).click();
  await expect.poll(() => new URL(page.url()).pathname).toBe('/teacher');
});

test('Hoe werkt het? opent de uitleg', async ({ page }) => {
  await page.getByRole('button', { name: 'Hoe werkt het?' }).click();
  await expect.poll(() => screenOf(page)).toBe('tutorial');
});

test('hulp of bug melden opent het feedbackvenster', async ({ page }) => {
  await page.getByRole('button', { name: 'Hulp nodig of bug melden?' }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
});

test('Privacy opent het privacyvenster', async ({ page }) => {
  await page.getByRole('button', { name: 'Privacy' }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
});

test('Over SoundScout linkt naar /over', async ({ page }) => {
  await expect(page.getByRole('link', { name: 'Over SoundScout' })).toHaveAttribute('href', '/over');
});

test('taalknop schakelt naar Engels en terug', async ({ page }) => {
  await page.getByRole('button', { name: 'English' }).click();
  await expect(page.getByRole('button', { name: 'New soundscape' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'I have a code' })).toBeVisible();
  await page.getByRole('button', { name: 'Nederlands' }).click();
  await expect(page.getByRole('button', { name: 'Nieuwe soundscape' })).toBeVisible();
});

test.describe('telefoon staand (390×844)', () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test('geen horizontale scroll, hoofdknop en code in beeld', async ({ page }) => {
    const overflowX = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(overflowX).toBeLessThanOrEqual(0);
    await expect(page.getByRole('button', { name: 'Nieuwe soundscape' })).toBeInViewport();
    await expect(page.getByRole('button', { name: 'Ik heb een code' })).toBeInViewport();
    await expect(page.getByRole('button', { name: 'Voor docenten' })).toBeInViewport();
  });
});

test.describe('telefoon liggend (844×390)', () => {
  test.use({ viewport: { width: 844, height: 390 } });

  test('hoofdknoppen boven de vouw', async ({ page }) => {
    await expect(page.getByRole('button', { name: 'Nieuwe soundscape' })).toBeInViewport({ ratio: 1 });
    await expect(page.getByRole('button', { name: 'Kies een wereld' })).toBeInViewport({ ratio: 1 });
  });
});
