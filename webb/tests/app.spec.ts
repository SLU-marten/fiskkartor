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
    await expect(page.getByTestId('varde')).toHaveText(/^(≈ )?Mycket viktigt$/);
    await page.getByRole('radio', { name: 'Kontinuerlig' }).check();
    await vantaKarta(page, 2);
    await hovra(page, 613287.5, 6636712.5, 3006);
    await expect(page.getByTestId('varde')).toHaveText(/^≈?0\.75$/);
    expect(new URL(page.url()).hash).toContain('lager=kontinuerlig');
  });

  test('PanBalticScope: ingen växling, klass 0 och nodata under pekaren, visningskopian laddas', async ({ page }) => {
    await cartoTom(page);
    const tif: string[] = [];
    page.on('request', (r) => new URL(r.url()).pathname.endsWith('.tif') && tif.push(r.url()));
    await page.goto(KARTA('pbs-test'));
    await vantaKarta(page);
    await expect(page.getByRole('radio', { name: 'Kontinuerlig' })).toHaveCount(0);
    await hovra(page, 1801000, 8003000, 3857);
    await expect(page.getByTestId('varde')).toHaveText(/^(≈ )?Ej viktigt område$/);
    await hovra(page, 1803000, 8001000, 3857);
    await expect(page.getByTestId('varde')).toHaveText('—');
    expect(tif.length).toBeGreaterThan(0);
    expect(tif.every((u) => new URL(u).pathname.endsWith('/v2/visning_3006.tif'))).toBe(true);
    expect(new Set(tif.map((u) => new URL(u).searchParams.get('h')))).toEqual(new Set([expect.stringMatching(/^[0-9a-f]{12}$/)]));
  });

  test('genomskinlighet 0 döljer kartan men pekaren visar värdet', async ({ page }) => {
    await page.goto(KARTA('torsk-test', 'bakgrund=ingen&opacitet=0'));
    await vantaKarta(page);
    const [px, py] = await hovra(page, 613287.5, 6636712.5, 3006);
    await expect(page.getByTestId('varde')).toHaveText(/^(≈ )?Mycket viktigt$/);
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
    page.on('request', (r) => new URL(r.url()).pathname.endsWith('.tif') && tif.push(r.url()));
    for (const id of ['torsk-test', 'pbs-test', 'tral-test', 'dold-test']) {
      await page.goto(KARTA(id));
      await vantaKarta(page);
    }
    expect(tif.some((u) => new URL(u).pathname.endsWith('tral-test/v1/visning_3006.tif'))).toBe(true);
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
  test('kontinuerlig nära full upplösning: ≈ först, sedan det exakta värdet, och koordinater', async ({ page }) => {
    await page.goto(KARTA('torsk-test', 'bakgrund=ingen&lager=kontinuerlig'));
    await vantaKarta(page);
    await stallVy(page, 613287.5, 6636712.5, 40);
    await fordroj(page, '**/radata.tif*', 600);
    await hovra(page, 613287.5, 6636712.5, 3006);
    await expect(page.getByTestId('varde')).toHaveText('≈0.75');
    await expect(page.getByTestId('varde')).toHaveText('0.75');
    await expect(page.getByTestId('koordinat-sweref')).toHaveText(/^N 66\d{5}, E 61\d{4}$/);
    await expect(page.getByTestId('koordinat-wgs84')).toHaveText(/^59\.\d{5}° N, 1[0-9]\.\d{5}° E$/);
  });

  test('pekaren flyttas innan svaret kommer: aldrig det gamla värdet', async ({ page }) => {
    await page.goto(KARTA('torsk-test', 'bakgrund=ingen&lager=kontinuerlig'));
    await vantaKarta(page);
    await stallVy(page, 613287.5, 6636712.5, 40);
    await fordroj(page, '**/radata.tif*', 1000);
    await hovra(page, 613287.5, 6636712.5, 3006);
    await page.waitForTimeout(400);
    await hovra(page, 607487.5, 6642512.5, 3006);
    await expect(page.getByTestId('varde')).toHaveText('—');
    await page.waitForTimeout(1500);
    await expect(page.getByTestId('varde')).toHaveText('—');
  });

  test('klassad gles ruta nära full upplösning: översiktsvärdet står kvar och inget hämtas', async ({ page }) => {
    await page.goto(KARTA('torsk-test', 'bakgrund=ingen'));
    await vantaKarta(page);
    await stallVy(page, 630762.5, 6619237.5, 40);
    const tif: string[] = [];
    page.on('request', (r) => new URL(r.url()).pathname.endsWith('.tif') && tif.push(r.url()));
    await hovra(page, 630762.5, 6619237.5, 3006);
    await expect(page.getByTestId('varde')).toHaveText('≈ Mycket viktigt');
    const antal = tif.length;
    await page.waitForTimeout(800);
    await expect(page.getByTestId('varde')).toHaveText('≈ Mycket viktigt');
    expect(tif.length).toBe(antal);
  });

  test('långt utzoomat: översiktsvärdet med ≈ och ingen hämtning', async ({ page }) => {
    await page.goto(KARTA('torsk-test', 'bakgrund=ingen'));
    await vantaKarta(page);
    await stallVy(page, 630762.5, 6619237.5, 400);
    const tif: string[] = [];
    page.on('request', (r) => new URL(r.url()).pathname.endsWith('.tif') && tif.push(r.url()));
    await hovra(page, 630762.5, 6619237.5, 3006);
    await expect(page.getByTestId('varde')).toHaveText('≈ Mycket viktigt');
    await expect(page.getByTestId('varde-tips')).toHaveText('Översiktsvärde – zooma in för exakt värde');
    const antal = tif.length;
    await page.waitForTimeout(700);
    await expect(page.getByTestId('varde')).toHaveText('≈ Mycket viktigt');
    expect(tif.length).toBe(antal);
  });
});

