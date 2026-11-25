import { expect, test } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { startaRangeServer } from './range-server';

const WEBB = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const EXEMPEL = readFileSync(resolve(WEBB, '..', 'schema', 'exempel', 'katalog.json'));
let server: Awaited<ReturnType<typeof startaRangeServer>>;

test.beforeAll(async () => {
  server = await startaRangeServer(WEBB);
});
test.afterAll(async () => {
  await server.stang();
});

test.describe('appskalet', () => {
  test('visar sidhuvud, byter språk och behåller ?data= i adressen', async ({ page }) => {
    await page.route('**/exempel/katalog/katalog.json', (r) =>
      r.fulfill({ body: EXEMPEL, contentType: 'application/json' }),
    );
    await page.goto(`${server.url}/dist/index.html?data=/exempel/#/`);
    await expect(page.locator('.namn')).toHaveText('Fiskkartor');
    await expect(page.getByTestId('traff')).toHaveCount(1);

    await page.getByTestId('sprak').click();
    await expect(page.locator('.namn')).toHaveText('Fish maps');
    expect(await page.evaluate(() => document.documentElement.lang)).toBe('en');
    expect(new URL(page.url()).search).toBe('?data=/exempel/');
    expect(new URL(page.url()).hash).toBe('#/?lang=en');

    await page.goBack();
    await expect(page.locator('.namn')).toHaveText('Fiskkartor');
  });

  test('säger till när katalogen inte kan hämtas', async ({ page }) => {
    await page.goto(`${server.url}/dist/index.html?data=/finns-inte/#/`);
    await expect(page.getByRole('alert')).toContainText('Kartkatalogen kunde inte hämtas');
  });
});

const START = () => `${server.url}/dist/index.html?data=/tests/fixtures/data/#/`;

test.describe('startsidan', () => {
  test('visar projektkort och bara synliga kartor', async ({ page }) => {
    await page.goto(START());
    await expect(page.getByTestId('traff')).toHaveCount(3);
    await expect(page.getByTestId('projekt-NMK')).toContainText('2 kartor');
    await expect(page.getByTestId('projekt-PanBalticScope')).toContainText('1 karta');
    await expect(page.getByText('Sill, dold (test)')).toHaveCount(0);
  });

  test('sök med förslag, filter i adressen, omladdning och bakåt', async ({ page }) => {
    await page.goto(START());
    const sok = page.getByRole('combobox');
    await sok.fill('torsk');
    await expect(page.getByRole('option').first()).toHaveText('Torsk');
    await expect(page.getByTestId('traff')).toHaveCount(1);
    await expect(page.getByTestId('traff')).toContainText('Torsk större än 20 cm');
    let url = new URL(page.url());
    expect(url.search).toBe('?data=/tests/fixtures/data/');
    expect(url.hash).toBe('#/?q=torsk');

    await sok.fill('');
    await page.keyboard.press('Escape');
    const projekt = page.getByRole('group', { name: 'Projekt' });
    await projekt.getByRole('button', { name: /PanBalticScope/ }).click();
    await expect(page.getByTestId('traff')).toHaveCount(1);
    await expect(page.getByTestId('traff')).toContainText('Perch spawning');
    url = new URL(page.url());
    expect(url.hash).toBe('#/?projekt=PanBalticScope');

    await page.reload();
    await expect(projekt.getByRole('button', { name: /PanBalticScope/ })).toHaveAttribute('aria-pressed', 'true');
    await expect(page.getByTestId('traff')).toHaveCount(1);

    await page.goBack();
    await expect(page.getByTestId('traff')).toHaveCount(3);
  });

  test('å, ä och ö i sökningen klarar omladdning', async ({ page }) => {
    await page.goto(START());
    await page.getByRole('combobox').fill('östersjön');
    await expect(page.getByTestId('traff')).toHaveCount(1);
    await page.reload();
    await expect(page.getByRole('combobox')).toHaveValue('östersjön');
    await expect(page.getByTestId('traff')).toHaveCount(1);
  });

  test('skrivande fyller inte bakåtknappen', async ({ page }) => {
    await page.goto(START());
    await page.getByRole('link', { name: 'Om portalen' }).click();
    await page.getByRole('link', { name: 'Kartor', exact: true }).click();
    await page.getByRole('combobox').pressSequentially('torsk');
    await expect(page.getByTestId('traff')).toHaveCount(1);
    await page.goBack();
    expect(new URL(page.url()).hash).toBe('#/om');
  });

  test('en träff länkar till kartan och behåller språket', async ({ page }) => {
    await page.goto(START().replace('#/', '#/?lang=en'));
    await expect(page.getByTestId('traff').first().getByRole('link')).toHaveAttribute('href', /#\/karta\/[a-z-]+\?lang=en$/);
  });
});
