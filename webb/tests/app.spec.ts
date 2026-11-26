import { expect, test } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { startaRangeServer } from './range-server';
import { cartoTom, KARTA as karta, START as start, TOM_PNG, vantaKarta } from './hjalp';

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

  test('knappen Försök igen står under felmeddelandet med samma marginal', async ({ page }) => {
    await page.goto(`${server.url}/dist/index.html?data=/finns-inte/#/`);
    const fel = (await page.getByRole('alert').boundingBox())!;
    const knapp = (await page.getByRole('button', { name: 'Försök igen' }).boundingBox())!;
    expect(knapp.x).toBeGreaterThanOrEqual(16);
    expect(knapp.y).toBeGreaterThanOrEqual(fel.y + fel.height);
  });

  test('?data= till en annan webbplats används inte', async ({ page }) => {
    const andra: string[] = [];
    page.on('request', (r) => !r.url().startsWith(server.url) && andra.push(r.url()));
    await page.goto(`${server.url}/dist/index.html?data=https://example.com/data/#/`);
    await expect(page.getByRole('alert')).toContainText('Kartkatalogen kunde inte hämtas');
    expect(andra).toEqual([]);
  });
});

const START = () => start(server.url);

test.describe('startsidan', () => {
  test('startsidan visar arterna som kort', async ({ page }) => {
    await page.goto(START());
    await expect(page.locator('.artkort')).toHaveCount(3);
    await expect(page.locator('#traffrubrik')).toHaveText('2 arter, 3 kartor');
    await expect(page.locator('[data-testid^="projekt-"]')).toHaveCount(0);
  });

  test('artkortets knapp öppnar kartan', async ({ page }) => {
    await cartoTom(page);
    await page.goto(START());
    await page.getByRole('link', { name: 'Torsk större än 20 cm, uppväxt, västkusten (test)' }).click();
    await expect(page).toHaveURL(/#\/karta\/torsk-test/);
  });

  test('artkorten har artens silhuett', async ({ page }) => {
    await page.goto(START());
    await expect(page.locator('.artkort').filter({ hasText: 'Torsk' }).locator('svg')).toHaveCount(1);
    await expect(page.locator('.artkort').filter({ hasText: 'Trålfångst' }).locator('svg')).toHaveCount(0);
  });

  test('högst 12 arter först och sedan Visa alla', async ({ page }) => {
    const katalog = JSON.parse(readFileSync(resolve(WEBB, 'tests', 'fixtures', 'data', 'katalog', 'katalog.json'), 'utf8'));
    const mall = katalog.kartor.find((k: { id: string }) => k.id === 'torsk-test');
    const arter = ['Abborre', 'Berggylta', 'Gädda', 'Gös', 'Kolja', 'Lax', 'Makrill', 'Mört', 'Piggvar', 'Rödspätta', 'Sill', 'Sutare', 'Torsk', 'Vitling', 'Ål'];
    katalog.kartor = arter.map((art, i) => ({ ...mall, id: `art-${i}`, titel: `${art} uppväxt`, falt: { ...mall.falt, art } }));
    await page.route('**/katalog/katalog.json', (r) => r.fulfill({ body: JSON.stringify(katalog), contentType: 'application/json' }));
    await page.goto(START());
    await expect(page.locator('.artkort')).toHaveCount(12);
    await page.getByRole('button', { name: 'Visa alla 15 arter' }).click();
    await expect(page.locator('.artkort')).toHaveCount(15);
    await expect(page.getByRole('button', { name: /Visa alla/ })).toHaveCount(0);
  });

  test('Art visas inte i startsidans filter', async ({ page }) => {
    await page.goto(START());
    await expect(page.getByRole('group', { name: 'Projekt' })).toBeVisible();
    await expect(page.getByRole('group', { name: 'Art', exact: true })).toHaveCount(0);
  });

  test('Så läser du kartorna', async ({ page }) => {
    await page.goto(START());
    const kort = page.getByRole('complementary', { name: 'Så läser du kartorna' }).first();
    await expect(kort).toBeVisible();
    await kort.getByRole('link', { name: 'Mer om kartorna och metoderna' }).click();
    await expect(page).toHaveURL(/#\/om/);
  });

  test('visar bara synliga kartor och projektfiltret räknar dem', async ({ page }) => {
    await page.goto(START());
    await expect(page.getByTestId('traff')).toHaveCount(3);
    const projekt = page.getByRole('group', { name: 'Projekt' });
    await expect(projekt.getByRole('button', { name: /NMK/ })).toContainText('(2)');
    await expect(projekt.getByRole('button', { name: /PanBalticScope/ })).toContainText('(1)');
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
    await page.getByRole('banner').getByRole('link', { name: 'Om portalen' }).click();
    await page.getByRole('banner').getByRole('link', { name: 'Kartor', exact: true }).click();
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

const KARTA = (id: string, q = '') => karta(server.url, id, q);
async function oppnaLagerval(page: import('@playwright/test').Page, namn = 'Lagerval') {
  const knapp = page.getByRole('button', { name: namn });
  if ((await knapp.getAttribute('aria-expanded')) !== 'true') await knapp.click();
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
    await oppnaLagerval(page);
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
    await oppnaLagerval(page);
    await expect(page.getByRole('radio', { name: 'Klassad' })).toHaveCount(0);
    await expect(page.getByRole('radio', { name: 'Kontinuerlig' })).toHaveCount(0);
    await expect(page.getByRole('radio', { name: 'CARTO' })).toBeVisible();
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
    await oppnaLagerval(page);
    await expect(page.getByLabel('Opacitet')).toHaveValue('0');
  });

  test('bakgrund=ingen hämtar inga CARTO-rutor', async ({ page }) => {
    const rutor = await cartoTom(page);
    await page.goto(KARTA('torsk-test', 'bakgrund=ingen'));
    await vantaKarta(page);
    expect(rutor).toHaveLength(0);
    await oppnaLagerval(page);
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

  test('en långsam bakgrundskarta gör inte värdet ungefärligt', async ({ page }) => {
    await cartoTom(page);
    await page.goto(KARTA('torsk-test'));
    await vantaKarta(page);
    await page.unroute('https://basemaps.cartocdn.com/**');
    await page.route('https://basemaps.cartocdn.com/**', async (r) => {
      await new Promise((klar) => setTimeout(klar, 8000));
      await r.fulfill({ body: TOM_PNG, contentType: 'image/png', headers: { 'Access-Control-Allow-Origin': '*' } }).catch(() => {});
    });
    // Vänta på en ritning (inte rendercomplete, som väntar på bakgrunden), så att pixelFor gäller den nya vyn.
    await page.evaluate(
      () =>
        new Promise((klar) => {
          const k = (window as any).__karta.karta;
          k.once('postrender', klar);
          k.getView().setCenter([613287.5, 6636712.5]);
          k.getView().setResolution(25);
        }),
    );
    await hovra(page, 613287.5, 6636712.5, 3006);
    await expect(page.getByTestId('varde')).toHaveText('Mycket viktigt', { timeout: 5000 });
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
    await expect(n.getByRole('link', { name: /Metadata \(JSON\)/ })).toHaveAttribute('download', 'pbs-test_metadata.json');
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
    await expect(v.nth(1).getByRole('link')).toHaveAttribute('href', /#\/karta\/pbs-test\?(.*&)?v=1$/);
  });

  test('kartans namn står kvar överst när panelen skrollas', async ({ page }) => {
    await cartoTom(page);
    await page.setViewportSize({ width: 1280, height: 600 });
    await page.goto(KARTA('torsk-test'));
    const rubrik = page.locator('.panel h1');
    await expect(rubrik).toBeVisible();
    await page.locator('.panel').evaluate((el) => el.scrollTo(0, el.scrollHeight));
    const lage = await page.evaluate(() => {
      const panel = document.querySelector('.panel')!;
      const h1 = panel.querySelector('h1')!;
      const r = h1.getBoundingClientRect();
      const overst = document.elementFromPoint(r.left + 4, r.top + r.height / 2);
      return {
        skrollat: panel.scrollTop,
        avstand: r.top - panel.getBoundingClientRect().top,
        synlig: h1.contains(overst),
      };
    });
    expect(lage.skrollat).toBeGreaterThan(200);
    expect(Math.abs(lage.avstand)).toBeLessThanOrEqual(2);
    expect(lage.synlig).toBe(true);
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
    await oppnaLagerval(ny, 'Layers');
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
    expect(r.px[0].slice(0, 3)).toEqual([0, 72, 81]);
    expect(r.px[1].slice(0, 3)).toEqual([0, 72, 81]);
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
    expect(r.px[0].slice(0, 3)).toEqual([0, 72, 81]);
    expect(r.px[1].slice(0, 3)).toEqual([0, 72, 81]);
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
    expect(r.px[0].slice(0, 3)).toEqual([0, 72, 81]);
  });
});

test.describe('om-sidan', () => {
  test('finns på svenska och engelska med kontakt och licens', async ({ page }) => {
    await page.goto(`${server.url}/dist/index.html?data=/tests/fixtures/data/#/om`);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Om Fiskkartor');
    await expect(page.getByRole('main').getByRole('link', { name: 'SLU-Aqua-fiskkartor@slu.se' })).toHaveAttribute('href', 'mailto:SLU-Aqua-fiskkartor@slu.se');
    await expect(page.getByText('CC BY 4.0').first()).toBeVisible();
    await page.getByTestId('sprak').click();
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('About Fish maps');
    await expect(page.getByRole('heading', { name: 'How to cite' })).toBeVisible();
  });
});

test.describe('efter granskningen', () => {
  test('att byta karta många gånger läcker inga WebGL-ytor', async ({ page }) => {
    await cartoTom(page);
    const varningar: string[] = [];
    // Bara varningar om för många WebGL-ytor eller tappade ytor; prestandameddelanden från drivrutinen räknas inte.
    page.on('console', (m) => /Too many active WebGL contexts|CONTEXT_LOST/i.test(m.text()) && varningar.push(m.text()));
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

test.describe('mindre fynd', () => {
  test('en version som inte finns säger det och visar den aktuella', async ({ page }) => {
    await cartoTom(page);
    await page.goto(KARTA('pbs-test', 'v=9'));
    await expect(page.getByText('Version 9 finns inte. Visar version 2.')).toBeVisible();
  });

  test('länken till den nyare versionen behåller bakgrund och lager', async ({ page }) => {
    await cartoTom(page);
    await page.goto(KARTA('pbs-test', 'v=1'));
    await vantaKarta(page);
    await oppnaLagerval(page);
    await page.getByRole('radio', { name: 'Ingen' }).check();
    await page.getByRole('link', { name: 'Visa version 2' }).click();
    const hash = new URL(page.url()).hash;
    expect(hash).toContain('bakgrund=ingen');
    expect(hash).not.toContain('v=1');
  });
});

test.describe('sidhuvud, sidfot och titlar', () => {
  const OM = () => `${server.url}/dist/index.html?data=/tests/fixtures/data/#/om`;
  const TILLG = () => `${server.url}/dist/index.html?data=/tests/fixtures/data/#/tillganglighet`;

  test('sidhuvudet har SLU:s logotyp och institutionen', async ({ page }) => {
    await page.goto(START());
    await expect(page.getByRole('img', { name: 'SLU, Sveriges lantbruksuniversitet' })).toBeVisible();
    await expect(page.getByRole('banner').getByText('Institutionen för akvatiska resurser', { exact: true })).toBeVisible();
  });

  test('logotypen är SLU:s riktiga, inte platshållaren', async ({ page }) => {
    await page.goto(START());
    await expect(page.getByRole('img', { name: 'SLU, Sveriges lantbruksuniversitet' })).toHaveAttribute('src', /\.png$/);
  });

  test('logotypen är den vita', async ({ page }) => {
    await page.goto(START());
    await expect(page.getByRole('img', { name: 'SLU, Sveriges lantbruksuniversitet' })).toHaveAttribute('src', /slu-logotyp-vit.*\.png$/);
  });

  test('sidhuvudet är Havsvik med fiskmönstret', async ({ page }) => {
    await page.goto(START());
    const huvud = page.getByRole('banner');
    await expect(huvud).toHaveCSS('background-color', 'rgb(0, 118, 129)');
    expect(await huvud.evaluate((e) => getComputedStyle(e).backgroundImage)).toContain('monster-sidhuvud');
    await expect(huvud.getByRole('link', { name: 'Fiskkartor' })).toHaveCSS('color', 'rgb(255, 255, 255)');
    await expect(huvud.getByText('Institutionen för akvatiska resurser', { exact: true })).toHaveCSS('color', 'rgb(255, 255, 255)');
  });

  test('sidhuvudet vid 320 px', async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 640 });
    await page.goto(START());
    const namn = (await page.getByRole('banner').getByRole('link', { name: 'Fiskkartor' }).boundingBox())!;
    const knapp = (await page.getByRole('button', { name: 'Meny', exact: true }).boundingBox())!;
    expect(namn.x + namn.width).toBeLessThanOrEqual(knapp.x);
    expect(knapp.x + knapp.width).toBeLessThanOrEqual(320);
  });

  test('fokusramen i sidhuvudet är vit', async ({ page }) => {
    await page.goto(START());
    const namn = page.getByRole('banner').getByRole('link', { name: 'Fiskkartor' });
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');
    await expect(namn).toBeFocused();
    await expect(namn).toHaveCSS('outline-color', 'rgb(255, 255, 255)');
  });

  test('tvingade färger: sidhuvudets text och fokus syns', async ({ page }) => {
    await page.emulateMedia({ forcedColors: 'active' });
    await page.goto(START());
    const namn = page.getByRole('banner').getByRole('link', { name: 'Fiskkartor' });
    await expect(namn).toBeVisible();
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');
    await expect(namn).toBeFocused();
    await expect(namn).toHaveCSS('outline-width', '3px');
  });

  // PNG-filen har SLU:s fria zon inbyggd: märket är halva bildens höjd. Märket ska vara minst 9 mm
  // (cirka 34 px), så bilden är minst 68 px hög, också på mobil.
  for (const [bredd, hojd] of [[1280, 72], [375, 68]] as const) {
    test(`logotypen är ${hojd} px hög vid ${bredd} px bredd`, async ({ page }) => {
      await page.setViewportSize({ width: bredd, height: 800 });
      await page.goto(START());
      const bild = page.getByRole('img', { name: 'SLU, Sveriges lantbruksuniversitet' });
      await expect(bild).toBeVisible();
      expect(Math.round((await bild.boundingBox())!.height)).toBe(hojd);
      expect(Math.round((await bild.boundingBox())!.x)).toBe(0);
    });
  }

  test('varje vy har en egen titel', async ({ page }) => {
    await cartoTom(page);
    await page.goto(START());
    await expect(page).toHaveTitle('Kartor – Fiskkartor');
    await page.goto(KARTA('torsk-test'));
    await expect(page).toHaveTitle('Torsk större än 20 cm, uppväxt, västkusten (test) – Fiskkartor');
    await page.goto(OM());
    await expect(page).toHaveTitle('Om portalen – Fiskkartor');
    await page.goto(TILLG());
    await expect(page).toHaveTitle('Tillgänglighet – Fiskkartor');
    await page.goto(START().replace('#/', '#/?lang=en'));
    await expect(page).toHaveTitle('Maps – Fish maps');
    await page.goto(KARTA('finns-inte'));
    await expect(page).toHaveTitle('Kartan finns inte – Fiskkartor');
  });

  test('sidfoten länkar till tillgänglighetsredogörelsen men finns inte i kartvyn', async ({ page }) => {
    await cartoTom(page);
    await page.goto(START());
    await page.getByRole('contentinfo').getByRole('link', { name: 'Tillgänglighet' }).click();
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Tillgänglighet');
    await page.goto(KARTA('torsk-test'));
    await expect(page.locator('.kartyta')).toBeVisible();
    await expect(page.getByRole('contentinfo')).toHaveCount(0);
  });

  test('kartvyn fyller fönstret utan sidskroll', async ({ page }) => {
    await cartoTom(page);
    await page.goto(KARTA('torsk-test'));
    await vantaKarta(page);
    expect(await page.evaluate(() => document.documentElement.scrollHeight <= innerHeight)).toBe(true);
  });

  test('mobil: menyn ligger bakom Meny-knappen', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto(START());
    const meny = page.getByRole('button', { name: 'Meny', exact: true });
    await expect(meny).toHaveAttribute('aria-expanded', 'false');
    await expect(page.getByRole('banner').getByRole('link', { name: 'Om portalen' })).toBeHidden();
    await meny.click();
    await expect(meny).toHaveAttribute('aria-expanded', 'true');
    await expect(page.getByRole('banner').getByRole('link', { name: 'Om portalen' })).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(meny).toHaveAttribute('aria-expanded', 'false');
    await expect(meny).toBeFocused();
  });

  test('mobil: menyn stängs av en länk och av ett klick utanför', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto(START());
    const meny = page.getByRole('button', { name: 'Meny', exact: true });
    await meny.click();
    await page.getByRole('banner').getByRole('link', { name: 'Om portalen' }).click();
    await expect(page).toHaveURL(/#\/om/);
    await expect(meny).toHaveAttribute('aria-expanded', 'false');
    await meny.click();
    await expect(meny).toHaveAttribute('aria-expanded', 'true');
    // Ett tryck på den nedtonade ytan till vänster om panelen.
    await page.mouse.click(20, 400);
    await expect(meny).toHaveAttribute('aria-expanded', 'false');
  });

  test('mobil: menyn glider in från höger med stängknapp', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto(START());
    const meny = page.getByRole('button', { name: 'Meny', exact: true });
    await meny.click();
    const panel = page.getByRole('navigation', { name: 'Huvudmeny' });
    await expect(panel).toBeVisible();
    await expect(panel.getByRole('link', { name: 'Tillgänglighet' })).toBeVisible();
    await expect(panel.getByText('Fiskkartor tas fram av SLU Aqua, Institutionen för akvatiska resurser.')).toBeVisible();
    const stang = page.getByRole('button', { name: 'Stäng menyn' });
    await expect(stang).toBeFocused();
    await expect(async () => {
      const ruta = (await panel.boundingBox())!;
      expect(Math.round(ruta.x + ruta.width)).toBe(375);
      expect(Math.round(ruta.width)).toBe(316);
    }).toPass();
    await stang.click();
    await expect(meny).toHaveAttribute('aria-expanded', 'false');
    await expect(meny).toBeFocused();
  });

  test('mobil: menyns mönster', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto(START());
    await page.getByRole('button', { name: 'Meny', exact: true }).click();
    const panel = page.getByRole('navigation', { name: 'Huvudmeny' });
    expect(await panel.evaluate((e) => getComputedStyle(e).backgroundImage)).toContain('monster-meny');
    await expect(panel).toHaveCSS('background-color', 'rgb(0, 118, 129)');
  });

  test('mobil: stängd meny går inte att nå med Tab', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto(START());
    const panel = page.locator('#huvudmeny');
    await expect(panel).toHaveCSS('visibility', 'hidden');
    await page.getByRole('button', { name: 'Meny', exact: true }).focus();
    await page.keyboard.press('Tab');
    await expect(page.getByRole('link', { name: 'Om portalen' })).not.toBeFocused();
  });

  test('mobil: menyn går att skrolla på en låg skärm', async ({ page }) => {
    await page.setViewportSize({ width: 812, height: 360 });
    await page.goto(START());
    await page.setViewportSize({ width: 600, height: 360 });
    await page.getByRole('button', { name: 'Meny', exact: true }).click();
    const sista = page.getByRole('navigation', { name: 'Huvudmeny' }).getByRole('link', { name: 'In English' });
    await sista.scrollIntoViewIfNeeded();
    await expect(sista).toBeInViewport();
  });

  test('mobil: menyn utan animering vid reducerad rörelse', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto(START());
    await expect(page.locator('#huvudmeny')).toHaveCSS('transition-duration', '0s');
  });

  test('hopplänken går förbi sidhuvudet', async ({ page }) => {
    await page.goto(START());
    await page.keyboard.press('Tab');
    const hopp = page.getByRole('link', { name: 'Hoppa till innehållet' });
    await expect(hopp).toBeFocused();
    await expect(hopp).toBeVisible();
    await page.keyboard.press('Enter');
    await expect(page.getByRole('main')).toBeFocused();
    await expect(page.getByRole('main')).toHaveAttribute('tabindex', '-1');
  });
});

test.describe('Lagerval och teckenförklaring i kartan', () => {
  test('Lagerval: stängd från början, Escape stänger och fokus går tillbaka', async ({ page }) => {
    await cartoTom(page);
    await page.goto(KARTA('torsk-test'));
    const knapp = page.getByRole('button', { name: 'Lagerval' });
    await expect(knapp).toHaveAttribute('aria-expanded', 'false');
    await expect(page.getByRole('radio', { name: 'Klassad' })).toBeHidden();
    await knapp.click();
    await expect(knapp).toHaveAttribute('aria-expanded', 'true');
    await expect(page.getByRole('radio', { name: 'Klassad' })).toBeVisible();
    await page.getByRole('radio', { name: 'Klassad' }).focus();
    await page.keyboard.press('Escape');
    await expect(knapp).toHaveAttribute('aria-expanded', 'false');
    await expect(knapp).toBeFocused();
  });

  test('teckenförklaringen ligger i kartan och panelen har inga kartval', async ({ page }) => {
    await cartoTom(page);
    await page.goto(KARTA('torsk-test'));
    await expect(page.locator('.kartyta [data-testid=legend]')).toBeVisible();
    await expect(page.getByRole('region', { name: 'Teckenförklaring' }).getByRole('listitem')).toHaveText(['Viktigt', 'Mycket viktigt']);
    await expect(page.locator('.panel [data-testid=legend]')).toHaveCount(0);
    await expect(page.locator('.panel input[type=radio]')).toHaveCount(0);
    expect(await page.locator('h1, h2').first().evaluate((e) => e.tagName)).toBe('H1');
  });

  test('klick utanför stänger Lagerval', async ({ page }) => {
    await cartoTom(page);
    await page.goto(KARTA('torsk-test'));
    const knapp = page.getByRole('button', { name: 'Lagerval' });
    await knapp.click();
    await expect(knapp).toHaveAttribute('aria-expanded', 'true');
    await page.locator('.panel h1').click();
    await expect(knapp).toHaveAttribute('aria-expanded', 'false');
  });

  test('Lagerval ligger över teckenförklaringen', async ({ page }) => {
    await cartoTom(page);
    await page.setViewportSize({ width: 390, height: 500 });
    await page.goto(KARTA('torsk-test'));
    await oppnaLagerval(page);
    const etikett = page.locator('label', { has: page.getByRole('radio', { name: 'CARTO' }) });
    // I en låg karta skrollar rutan inuti sig själv; visa raden först.
    await etikett.scrollIntoViewIfNeeded();
    const ruta = (await etikett.boundingBox())!;
    const inuti = await page.evaluate(
      ([x, y]) => !!document.elementFromPoint(x, y)?.closest('.lagerval'),
      [ruta.x + ruta.width / 2, ruta.y + ruta.height / 2] as const,
    );
    expect(inuti).toBe(true);
  });

  test('byte av karta med Lagerval öppen', async ({ page }) => {
    await cartoTom(page);
    await page.goto(KARTA('torsk-test'));
    await vantaKarta(page);
    await oppnaLagerval(page);
    await expect(page.getByRole('radio', { name: 'Kontinuerlig' })).toBeVisible();
    await page.locator('.lista').getByRole('link', { name: 'Perch spawning, Baltic Sea (test)' }).click();
    await expect(page).toHaveURL(/#\/karta\/pbs-test/);
    await expect(page.getByRole('radio', { name: 'Kontinuerlig' })).toHaveCount(0);
    await expect(page.getByRole('region', { name: 'Teckenförklaring' }).getByRole('listitem')).toHaveText(['Viktigt', 'Mycket viktigt']);
  });

  for (const bredd of [961, 1024]) {
    test(`smal dator ${bredd} px: kontrollerna överlappar inte`, async ({ page }) => {
      await cartoTom(page);
      await page.setViewportSize({ width: bredd, height: 700 });
      await page.goto(KARTA('torsk-test'));
      await vantaKarta(page);
      await expect(page.locator('.grepp')).toBeHidden();
      await hovra(page, 613287.5, 6636712.5, 3006);
      await expect(page.getByTestId('varde')).toBeVisible();
      const delar = ['.ol-zoom', '.lagerval > button', '.kartyta [data-testid=legend]', '.pekare', '.ol-scale-line', '.ol-attribution'];
      const rutor = [];
      for (const d of delar) rutor.push({ d, r: (await page.locator(d).first().boundingBox())! });
      for (let i = 0; i < rutor.length; i++)
        for (let j = i + 1; j < rutor.length; j++) {
          const a = rutor[i].r, b = rutor[j].r;
          const skar = a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height;
          expect(skar, `${rutor[i].d} och ${rutor[j].d}`).toBe(false);
        }
    });
  }
});

test.describe('kort, knappar och sidfot', () => {
  test('sökknappen sitter ihop med fältet och flyttar fokus till träffarna', async ({ page }) => {
    await page.goto(START());
    const falt = (await page.getByRole('combobox').boundingBox())!;
    const knapp = page.getByRole('button', { name: 'Sök', exact: true });
    await expect(knapp).toHaveCSS('background-color', 'rgb(0, 118, 129)');
    const k = (await knapp.boundingBox())!;
    expect(Math.abs(k.x - (falt.x + falt.width))).toBeLessThanOrEqual(1);
    await page.getByRole('combobox').fill('torsk');
    await knapp.click();
    await expect(page.locator('#traffrubrik')).toBeFocused();
  });

  test('Om-sidan och tillgänglighetssidan i vita kort', async ({ page }) => {
    await page.goto(`${server.url}/dist/index.html?data=/tests/fixtures/data/#/om`);
    await expect(page.locator('article.om')).toHaveCSS('background-color', 'rgb(255, 255, 255)');
    await expect(page.locator('body')).toHaveCSS('background-color', 'rgb(238, 244, 246)');
    await page.goto(`${server.url}/dist/index.html?data=/tests/fixtures/data/#/tillganglighet`);
    await expect(page.locator('article.sida')).toHaveCSS('background-color', 'rgb(255, 255, 255)');
  });

  test('sidfoten är Havsdjup med vita länkar', async ({ page }) => {
    await page.goto(START());
    const fot = page.getByRole('contentinfo');
    await expect(fot).toHaveCSS('background-color', 'rgb(0, 72, 81)');
    await expect(fot.getByRole('link').first()).toHaveCSS('color', 'rgb(255, 255, 255)');
  });

  test('Ladda ned är fylld i Havsvik', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await cartoTom(page);
    await page.goto(KARTA('torsk-test'));
    const ladda = page.getByRole('button', { name: 'Ladda ned' });
    await expect(ladda).toHaveCSS('background-color', 'rgb(0, 118, 129)');
    await expect(ladda).toHaveCSS('color', 'rgb(255, 255, 255)');
    const kopiera = page.getByRole('button', { name: 'Kopiera länk till vyn' });
    await expect(kopiera).toHaveCSS('background-color', 'rgb(255, 255, 255)');
    await expect(kopiera).toHaveCSS('border-top-color', 'rgb(0, 118, 129)');
  });

  test('kartvyns paneler är vita', async ({ page }) => {
    await cartoTom(page);
    await page.goto(KARTA('torsk-test'));
    await expect(page.locator('.lista')).toHaveCSS('background-color', 'rgb(255, 255, 255)');
    await expect(page.locator('.kartvy .panel')).toHaveCSS('background-color', 'rgb(255, 255, 255)');
  });
});

test.describe('lagerbyte, kartbyte och versioner', () => {
  test('metadatans rubriker är dämpade och värdena tydliga', async ({ page }) => {
    await cartoTom(page);
    await page.goto(KARTA('torsk-test'));
    const dt = page.locator('dl dt').first();
    const dd = page.locator('dl dd').first();
    await expect(dt).toHaveCSS('color', 'rgb(89, 89, 89)');
    await expect(dt).toHaveCSS('font-weight', '400');
    await expect(dd).toHaveCSS('color', 'rgb(34, 34, 34)');
    const storlek = async (l: typeof dt) => parseFloat(await l.evaluate((e) => getComputedStyle(e).fontSize));
    expect((await storlek(dd)) - (await storlek(dt))).toBeGreaterThanOrEqual(2);
  });

  test('kartvyns lista har mindre ikoner', async ({ page }) => {
    await cartoTom(page);
    await page.goto(KARTA('torsk-test'));
    const ikon = page.locator('.lista .artikon').first();
    await expect(ikon).toBeVisible();
    expect(Math.round((await ikon.boundingBox())!.width)).toBe(36);
    expect(Math.round((await ikon.locator('svg').boundingBox())!.width)).toBe(16);
  });

  test('ett annat lager säger att kartan laddas tills det har laddats', async ({ page }) => {
    await page.goto(KARTA('torsk-test', 'bakgrund=ingen'));
    await vantaKarta(page);
    await expect(page.getByText('Laddar kartan …')).toHaveCount(0);
    await fordroj(page, '**/radata.tif*', 1500);
    await oppnaLagerval(page);
    await page.getByRole('radio', { name: 'Kontinuerlig' }).check();
    await expect(page.getByText('Laddar kartan …')).toBeVisible();
    await expect(page.getByText('Laddar kartan …')).toHaveCount(0, { timeout: 20_000 });
  });

  test('Kopierad står inte kvar när en annan karta öppnas', async ({ page, context }) => {
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);
    await cartoTom(page);
    await page.goto(KARTA('torsk-test'));
    await vantaKarta(page);
    await page.getByRole('button', { name: 'Kopiera länk till vyn' }).click();
    await expect(page.getByRole('status').filter({ hasText: 'Kopierad' })).toBeVisible();
    await page.locator('main a[href*="karta/pbs-test"]').first().click();
    await expect(page).toHaveURL(/karta\/pbs-test/);
    await expect(page.getByRole('status').filter({ hasText: 'Kopierad' })).toHaveCount(0);
  });

  test('länkarna till andra versioner behåller vyn, lagret och bakgrunden', async ({ page }) => {
    await cartoTom(page);
    await page.goto(KARTA('pbs-test', 'x=630000&y=6620000&upp=100&bakgrund=ingen'));
    await vantaKarta(page);
    const href = (await page.getByTestId('versioner').getByRole('link', { name: 'Version 1' }).getAttribute('href'))!;
    const q = new URLSearchParams(href.split('?')[1]);
    expect(q.get('v')).toBe('1');
    expect(q.get('x')).toBe('630000');
    expect(q.get('y')).toBe('6620000');
    expect(q.get('upp')).toBe('100');
    expect(q.get('bakgrund')).toBe('ingen');
  });

  test('nedladdningens förklaring är löpande text', async ({ page }) => {
    await cartoTom(page);
    await page.goto(KARTA('torsk-test'));
    const info = page.getByTestId('nedladdning').locator('p.info');
    expect(await info.evaluate((e) => getComputedStyle(e).fontFamily)).toContain('Merriweather');
  });
});

test.describe('mobil', () => {
  test.use({ viewport: { width: 390, height: 844 } });
  const greppet = (page: import('@playwright/test').Page) => page.locator('.grepp');

  test('mobil: länken går till träffarna och kartan syns direkt', async ({ page }) => {
    await cartoTom(page);
    await page.goto(KARTA('torsk-test', 'q=torsk'));
    await vantaKarta(page);
    await expect(page.locator('.lista')).toBeHidden();
    const lank = page.getByRole('link', { name: /Till träffarna \(\d+\)/ });
    await expect(lank).toBeVisible();
    expect(await lank.getAttribute('href')).toContain('q=torsk');
    const ruta = (await page.locator('.kartyta').boundingBox())!;
    expect(ruta.height).toBeGreaterThan(0.45 * 844);
    expect(await page.evaluate(() => document.documentElement.scrollHeight <= innerHeight)).toBe(true);
  });

  test('mobil: fliken startar nere och greppet växlar', async ({ page }) => {
    await cartoTom(page);
    await page.goto(KARTA('torsk-test'));
    await vantaKarta(page);
    const nere = page.getByRole('button', { name: 'Visa mer om kartan' });
    await expect(nere).toHaveAttribute('aria-expanded', 'false');
    await expect(page.locator('.panel h1')).toBeVisible();
    await expect(page.locator('#nedladdning')).toBeHidden();
    await expect(page.getByTestId('legend')).toBeVisible();
    await nere.click();
    const uppe = page.getByRole('button', { name: 'Visa mindre' });
    await expect(uppe).toHaveAttribute('aria-expanded', 'true');
    await expect(page.locator('#nedladdning')).toBeVisible();
    await expect(page.getByTestId('legend')).toBeHidden();
    await uppe.click();
    await expect(page.locator('#nedladdning')).toBeHidden();
    await expect(page.getByTestId('legend')).toBeVisible();
  });

  test('mobil: svep på greppet', async ({ page }) => {
    await cartoTom(page);
    await page.goto(KARTA('torsk-test'));
    await vantaKarta(page);
    const svep = async (dy: number) => {
      const r = (await greppet(page).boundingBox())!;
      const x = r.x + r.width / 2, y = r.y + r.height / 2;
      await page.mouse.move(x, y);
      await page.mouse.down();
      await page.mouse.move(x, y + dy, { steps: 6 });
      await page.mouse.up();
    };
    await svep(-100);
    await expect(greppet(page)).toHaveAttribute('aria-expanded', 'true');
    await svep(100);
    await expect(greppet(page)).toHaveAttribute('aria-expanded', 'false');
  });

  test('mobil: Ladda ned i fliken drar upp fliken och visar nedladdningen', async ({ page }) => {
    await cartoTom(page);
    await page.goto(KARTA('torsk-test'));
    await vantaKarta(page);
    await page.locator('.panel').getByRole('button', { name: 'Ladda ned' }).click();
    await expect(greppet(page)).toHaveAttribute('aria-expanded', 'true');
    await expect(page.locator('#nedladdning')).toBeInViewport();
  });

  test('mobil: greppet fungerar med tangentbordet', async ({ page }) => {
    await cartoTom(page);
    await page.goto(KARTA('torsk-test'));
    await vantaKarta(page);
    await greppet(page).focus();
    await page.keyboard.press('Enter');
    await expect(greppet(page)).toHaveAttribute('aria-expanded', 'true');
    await page.keyboard.press('Space');
    await expect(greppet(page)).toHaveAttribute('aria-expanded', 'false');
  });

  test('mobil: högerklick på greppet växlar inte', async ({ page }) => {
    await cartoTom(page);
    await page.goto(KARTA('torsk-test'));
    await vantaKarta(page);
    await greppet(page).click({ button: 'right' });
    await page.waitForTimeout(600);
    await expect(greppet(page)).toHaveAttribute('aria-expanded', 'false');
  });

  test.describe('pekskärm', () => {
    test.use({ hasTouch: true });
    test('mobil: ett tryck på ett sökförslag väljer det', async ({ page }) => {
      await page.goto(START());
      await page.getByRole('combobox').fill('tor');
      const forslag = page.getByRole('option').first();
      await expect(forslag).toHaveText('Torsk');
      await forslag.tap();
      await expect(page.getByRole('combobox')).toHaveValue('Torsk');
      await expect(page.getByRole('option')).toBeHidden();
      expect(new URL(page.url()).hash).toBe('#/?q=Torsk');
    });
    test('mobil: ett svep med fingret och sedan ett tryck på greppet', async ({ page }) => {
      await cartoTom(page);
      await page.goto(KARTA('torsk-test'));
      await vantaKarta(page);
      const cdp = await page.context().newCDPSession(page);
      const r = (await greppet(page).boundingBox())!;
      const x = r.x + r.width / 2, y = r.y + r.height / 2;
      const beroring = async (type: 'touchStart' | 'touchMove' | 'touchEnd', py?: number) =>
        cdp.send('Input.dispatchTouchEvent', { type, touchPoints: py === undefined ? [] : [{ x, y: py }] });
      await beroring('touchStart', y);
      for (const dy of [-30, -60, -100]) await beroring('touchMove', y + dy);
      await beroring('touchEnd');
      await expect(greppet(page)).toHaveAttribute('aria-expanded', 'true');
      const r2 = (await greppet(page).boundingBox())!;
      await page.touchscreen.tap(r2.x + r2.width / 2, r2.y + r2.height / 2);
      await expect(greppet(page)).toHaveAttribute('aria-expanded', 'false');
    });
    test('mobil: ett tryck på kartan visar värdet', async ({ page }) => {
      await page.goto(KARTA('torsk-test', 'bakgrund=ingen'));
      await vantaKarta(page);
      const [px, py] = await page.evaluate(() => (window as any).__karta.pixelFor(613287.5, 6636712.5, 3006) as [number, number]);
      await page.touchscreen.tap(px, py);
      await expect(page.getByTestId('varde')).toBeVisible();
      await expect(page.getByTestId('varde')).toHaveText(/^(≈ )?Mycket viktigt$/);
      // Fingret har lyfts (pointerleave), men värdet ska stå kvar tills man trycker någon annanstans.
      await page.waitForTimeout(1000);
      await expect(page.getByTestId('varde')).toHaveText(/^(≈ )?Mycket viktigt$/);
    });
  });

  test('mobil, engelska och lång titel: fliken flödar inte över', async ({ page }) => {
    await cartoTom(page);
    await page.goto(KARTA('torsk-test', 'lang=en'));
    await vantaKarta(page);
    const panel = page.locator('.panel');
    expect(await panel.evaluate((p) => p.scrollWidth <= p.clientWidth)).toBe(true);
    const p = (await panel.boundingBox())!, h = (await page.locator('.panel h1').boundingBox())!;
    expect(h.x).toBeGreaterThanOrEqual(p.x);
    expect(h.y).toBeGreaterThanOrEqual(p.y);
    expect(h.x + h.width).toBeLessThanOrEqual(p.x + p.width + 0.5);
    expect(h.y + h.height).toBeLessThanOrEqual(p.y + p.height + 0.5);
  });

  for (const [bredd, hojd, id, q] of [
    [844, 390, 'torsk-test', ''], [844, 390, 'dold-test', ''], [844, 340, 'torsk-test', ''],
    [667, 375, 'dold-test', ''], [568, 320, 'dold-test', 'lang=en'], [640, 360, 'torsk-test', ''],
  ] as const) {
    test(`mobil liggande ${bredd} × ${hojd}, ${id}: kartan syns och kontrollerna krockar inte`, async ({ page }) => {
      await cartoTom(page);
      await page.setViewportSize({ width: bredd, height: hojd });
      await page.goto(KARTA(id, q));
      await vantaKarta(page);
      expect((await page.locator('.kartyta').boundingBox())!.height).toBeGreaterThanOrEqual(100);
      await expect(greppet(page)).toBeInViewport();
      expect(await page.evaluate(() => document.documentElement.scrollHeight <= innerHeight)).toBe(true);
      const delar = ['.ol-zoom', '.lagerval > button', '.kartyta [data-testid=legend]', '.ol-scale-line', '.grepp', '.sidhuvud'];
      const rutor = [];
      for (const d of delar) {
        const r = await page.locator(d).first().boundingBox();
        if (r && (await page.locator(d).first().isVisible())) rutor.push({ d, r });
      }
      for (let i = 0; i < rutor.length; i++)
        for (let j = i + 1; j < rutor.length; j++) {
          const a = rutor[i].r, b = rutor[j].r;
          const skar = a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height;
          expect(skar, `${rutor[i].d} och ${rutor[j].d}`).toBe(false);
        }
      // Lagerval-rutan ryms i fönstret, eller skrollar inuti sig själv.
      await page.getByRole('button', { name: /Lagerval|Layers/ }).click();
      const ruta = page.locator('#lagerval-ruta');
      const r = (await ruta.boundingBox())!;
      expect(r.y + r.height).toBeLessThanOrEqual(hojd);
      await page.getByRole('radio', { name: /CARTO/ }).scrollIntoViewIfNeeded();
      await expect(page.getByRole('radio', { name: /CARTO/ })).toBeInViewport();
    });
  }

  test('mobil: en dold karta visar notisen i fliken', async ({ page }) => {
    await cartoTom(page);
    await page.goto(KARTA('dold-test'));
    await expect(greppet(page)).toHaveAttribute('aria-expanded', 'false');
    await expect(page.locator('.panel .notis').first()).toBeVisible();
  });
});

test.describe('profil', () => {
  test('typsnitt: Roboto Condensed i gränssnittet och Merriweather i löpande text', async ({ page }) => {
    await page.goto(START());
    expect(await page.locator('h1').first().evaluate((e) => getComputedStyle(e).fontFamily)).toContain('Roboto Condensed');
    await page.goto(`${server.url}/dist/index.html?data=/tests/fixtures/data/#/om`);
    expect(await page.locator('main p').first().evaluate((e) => getComputedStyle(e).fontFamily)).toContain('Merriweather');
  });

  test('sidan har havsgrå bakgrund', async ({ page }) => {
    await page.goto(START());
    await expect(page.locator('body')).toHaveCSS('background-color', 'rgb(238, 244, 246)');
  });

  test('Om-sidan länkar till tillgänglighetsredogörelsen', async ({ page }) => {
    await page.goto(`${server.url}/dist/index.html?data=/tests/fixtures/data/#/om?lang=en`);
    const lank = page.getByRole('main').getByRole('link', { name: 'Accessibility' });
    await expect(lank).toHaveAttribute('href', '#/tillganglighet?lang=en');
  });

  test('vetenskapliga namn är märkta som latin', async ({ page }) => {
    await cartoTom(page);
    await page.goto(KARTA('torsk-test'));
    const m = page.getByTestId('metadata');
    const varde = m.locator('dt', { hasText: 'Vetenskapligt namn' }).locator('xpath=following-sibling::dd[1]');
    await expect(varde).toHaveAttribute('lang', 'la');
  });
});

test.describe('efter slutgranskningen', () => {
  test('fokus som lämnar Lagerval stänger rutan', async ({ page }) => {
    await cartoTom(page);
    await page.goto(KARTA('torsk-test'));
    await vantaKarta(page);
    await oppnaLagerval(page);
    await page.getByRole('radio', { name: 'CARTO' }).focus();
    await page.keyboard.press('Tab');
    await expect(page.getByRole('button', { name: 'Lagerval' })).toHaveAttribute('aria-expanded', 'false');
  });

  test('fokus som lämnar mobilmenyn stänger den', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto(START());
    const meny = page.getByRole('button', { name: 'Meny', exact: true });
    await meny.click();
    await page.getByRole('banner').getByRole('link', { name: 'In English' }).focus();
    await page.keyboard.press('Tab');
    await expect(meny).toHaveAttribute('aria-expanded', 'false');
  });

  test('zoomknapparna har profilens fokusram', async ({ page }) => {
    await cartoTom(page);
    await page.goto(KARTA('torsk-test'));
    await vantaKarta(page);
    await page.getByRole('application').focus();
    await page.keyboard.press('Tab');
    const knapp = page.getByRole('button', { name: 'Zooma in' });
    await expect(knapp).toBeFocused();
    await expect(knapp).toHaveCSS('outline-width', '3px');
    await expect(knapp).toHaveCSS('outline-color', 'rgb(0, 118, 129)');
    expect(Number(await knapp.evaluate((e) => getComputedStyle(e).fontWeight))).toBeLessThanOrEqual(500);
  });

  test('tvingade färger: det valda alternativet i Lagerval syns', async ({ page }) => {
    await cartoTom(page);
    await page.emulateMedia({ forcedColors: 'active' });
    await page.goto(KARTA('torsk-test'));
    await vantaKarta(page);
    await oppnaLagerval(page);
    const etikett = (namn: string) => page.locator('label', { has: page.getByRole('radio', { name: namn, exact: true }) });
    const vald = await etikett('Klassad').evaluate((e) => getComputedStyle(e).backgroundColor);
    const ovald = await etikett('Kontinuerlig').evaluate((e) => getComputedStyle(e).backgroundColor);
    expect(vald).not.toBe(ovald);
  });

  test('redogörelsen skiljer brister från innehåll som inte omfattas', async ({ page }) => {
    await page.goto(`${server.url}/dist/index.html?data=/tests/fixtures/data/#/tillganglighet`);
    const omfattas = page.getByRole('heading', { name: 'Innehåll som inte omfattas av lagkraven' });
    await expect(omfattas).toBeVisible();
    await expect(omfattas.locator('xpath=following-sibling::*[1]')).toContainText('navigering');
    const brister = page.getByRole('heading', { name: 'Bristande förenlighet med lagkraven' });
    await expect(brister).toBeVisible();
    await expect(brister.locator('xpath=following-sibling::*[1]')).toContainText('2.1.1');
    await expect(brister.locator('xpath=following-sibling::*[1]')).not.toContainText('navigering');
  });
});