test.describe('panelen', () => {
  test('legenden visar bara färgade klasser, och 0–1 för den kontinuerliga', async ({ page }) => {
    await cartoTom(page);
    await page.goto(KARTA('pbs-test'));
    const legend = page.getByTestId('legend');
    await expect(legend.getByRole('listitem')).toHaveText(['Viktigt', 'Mycket viktigt']);
    await page.goto(KARTA('torsk-test', 'lager=kontinuerlig'));
    await expect(page.getByTestId('legend')).toContainText('0');
    await expect(page.getByTestId('legend')).toContainText('1');
    await expect(page.getByTestId('legend')).toContainText('Sannolikhet');
  });

  test('metadata: kvalitet, källa, citering, kontakt, licens och ifyllda fält', async ({ page }) => {
    await cartoTom(page);
    await page.goto(KARTA('torsk-test'));
    const m = page.getByTestId('metadata');
    await expect(m).toContainText('Testdata med kända värden.');
    await expect(m).toContainText('Nationell marin kartering (Ryssja)');
    await expect(m).toContainText('Testsson m fl 2021');
    await expect(m).toContainText('CC BY 4.0');
    await expect(m).toContainText('Starkt hotad (EN)');
    await expect(m).toContainText('Mjukbotten');
    await expect(m).not.toContainText('Fiskbarometern');
    await expect(m.getByRole('link', { name: 'SLU-Aqua-fiskkartor@slu.se' })).toHaveAttribute(
      'href',
      'mailto:SLU-Aqua-fiskkartor@slu.se',
    );
  });

  test('nedladdning: originalfilerna med beskrivande namn, metadata som JSON och text', async ({ page }) => {
    await cartoTom(page);
    await page.goto(KARTA('pbs-test'));
    const n = page.getByTestId('nedladdning');
    const klassad = n.getByRole('link', { name: /Klassad karta/ });
    await expect(klassad).toHaveAttribute('href', /\/tests\/fixtures\/data\/kartor\/panbalticscope\/pbs-test\/v2\/visning\.tif$/);
    await expect(klassad).toHaveAttribute('download', 'pbs-test_v2_klassad.tif');
    await expect(n.getByRole('link', { name: /Metadata \(JSON\)/ })).toHaveAttribute('download', 'pbs-test_v2_metadata.json');
    const [hamtning] = await Promise.all([page.waitForEvent('download'), n.getByRole('link', { name: /Metadata \(text\)/ }).click()]);
    expect(hamtning.suggestedFilename()).toBe('pbs-test_v2_metadata.txt');
    const text = readFileSync((await hamtning.path())!, 'utf8');
    expect(text).toContain('Perch spawning, Baltic Sea (test)');

    await page.goto(KARTA('torsk-test'));
    await expect(page.getByTestId('nedladdning').getByRole('link', { name: /Kontinuerlig karta/ })).toHaveAttribute(
      'download',
      'torsk-test_v1_kontinuerlig.tif',
    );
  });

  test('Kopiera citering lägger texten i urklipp', async ({ page, context }) => {
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);
    await cartoTom(page);
    await page.goto(KARTA('torsk-test'));
    await page.getByRole('button', { name: 'Kopiera citering' }).click();
    const text = await page.evaluate(() => navigator.clipboard.readText());
    expect(text).toMatch(
      /^Testsson m fl 2021\. Torsk större än 20 cm, uppväxt, västkusten \(test\) \(2021\), version 1\. SLU Aqua\. http\S+#\/karta\/torsk-test\?v=1 \(hämtad \d{4}-\d{2}-\d{2}\)\.$/,
    );
    await expect(page.getByRole('status').filter({ hasText: 'Kopierad' })).toBeVisible();
  });

  test('en karta med två versioner listar båda med datum', async ({ page }) => {
    await cartoTom(page);
    await page.goto(KARTA('pbs-test'));
    const v = page.getByTestId('versioner').getByRole('listitem');
    await expect(v).toHaveCount(2);
    await expect(v.nth(0)).toContainText('Version 2');
    await expect(v.nth(0)).toContainText('2026-11-25');
    await expect(v.nth(1)).toContainText('Version 1');
    await expect(v.nth(1)).toContainText('2026-11-01');
    await expect(v.nth(1).getByRole('link')).toHaveAttribute('href', /#\/karta\/pbs-test\?v=1$/);
  });
});

