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
  await page.getByRole('button', { name: namn, exact: true }).click();
};

const DATOR: Fall[] = [
  { namn: 'startsidan', adress: () => START(server.url) },
  { namn: 'startsidan med sökning', adress: () => START(server.url, 'q=torsk') },
  { namn: 'startsidan med valt filter', adress: () => START(server.url, 'rodlista=Starkt%20hotad%20(EN)') },
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

// Det element som visar fokus: etiketten när en dold radioknapp i Lagerval har fokus.
async function fokusSyns(page: Page): Promise<{ tagg: string; text: string; ram: string }> {
  return page.evaluate(() => {
    const aktiv = document.activeElement as HTMLElement;
    const visar = (aktiv.closest('label') as HTMLElement | null) ?? aktiv;
    return { tagg: aktiv.tagName, text: (visar.textContent ?? '').trim().slice(0, 40), ram: getComputedStyle(visar).outlineStyle };
  });
}

test.describe('manuell granskning, automatiserad', () => {
  test('tangentbord: hela flödet', async ({ page }) => {
    await cartoTom(page);
    await page.goto(START(server.url));
    const steg: { tagg: string; text: string; ram: string }[] = [];
    const tryck = async (tangent: string) => {
      await page.keyboard.press(tangent);
      steg.push(await fokusSyns(page));
    };
    // Sidhuvud: hopplänk, (logotypen är ingen länk), namn, Kartor, Om portalen, In English, sedan sökfältet.
    for (let i = 0; i < 10 && (await page.evaluate(() => document.activeElement?.getAttribute('role'))) !== 'combobox'; i++) await tryck('Tab');
    await expect(page.getByRole('combobox')).toBeFocused();
    await page.keyboard.type('torsk');
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('Enter');
    await expect(page.getByTestId('traff')).toHaveCount(1);
    for (let i = 0; i < 40 && !(await page.evaluate(() => !!document.activeElement?.closest('[data-testid=traff]'))); i++) await tryck('Tab');
    await page.keyboard.press('Enter');
    await expect(page).toHaveTitle(/^Torsk/);
    await vantaKarta(page);
    for (let i = 0; i < 40 && !(await page.getByRole('button', { name: 'Lagerval' }).evaluate((b) => b === document.activeElement)); i++) await tryck('Tab');
    await expect(page.getByRole('button', { name: 'Lagerval' })).toBeFocused();
    await tryck('Enter');
    await expect(page.getByRole('button', { name: 'Lagerval' })).toBeFocused();
    await tryck('Tab');
    await expect(page.getByRole('radio', { name: 'Klassad' })).toBeFocused();
    await tryck('ArrowRight');
    await expect(page.getByRole('radio', { name: 'Kontinuerlig' })).toBeChecked();
    await expect.poll(() => new URL(page.url()).hash).toContain('lager=kontinuerlig');
    await tryck('Escape');
    await expect(page.getByRole('button', { name: 'Lagerval' })).toBeFocused();
    for (let i = 0; i < 40 && !(await page.getByRole('link', { name: 'Klassad karta' }).evaluate((a) => a === document.activeElement)); i++) await tryck('Tab');
    await expect(page.getByRole('link', { name: 'Klassad karta' })).toBeFocused();
    const utan = steg.filter((s) => s.ram === 'none' && s.tagg !== 'BODY');
    expect(utan, JSON.stringify(utan)).toEqual([]);
  });

  test('omflödning vid 320 px', async ({ page }) => {
    await cartoTom(page);
    await page.setViewportSize({ width: 320, height: 640 });
    for (const adress of [START(server.url), SIDA(server.url, 'om'), SIDA(server.url, 'tillganglighet'), KARTA(server.url, 'torsk-test')]) {
      await page.goto(adress);
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
      expect(await page.evaluate(() => document.documentElement.scrollWidth), adress).toBeLessThanOrEqual(320);
    }
  });

  test('zoom 200 %', async ({ page }) => {
    await cartoTom(page);
    await page.setViewportSize({ width: 640, height: 360 });
    await page.goto(KARTA(server.url, 'torsk-test'));
    await vantaKarta(page);
    for (const kontroll of [page.getByRole('button', { name: 'Lagerval' }), page.getByRole('button', { name: 'Visa mer om kartan' })]) {
      await kontroll.scrollIntoViewIfNeeded();
      await expect(kontroll).toBeInViewport();
    }
  });

  test('textavstånd', async ({ page }) => {
    await cartoTom(page);
    await page.goto(KARTA(server.url, 'torsk-test'));
    await vantaKarta(page);
    await page.addStyleTag({
      content: '* { line-height: 1.5 !important; letter-spacing: .12em !important; word-spacing: .16em !important } p { margin-bottom: 2em !important }',
    });
    const panel = page.locator('.panel');
    expect(await panel.evaluate((p) => p.scrollWidth <= p.clientWidth)).toBe(true);
    const klippta = await page.evaluate(() =>
      [...document.querySelectorAll('button')].filter((b) => b.offsetParent && b.scrollWidth > b.clientWidth + 1).map((b) => b.textContent?.trim()),
    );
    expect(klippta).toEqual([]);
  });
});

test.describe('rättelser efter den manuella granskningen', () => {
  test('zoomknapparna har namn på båda språken', async ({ page }) => {
    await cartoTom(page);
    await page.goto(KARTA(server.url, 'torsk-test'));
    await vantaKarta(page);
    await expect(page.getByRole('button', { name: 'Zooma in' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Zooma ut' })).toBeVisible();
    await page.getByTestId('sprak').click();
    await expect(page.getByRole('button', { name: 'Zoom in' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Zoom out' })).toBeVisible();
  });

  test('sidhuvudets meny och listan i kartvyn har var sitt namn', async ({ page }) => {
    await cartoTom(page);
    await page.goto(KARTA(server.url, 'torsk-test'));
    await expect(page.getByRole('navigation', { name: 'Huvudmeny' })).toHaveCount(1);
    await expect(page.getByRole('navigation', { name: 'Alla kartor' })).toHaveCount(1);
  });

  test('kartan går att flytta och zooma med tangentbordet', async ({ page }) => {
    await cartoTom(page);
    await page.goto(KARTA(server.url, 'torsk-test'));
    await vantaKarta(page);
    const karta = page.getByRole('application', { name: /^Karta\./ });
    await karta.focus();
    await expect(karta).toBeFocused();
    expect(await karta.evaluate((e) => getComputedStyle(e).outlineStyle)).not.toBe('none');
    const fore = await page.evaluate(() => (window as any).__karta.karta.getView().getCenter() as number[]);
    await page.keyboard.press('ArrowRight');
    await expect
      .poll(() => page.evaluate(() => (window as any).__karta.karta.getView().getCenter()[0] as number))
      .toBeGreaterThan(fore[0]);
    const upp = await page.evaluate(() => (window as any).__karta.karta.getView().getResolution() as number);
    await page.keyboard.press('+');
    await expect.poll(() => page.evaluate(() => (window as any).__karta.karta.getView().getResolution() as number)).toBeLessThan(upp);
  });

  test('kartans panel är en region med kartans namn', async ({ page }) => {
    await cartoTom(page);
    await page.goto(KARTA(server.url, 'torsk-test'));
    const panel = page.getByRole('region', { name: 'Torsk större än 20 cm, uppväxt, västkusten (test)' });
    await expect(panel.getByRole('heading', { level: 1 })).toBeVisible();
    await expect(page.getByRole('complementary')).toHaveCount(0);
  });
});
