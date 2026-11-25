// Tillgänglighet: automatisk granskning mot WCAG 2.1 A och AA med axe, för varje vy på dator och
// mobil. Kraven och den manuella granskningen står i docs/wcag-granskning.md.
import { expect, test, type Page } from '@playwright/test';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { startaRangeServer } from './range-server';
import { cartoTom, granska, KARTA, SIDA, START, vantaKarta } from './hjalp';

const WEBB = resolve(dirname(fileURLToPath(import.meta.url)), '..');
let server: Awaited<ReturnType<typeof startaRangeServer>>;

test.beforeAll(async () => {
  server = await startaRangeServer(WEBB);
});
test.afterAll(async () => {
  await server.stang();
});

type Fall = { namn: string; adress: () => string; karta?: boolean; sedan?: (page: Page) => Promise<void> };

const klicka = (namn: string) => async (page: Page) => {
  await page.getByRole('button', { name: namn }).click();
};

const DATOR: Fall[] = [
  { namn: 'startsidan', adress: () => START(server.url) },
  { namn: 'startsidan med sökning', adress: () => START(server.url, 'q=torsk') },
  { namn: 'klassad karta', adress: () => KARTA(server.url, 'torsk-test'), karta: true },
  { namn: 'kontinuerlig karta', adress: () => KARTA(server.url, 'torsk-test', 'lager=kontinuerlig'), karta: true },
  { namn: 'karta med Lagerval öppen', adress: () => KARTA(server.url, 'torsk-test'), karta: true, sedan: klicka('Lagerval') },
  { namn: 'Om-sidan', adress: () => SIDA(server.url, 'om') },
  { namn: 'tillgänglighetssidan', adress: () => SIDA(server.url, 'tillganglighet') },
];

const MOBIL: Fall[] = [
  { namn: 'startsidan', adress: () => START(server.url) },
  { namn: 'karta med fliken nere', adress: () => KARTA(server.url, 'torsk-test'), karta: true },
  { namn: 'karta med fliken uppe', adress: () => KARTA(server.url, 'torsk-test'), karta: true, sedan: klicka('Visa mer om kartan') },
  { namn: 'karta med menyn öppen', adress: () => KARTA(server.url, 'torsk-test'), karta: true, sedan: klicka('Meny') },
  { namn: 'Om-sidan', adress: () => SIDA(server.url, 'om') },
];

async function oppna(page: Page, fall: Fall) {
  await cartoTom(page);
  await page.goto(fall.adress());
  if (fall.karta) await vantaKarta(page);
  else await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  await fall.sedan?.(page);
}

test.describe('axe, dator 1280 × 720', () => {
  test.use({ viewport: { width: 1280, height: 720 } });
  for (const fall of DATOR) {
    test(fall.namn, async ({ page }) => {
      await oppna(page, fall);
      expect(await granska(page)).toEqual([]);
    });
  }
});

test.describe('axe, mobil 375 × 812', () => {
  test.use({ viewport: { width: 375, height: 812 } });
  for (const fall of MOBIL) {
    test(fall.namn, async ({ page }) => {
      await oppna(page, fall);
      expect(await granska(page)).toEqual([]);
    });
  }
});