test.describe('permanenta länkar och specialfall', () => {
  test('en kopierad länk öppnar samma vy, lager, opacitet, bakgrund och språk', async ({ page, context }) => {
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);
    await page.goto(KARTA('torsk-test', 'lager=kontinuerlig&opacitet=0.5&bakgrund=ingen&lang=en'));
    await vantaKarta(page);
    const kartyta = (await page.locator('.kartyta').boundingBox())!;
    await page.mouse.move(kartyta.x + 200, kartyta.y + 200);
    await page.mouse.down();
    await page.mouse.move(kartyta.x + 320, kartyta.y + 260, { steps: 8 });
    const fore_hash = new URL(page.url()).hash;
    await page.mouse.up();
    // Vänta tills kartan har glidit klart och adressen har uppdaterats.
    await page.waitForFunction(() => {
      const vy = (window as any).__karta.karta.getView();
      return !vy.getAnimating() && !vy.getInteracting();
    });
    await expect.poll(() => new URL(page.url()).hash).not.toBe(fore_hash);
    await page.waitForTimeout(300);
    await page.getByRole('button', { name: 'Copy link to this view' }).click();
    const lank = await page.evaluate(() => navigator.clipboard.readText());
    expect(lank).toBe(page.url());
    const fore = await page.evaluate(() => (window as any).__karta.pixelFor(613287.5, 6636712.5, 3006));

    const ny = await context.newPage();
    await ny.goto(lank);
    await vantaKarta(ny);
    const efter = await ny.evaluate(() => (window as any).__karta.pixelFor(613287.5, 6636712.5, 3006));
    expect(Math.abs(efter[0] - fore[0])).toBeLessThanOrEqual(2);
    expect(Math.abs(efter[1] - fore[1])).toBeLessThanOrEqual(2);
    await expect(ny.getByRole('radio', { name: 'Continuous' })).toBeChecked();
    await expect(ny.getByRole('radio', { name: 'None' })).toBeChecked();
    await expect(ny.getByLabel('Opacity')).toHaveValue('0.5');
    expect(await ny.evaluate(() => document.documentElement.lang)).toBe('en');
  });

  test('en okänd karta säger det och länkar till startsidan', async ({ page }) => {
    await page.goto(KARTA('finns-inte'));
    await expect(page.getByRole('heading', { name: 'Kartan finns inte' })).toBeVisible();
    await page.getByRole('link', { name: 'Till alla kartor' }).click();
    await expect(page.getByTestId('traff')).toHaveCount(3);
  });

  test('en dold karta visas med en notis och går att ladda ned', async ({ page }) => {
    await cartoTom(page);
    await page.goto(KARTA('dold-test'));
    await expect(page.getByText('Kartan är inte längre aktuell')).toBeVisible();
    const href = await page.getByTestId('nedladdning').getByRole('link', { name: /Klassad karta/ }).getAttribute('href');
    const svar = await page.request.get(href!);
    expect(svar.status()).toBe(200);
  });

  test('en äldre version visas med en länk till den nyare', async ({ page }) => {
    await cartoTom(page);
    await page.goto(KARTA('pbs-test', 'v=1'));
    await vantaKarta(page);
    await expect(page.getByText('Det finns en nyare version')).toBeVisible();
    await expect(page.getByTestId('nedladdning').getByRole('link', { name: /Klassad karta/ })).toHaveAttribute('href', /\/v1\/visning\.tif$/);
    await page.getByRole('link', { name: 'Visa version 2' }).click();
    await expect(page.getByText('Det finns en nyare version')).toHaveCount(0);
    await expect(page.getByTestId('nedladdning').getByRole('link', { name: /Klassad karta/ })).toHaveAttribute('href', /\/v2\/visning\.tif$/);
  });
});

