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

const TOM_PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=', 'base64');
const KARTA = (id: string, q = '') => `${server.url}/dist/index.html?data=/tests/fixtures/data/#/karta/${id}${q ? `?${q}` : ''}`;

async function cartoTom(page: import('@playwright/test').Page): Promise<string[]> {
  const rutor: string[] = [];
  await page.route('https://basemaps.cartocdn.com/**', (r) => {
    rutor.push(r.request().url());
    return r.fulfill({ body: TOM_PNG, contentType: 'image/png', headers: { 'Access-Control-Allow-Origin': '*' } });
  });
  return rutor;
}
async function vantaKarta(page: import('@playwright/test').Page, minst = 1) {
  await page.waitForFunction((n) => ((window as any).__karta?.rendercomplete ?? 0) >= n, minst, { timeout: 30_000 });
}
async function hovra(page: import('@playwright/test').Page, x: number, y: number, epsg: number) {
  const [px, py] = await page.evaluate(([x, y, e]) => (window as any).__karta.pixelFor(x, y, e) as [number, number], [x, y, epsg] as const);
  await page.mouse.move(px, py);
  return [px, py] as const;
}
async function fargVid(page: import('@playwright/test').Page, x: number, y: number): Promise<number[]> {
  const png = await page.screenshot({ clip: { x: Math.round(x), y: Math.round(y), width: 1, height: 1 } });
  return page.evaluate(async (b64) => {
    const bild = await createImageBitmap(await (await fetch(`data:image/png;base64,${b64}`)).blob());
    const duk = new OffscreenCanvas(1, 1);
    const ctx = duk.getContext('2d')!;
    ctx.drawImage(bild, 0, 0);
    return Array.from(ctx.getImageData(0, 0, 1, 1).data.slice(0, 3));
  }, png.toString('base64'));
}

test.describe('kartvyn', () => {
  test('visar kartan, värdet under pekaren och växlar till den kontinuerliga', async ({ page }) => {
    const rutor = await cartoTom(page);
    await page.goto(KARTA('torsk-test'));
    await vantaKarta(page);
    expect(rutor.length).toBeGreaterThan(0);
    await hovra(page, 613287.5, 6636712.5, 3006);
    await expect(page.getByTestId('varde')).toHaveText('Mycket viktigt');
    await page.getByRole('radio', { name: 'Kontinuerlig' }).check();
    await vantaKarta(page, 2);
    await hovra(page, 613287.5, 6636712.5, 3006);
    await expect(page.getByTestId('varde')).toHaveText('0.75');
    expect(new URL(page.url()).hash).toContain('lager=kontinuerlig');
  });

  test('PanBalticScope: ingen växling, klass 0 och nodata under pekaren, visningskopian laddas', async ({ page }) => {
    await cartoTom(page);
    const tif: string[] = [];
    page.on('request', (r) => r.url().endsWith('.tif') && tif.push(r.url()));
    await page.goto(KARTA('pbs-test'));
    await vantaKarta(page);
    await expect(page.getByRole('radio', { name: 'Kontinuerlig' })).toHaveCount(0);
    await hovra(page, 1801000, 8003000, 3857);
    await expect(page.getByTestId('varde')).toHaveText('Ej viktigt område');
    await hovra(page, 1803000, 8001000, 3857);
    await expect(page.getByTestId('varde')).toHaveText('—');
    expect(tif.every((u) => u.endsWith('/v2/visning_3006.tif'))).toBe(true);
  });

  test('genomskinlighet 0 döljer kartan men pekaren visar värdet', async ({ page }) => {
    await page.goto(KARTA('torsk-test', 'bakgrund=ingen&opacitet=0'));
    await vantaKarta(page);
    const [px, py] = await hovra(page, 613287.5, 6636712.5, 3006);
    await expect(page.getByTestId('varde')).toHaveText('Mycket viktigt');
    await page.mouse.move(5, 5);
    // Kartytans egen bakgrund (#eef2f3) syns rakt igenom datalagret.
    expect(await fargVid(page, px, py)).toEqual([238, 242, 243]);
    await expect(page.getByLabel('Opacitet')).toHaveValue('0');
  });

  test('bakgrund=ingen hämtar inga CARTO-rutor', async ({ page }) => {
    const rutor = await cartoTom(page);
    await page.goto(KARTA('torsk-test', 'bakgrund=ingen'));
    await vantaKarta(page);
    expect(rutor).toHaveLength(0);
    await page.getByRole('radio', { name: 'CARTO' }).check();
    await expect.poll(() => rutor.length).toBeGreaterThan(0);
  });

  test('alla fyra testkartor öppnas utan fel i konsolen', async ({ page }) => {
    await cartoTom(page);
    const fel: string[] = [];
    page.on('console', (m) => m.type() === 'error' && fel.push(m.text()));
    page.on('pageerror', (e) => fel.push(String(e)));
    const tif: string[] = [];
    page.on('request', (r) => r.url().endsWith('.tif') && tif.push(r.url()));
    for (const id of ['torsk-test', 'pbs-test', 'tral-test', 'dold-test']) {
      await page.goto(KARTA(id));
      await vantaKarta(page);
    }
    expect(tif.some((u) => u.endsWith('tral-test/v1/visning_3006.tif'))).toBe(true);
    expect(fel).toEqual([]);
  });
});

