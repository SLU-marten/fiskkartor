import { expect, test, type Page, type TestInfo } from '@playwright/test';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { basename, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { startaRangeServer } from './range-server';

// Servern delar ut hela webb/: den byggda sidan under /dist och testfilerna under /tests/fixtures.
const WEBB = resolve(dirname(fileURLToPath(import.meta.url)), '..');
let server: Awaited<ReturnType<typeof startaRangeServer>>;

test.beforeAll(async () => {
  server = await startaRangeServer(WEBB);
});
test.afterAll(async () => {
  await server.stang();
});

type Parametrar = Record<string, string | number>;
const sida = (q: Parametrar) =>
  `${server.url}/dist/perf.html?` + new URLSearchParams(Object.entries(q).map(([k, v]) => [k, String(v)]));
const fixtur = (namn: string) => `${server.url}/tests/fixtures/${namn}`;

async function vantaRender(page: Page, minst = 1, timeout = 60_000) {
  await page.waitForFunction((n) => ((window as any).__perf?.rendercomplete ?? 0) >= n, minst, { timeout });
}
async function hovra(page: Page, x: number, y: number, epsg: number): Promise<[number, number]> {
  const [px, py] = await page.evaluate(
    ([x, y, e]) => (window as any).__perf.pixelFor(x, y, e) as [number, number],
    [x, y, epsg] as const,
  );
  await page.mouse.move(px, py);
  return [px, py];
}
async function alfaVid(page: Page, x: number, y: number): Promise<number> {
  const png = await page.screenshot({ clip: { x: Math.round(x), y: Math.round(y), width: 1, height: 1 }, omitBackground: true });
  return page.evaluate(async (b64) => {
    const bild = await createImageBitmap(await (await fetch(`data:image/png;base64,${b64}`)).blob());
    const duk = new OffscreenCanvas(1, 1);
    const ctx = duk.getContext('2d')!;
    ctx.drawImage(bild, 0, 0);
    return ctx.getImageData(0, 0, 1, 1).data[3];
  }, png.toString('base64'));
}

test('hover visar klassnamn', async ({ page }) => {
  await page.goto(sida({ cog: fixtur('test_klassad.tif'), roll: 'klassad', epsg: 3006, res: 25 }));
  await vantaRender(page);
  await hovra(page, 603762.5, 6597487.5, 3006);
  await expect(page.locator('#varde')).toHaveText('Mycket viktigt');
  await hovra(page, 600250, 6599750, 3006);
  await expect(page.locator('#varde')).toHaveText('—');
});

test('hover visar kontinuerligt värde', async ({ page }) => {
  await page.goto(sida({ cog: fixtur('test_kontinuerlig.tif'), roll: 'kontinuerlig', epsg: 3006, res: 25 }));
  await vantaRender(page);
  const [dx, dy] = await hovra(page, 603762.5, 6597487.5, 3006);
  await expect(page.locator('#varde')).toHaveText('0.75');
  const [nx, ny] = await hovra(page, 600250, 6599750, 3006);
  await expect(page.locator('#varde')).toHaveText('—');
  await page.mouse.move(0, 0);
  expect(await alfaVid(page, dx, dy)).toBeGreaterThan(0);
  expect(await alfaVid(page, nx, ny)).toBe(0);
});

test('EPSG:3035 visas på rätt plats', async ({ page }) => {
  await page.goto(sida({ cog: fixtur('test_klassad_3035.tif'), roll: 'klassad', epsg: 3035, res: 25 }));
  await vantaRender(page);
  await hovra(page, 4803762.5, 4047487.5, 3035);
  await expect(page.locator('#varde')).toHaveText('Mycket viktigt');
  await hovra(page, 4801237.5, 4047487.5, 3035);
  await expect(page.locator('#varde')).toHaveText('Viktigt');
});

test('rendercomplete räknas först när kartdata finns, även med startvy och långsamt nät', async ({ page }) => {
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('Network.enable');
  await cdp.send('Network.emulateNetworkConditions', { offline: false, latency: 300, downloadThroughput: 1.25e6, uploadThroughput: 5e5 });
  await page.goto(sida({ cog: fixtur('test_klassad.tif'), roll: 'klassad', epsg: 3006, res: 25, lon: 16.8107, lat: 59.5034, z: 13 }));
  await vantaRender(page);
  await hovra(page, 603762.5, 6597487.5, 3006);
  await expect(page.locator('#varde')).toHaveText('Mycket viktigt', { timeout: 500 });
});

// --- 25 m-filerna: körs bara när PERF_KLASSAD (och PERF_KONTINUERLIG) pekar på en COG (sökväg eller URL) ---

const PERF_KLASSAD = process.env.PERF_KLASSAD;
const PERF_KONTINUERLIG = process.env.PERF_KONTINUERLIG;
const NAT = { offline: false, latency: 40, downloadThroughput: 1.25e6, uploadThroughput: 5e5 };
const RAPPORT = resolve(WEBB, 'perf', 'rapport.json');

type Matning = { tifKlartMs: number; bytes: () => Promise<number> };

function mat(page: Page, t0: () => number): Matning {
  const storlekar: Promise<number>[] = [];
  let tifKlartMs = 0;
  page.on('requestfinished', (req) => {
    if (!new URL(req.url()).pathname.endsWith('.tif')) return;
    tifKlartMs = Math.max(tifKlartMs, Date.now() - t0());
    storlekar.push(req.sizes().then((s) => s.responseBodySize));
  });
  return {
    get tifKlartMs() {
      return tifKlartMs;
    },
    bytes: async () => (await Promise.all(storlekar)).reduce((a, b) => a + b, 0),
  };
}

async function strypNat(page: Page) {
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('Network.enable');
  await cdp.send('Network.emulateNetworkConditions', NAT);
}

async function renderare(page: Page): Promise<string> {
  return page.evaluate(() => {
    const gl = document.createElement('canvas').getContext('webgl');
    if (!gl) return 'ingen webgl';
    const info = gl.getExtension('WEBGL_debug_renderer_info');
    return String(info ? gl.getParameter(info.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER));
  });
}

function rapportera(rad: Record<string, unknown>) {
  mkdirSync(dirname(RAPPORT), { recursive: true });
  const rader = existsSync(RAPPORT) ? JSON.parse(readFileSync(RAPPORT, 'utf8')) : [];
  rader.push({ ...rad, tid: new Date().toISOString() });
  writeFileSync(RAPPORT, JSON.stringify(rader, null, 2));
}

// Gränsen gäller total tid. Om bara renderingen i SwiftShader (CPU) drar över, men nätet är klart
// inom gränsen, noteras det i stället: Mårtens kontroll på riktig hårdvara avgör.
function bedom(info: TestInfo, ms: number, tifKlartMs: number, gpu: string, grans: number) {
  if (ms <= grans) return;
  if (/swiftshader|llvmpipe/i.test(gpu) && tifKlartMs <= grans) {
    info.annotations.push({ type: 'cpu-rendering', description: `${ms} ms totalt, nätet klart efter ${tifKlartMs} ms (${gpu})` });
    return;
  }
  expect(ms, `total tid (nätet klart efter ${tifKlartMs} ms, ${gpu})`).toBeLessThanOrEqual(grans);
}

// En URL används som den är; en lokal sökväg delas ut av en egen Range-server.
const extraServrar: Awaited<ReturnType<typeof startaRangeServer>>[] = [];
async function cogUrl(kalla: string): Promise<string> {
  if (/^https?:\/\//.test(kalla)) return kalla;
  const fil = resolve(kalla);
  const s = await startaRangeServer(dirname(fil));
  extraServrar.push(s);
  return `${s.url}/${encodeURIComponent(basename(fil))}`;
}
test.afterAll(async () => {
  await Promise.all(extraServrar.splice(0).map((s) => s.stang()));
});

test.describe('25 m kontinuerlig', () => {
  test.skip(!PERF_KONTINUERLIG, 'sätt PERF_KONTINUERLIG till en kontinuerlig 25 m-COG (sökväg eller URL)');

  test('25 m första vy kontinuerlig', async ({ page }, info) => {
    const cog = await cogUrl(PERF_KONTINUERLIG!);
    await strypNat(page);
    let t0 = 0;
    const m = mat(page, () => t0);
    t0 = Date.now();
    await page.goto(sida({ cog, roll: 'kontinuerlig', epsg: 3006, res: 25 }));
    await vantaRender(page);
    const ms = Date.now() - t0;
    const bytes = await m.bytes();
    const gpu = await renderare(page);
    rapportera({ test: 'första vy kontinuerlig', punkt: null, ms, tifKlartMs: m.tifKlartMs, bytes, renderare: gpu });
    bedom(info, ms, m.tifKlartMs, gpu, 4000);
    expect(bytes).toBeLessThanOrEqual(8e6);
  });
});

test.describe('25 m', () => {
  test.skip(!PERF_KLASSAD, 'sätt PERF_KLASSAD till en klassad 25 m-COG (sökväg eller URL)');
  let cog = '';

  test.beforeAll(async () => {
    cog = await cogUrl(PERF_KLASSAD!);
  });

  test('25 m första vy', async ({ page }, info) => {
    await strypNat(page);
    let t0 = 0;
    const m = mat(page, () => t0);
    t0 = Date.now();
    await page.goto(sida({ cog, roll: 'klassad', epsg: 3006, res: 25 }));
    await vantaRender(page);
    const ms = Date.now() - t0;
    const bytes = await m.bytes();
    const gpu = await renderare(page);
    rapportera({ test: 'första vy', punkt: null, ms, tifKlartMs: m.tifKlartMs, bytes, renderare: gpu });
    bedom(info, ms, m.tifKlartMs, gpu, 4000);
    expect(bytes).toBeLessThanOrEqual(8e6);
  });

  for (const [lat, lon] of [[59.33, 18.9], [60.7, 17.3], [56.9, 16.5]]) {
    test(`25 m inzoomat ${lat}, ${lon}`, async ({ browser }, info) => {
      const kontext = await browser.newContext({ viewport: { width: 1280, height: 720 } });
      const page = await kontext.newPage();
      await strypNat(page);
      let t0 = 0;
      const m = mat(page, () => t0);
      t0 = Date.now();
      await page.goto(sida({ cog, roll: 'klassad', epsg: 3006, res: 25, lon, lat, z: 12 }));
      await vantaRender(page);
      const ms = Date.now() - t0;
      const gpu = await renderare(page);

      // Dra kartan 600 px. Tiden räknas i sidan från att knappen släpps till nästa rendercomplete.
      await page.mouse.move(940, 360);
      await page.mouse.down();
      await page.mouse.move(340, 360, { steps: 12 });
      await page.mouse.up();
      await page.waitForFunction(() => (window as any).__perf.senast > (window as any).__perf.slapp, null, { timeout: 30_000 });
      const panMs = Math.round(await page.evaluate(() => (window as any).__perf.senast - (window as any).__perf.slapp));

      rapportera({ test: 'inzoomat', punkt: [lat, lon], ms, tifKlartMs: m.tifKlartMs, bytes: await m.bytes(), panMs, renderare: gpu });
      await kontext.close();
      bedom(info, ms, m.tifKlartMs, gpu, 4000);
      bedom(info, panMs, 0, gpu, 1500);
    });
  }
});