async function pngPixlar(page: import('@playwright/test').Page, fil: string, punkter: [number, number][]) {
  const b64 = readFileSync(fil).toString('base64');
  return page.evaluate(
    async ([b64, punkter]) => {
      const bild = await createImageBitmap(await (await fetch(`data:image/png;base64,${b64}`)).blob());
      const duk = new OffscreenCanvas(bild.width, bild.height);
      const ctx = duk.getContext('2d')!;
      ctx.drawImage(bild, 0, 0);
      const px = (punkter as [number, number][]).map(([x, y]) => Array.from(ctx.getImageData(x, y, 1, 1).data));
      const remsa = ctx.getImageData(0, bild.height - 12, bild.width, 1).data;
      let morka = 0;
      for (let i = 0; i < remsa.length; i += 4) if (remsa[i] < 80 && remsa[i + 1] < 80 && remsa[i + 2] < 90) morka += 1;
      return { bredd: bild.width, hojd: bild.height, px, morka };
    },
    [b64, punkter] as const,
  );
}
async function sparaBild(page: import('@playwright/test').Page) {
  const [hamtning] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'Spara som bild' }).click()]);
  return { namn: hamtning.suggestedFilename(), fil: (await hamtning.path())! };
}

test.describe('spara som bild', () => {
  test('PNG i kartans storlek med datalager, legend och attribution', async ({ page }) => {
    await cartoTom(page);
    await page.goto(KARTA('torsk-test'));
    await vantaKarta(page);
    const ruta = (await page.locator('.kartyta').boundingBox())!;
    const [px, py] = await page.evaluate(() => (window as any).__karta.pixelFor(613287.5, 6636712.5, 3006));
    const { namn, fil } = await sparaBild(page);
    expect(namn).toBe('torsk-test_v1.png');
    // Legendens andra ruta (Mycket viktigt) ligger på en fast plats uppe till vänster.
    const r = await pngPixlar(page, fil, [[Math.round(px - ruta.x), Math.round(py - ruta.y)], [29, 71]]);
    expect([r.bredd, r.hojd]).toEqual([Math.round(ruta.width), Math.round(ruta.height)]);
    expect(r.px[0].slice(0, 3)).toEqual([37, 52, 148]);
    expect(r.px[1].slice(0, 3)).toEqual([37, 52, 148]);
    expect(r.morka).toBeGreaterThan(20);
  });

  test('när bakgrundsrutorna inte går att hämta blir bilden ändå gjord', async ({ page }) => {
    await page.route('https://basemaps.cartocdn.com/**', (r) => r.abort());
    await page.goto(KARTA('torsk-test'));
    await vantaKarta(page);
    const ruta = (await page.locator('.kartyta').boundingBox())!;
    const [px, py] = await page.evaluate(() => (window as any).__karta.pixelFor(613287.5, 6636712.5, 3006));
    const { fil } = await sparaBild(page);
    const r = await pngPixlar(page, fil, [[Math.round(px - ruta.x), Math.round(py - ruta.y)], [29, 71]]);
    expect(r.px[0].slice(0, 3)).toEqual([37, 52, 148]);
    expect(r.px[1].slice(0, 3)).toEqual([37, 52, 148]);
  });

  test('en bakgrund som spärrar export: bilden sparas utan bakgrund och det sägs', async ({ page }) => {
    // Rutor utan CORS-huvud, och en källa utan crossOrigin, så att kartans duk blir spärrad.
    await page.route('https://basemaps.cartocdn.com/**', (r) => r.fulfill({ body: TOM_PNG, contentType: 'image/png' }));
    await page.goto(KARTA('torsk-test'));
    await vantaKarta(page);
    const fore = await page.evaluate(() => (window as any).__karta.rendercomplete);
    await page.evaluate(() => {
      const kalla = (window as any).__karta.karta.getLayers().item(0).getSource();
      kalla.crossOrigin = null;
      kalla.refresh();
    });
    await vantaKarta(page, fore + 1);
    const ruta = (await page.locator('.kartyta').boundingBox())!;
    const [px, py] = await page.evaluate(() => (window as any).__karta.pixelFor(613287.5, 6636712.5, 3006));
    const { fil } = await sparaBild(page);
    await expect(page.getByText('Bakgrundskartan tillåter inte export – sparar utan bakgrund')).toBeVisible();
    const r = await pngPixlar(page, fil, [[Math.round(px - ruta.x), Math.round(py - ruta.y)]]);
    expect(r.px[0].slice(0, 3)).toEqual([37, 52, 148]);
  });
});