async function stallVy(page: import('@playwright/test').Page, x: number, y: number, upp: number) {
  const fore = await page.evaluate(() => (window as any).__karta.rendercomplete as number);
  await page.evaluate(([x, y, upp]) => {
    const vy = (window as any).__karta.karta.getView();
    vy.setCenter([x, y]);
    vy.setResolution(upp);
  }, [x, y, upp] as const);
  await vantaKarta(page, fore + 1);
}
const fordroj = (page: import('@playwright/test').Page, monster: string, ms: number) =>
  page.route(monster, async (r) => {
    await new Promise((klar) => setTimeout(klar, ms));
    await r.continue();
  });

test.describe('värde under pekaren', () => {
  test('nära full upplösning: ≈ först, sedan det exakta värdet, och koordinater', async ({ page }) => {
    await page.goto(KARTA('torsk-test', 'bakgrund=ingen&lager=kontinuerlig'));
    await vantaKarta(page);
    await stallVy(page, 613287.5, 6636712.5, 75);
    await fordroj(page, '**/radata.tif', 600);
    await hovra(page, 613287.5, 6636712.5, 3006);
    await expect(page.getByTestId('varde')).toHaveText('≈0.75');
    await expect(page.getByTestId('varde')).toHaveText('0.75');
    await expect(page.getByTestId('koordinat-sweref')).toHaveText(/^N 66\d{5}, E 61\d{4}$/);
    await expect(page.getByTestId('koordinat-wgs84')).toHaveText(/^59\.\d{5}° N, 1[0-9]\.\d{5}° E$/);
  });

  test('pekaren flyttas innan svaret kommer: aldrig det gamla värdet', async ({ page }) => {
    await page.goto(KARTA('torsk-test', 'bakgrund=ingen&lager=kontinuerlig'));
    await vantaKarta(page);
    await stallVy(page, 613287.5, 6636712.5, 75);
    await fordroj(page, '**/radata.tif', 1000);
    await hovra(page, 613287.5, 6636712.5, 3006);
    await page.waitForTimeout(400);
    await hovra(page, 607487.5, 6642512.5, 3006);
    await expect(page.getByTestId('varde')).toHaveText('—');
    await page.waitForTimeout(1500);
    await expect(page.getByTestId('varde')).toHaveText('—');
  });

  test('långt utzoomat: översiktsvärdet med ≈ och ingen hämtning', async ({ page }) => {
    await page.goto(KARTA('torsk-test', 'bakgrund=ingen'));
    await vantaKarta(page);
    await stallVy(page, 630762.5, 6619237.5, 400);
    const tif: string[] = [];
    page.on('request', (r) => r.url().endsWith('.tif') && tif.push(r.url()));
    await hovra(page, 630762.5, 6619237.5, 3006);
    await expect(page.getByTestId('varde')).toHaveText('≈ Mycket viktigt');
    await expect(page.getByTestId('varde-tips')).toHaveText('Översiktsvärde – zooma in för exakt värde');
    const antal = tif.length;
    await page.waitForTimeout(700);
    await expect(page.getByTestId('varde')).toHaveText('≈ Mycket viktigt');
    expect(tif.length).toBe(antal);
  });
});