test.describe('om-sidan', () => {
  test('finns på svenska och engelska med kontakt och licens', async ({ page }) => {
    await page.goto(`${server.url}/dist/index.html?data=/tests/fixtures/data/#/om`);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Om Fiskkartor');
    await expect(page.getByRole('link', { name: 'SLU-Aqua-fiskkartor@slu.se' })).toHaveAttribute('href', 'mailto:SLU-Aqua-fiskkartor@slu.se');
    await expect(page.getByText('CC BY 4.0').first()).toBeVisible();
    await page.getByTestId('sprak').click();
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('About Fish maps');
    await expect(page.getByRole('heading', { name: 'How to cite' })).toBeVisible();
  });
});

test.describe('efter granskningen', () => {
  test('mobil: listan är hopfälld och kartan syns direkt', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await cartoTom(page);
    await page.goto(KARTA('torsk-test'));
    await vantaKarta(page);
    expect(await page.locator('.lista details').evaluate((d) => (d as HTMLDetailsElement).open)).toBe(false);
    const ruta = (await page.locator('.kartyta').boundingBox())!;
    expect(ruta.y).toBeLessThan(844);
  });

  test('att byta karta många gånger läcker inga WebGL-ytor', async ({ page }) => {
    await cartoTom(page);
    const varningar: string[] = [];
    page.on('console', (m) => /WebGL/.test(m.text()) && varningar.push(m.text()));
    await page.goto(KARTA('torsk-test'));
    await vantaKarta(page);
    const titlar = ['Perch spawning, Baltic Sea (test)', 'Trålfångst, en klass (test)', 'Torsk större än 20 cm, uppväxt, västkusten (test)'];
    for (let i = 0; i < 18; i++) {
      await page.locator('.lista').getByRole('link', { name: titlar[i % 3] }).click();
      await vantaKarta(page);
    }
    expect(varningar).toEqual([]);
  });

  test('listan i kartvyn visar sökträffarna', async ({ page }) => {
    await cartoTom(page);
    await page.goto(START());
    await page.getByRole('combobox').fill('torsk');
    await page.getByTestId('traff').getByRole('link').click();
    await vantaKarta(page);
    await expect(page.locator('.lista').getByTestId('traff')).toHaveCount(1);
    await page.goBack();
    await expect(page.getByRole('combobox')).toHaveValue('torsk');
  });

  test('zoom utan att flytta pekaren uppdaterar värdet', async ({ page }) => {
    await page.goto(KARTA('torsk-test', 'bakgrund=ingen'));
    await vantaKarta(page);
    await stallVy(page, 630762.5, 6619237.5, 400);
    await hovra(page, 630762.5, 6619237.5, 3006);
    await expect(page.getByTestId('varde')).toHaveText('≈ Mycket viktigt');
    await stallVy(page, 630762.5, 6619237.5, 6.25);
    await expect(page.getByTestId('varde')).toHaveText('—');
    await expect(page.getByTestId('varde-tips')).toHaveCount(0);
  });

  test('medan full upplösning laddas visas inte en grövre ruta som exakt', async ({ page }) => {
    await page.goto(KARTA('torsk-test', 'bakgrund=ingen'));
    await vantaKarta(page);
    await stallVy(page, 630762.5, 6619237.5, 400);
    await hovra(page, 630762.5, 6619237.5, 3006);
    await fordroj(page, '**/visning.tif*', 1500);
    await page.evaluate(() => (window as any).__karta.karta.getView().setResolution(25));
    await page.waitForTimeout(400);
    await expect(page.getByTestId('varde')).not.toHaveText('Mycket viktigt');
    await expect(page.getByTestId('varde')).toHaveText('—', { timeout: 10_000 });
  });
});
