// Mätning (inte ett test): zoomens jämnhet i den riktiga kartvisaren jämfört med perf.html, med samma
// fil, plats och nätverk (40 ms, 10 Mbit/s). Kartvisaren kör CARTO-lagret (rutorna ersätts med en tom
// PNG) och pekarvärdet medan pekaren står på kartan. Kör från webb/ efter npm run build:
//   TESTDATA=<mapp med katalog/ för abborre-25m-test> node scripts/zoom-app.mts
import { chromium, type Page } from '@playwright/test';
import proj4 from 'proj4';
import { startaRangeServer } from '../tests/range-server.ts';

const UTM33 = '+proj=utm +zone=33 +ellps=GRS80 +units=m +no_defs';
const TOM_PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=', 'base64');
const webb = await startaRangeServer(new URL('..', import.meta.url).pathname);
const data = await startaRangeServer(process.env.TESTDATA!);
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH, args: ['--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const katalog = await (await fetch(`${data.url}/katalog/katalog.json`)).json();
const fil = katalog.kartor[0].versioner[0].klassad.fil;

async function mat(page: Page, rakna: () => Promise<number>, mitt: [number, number]) {
  await page.evaluate(() => {
    const w = window as any; w.__ramar = []; let fore = performance.now();
    const loop = (t: number) => { w.__ramar.push(t - fore); fore = t; if (!w.__stopp) requestAnimationFrame(loop); };
    requestAnimationFrame(loop);
  });
  await page.mouse.move(...mitt);
  const t0 = Date.now();
  for (let i = 0; i < 12; i++) { await page.mouse.wheel(0, -120); await page.waitForTimeout(120); }
  const fore = await rakna();
  await page.waitForFunction(async (n) => ((window as any).__karta?.rendercomplete ?? (window as any).__perf?.rendercomplete) > n, fore, { timeout: 60000 });
  const klart = Date.now() - t0;
  const ramar: number[] = await page.evaluate(() => { (window as any).__stopp = true; return (window as any).__ramar; });
  const s = [...ramar].sort((a, b) => a - b);
  return { klartMs: klart, max: Math.round(s.at(-1)!), p95: Math.round(s[Math.floor(0.95 * s.length)]), over50: ramar.filter((r) => r > 50).length };
}

for (const [lat, lon] of [[59.33, 18.9], [56.9, 16.5]]) {
  const [x, y] = proj4('WGS84', UTM33, [lon, lat]);
  const upp = (156543.03392804097 / 2 ** 9) * Math.cos((lat * Math.PI) / 180);
  for (const sida of ['kartvisaren', 'perf.html']) {
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 720 } });
    const page = await ctx.newPage();
    await page.route('https://basemaps.cartocdn.com/**', (r) => r.fulfill({ body: TOM_PNG, contentType: 'image/png', headers: { 'Access-Control-Allow-Origin': '*' } }));
    const cdp = await ctx.newCDPSession(page);
    await cdp.send('Network.enable');
    await cdp.send('Network.emulateNetworkConditions', { offline: false, latency: 40, downloadThroughput: 1.25e6, uploadThroughput: 5e5 });
    let mitt: [number, number] = [640, 360];
    if (sida === 'kartvisaren') {
      await page.goto(`${webb.url}/dist/index.html?data=${data.url}/#/karta/abborre-25m-test?x=${Math.round(x)}&y=${Math.round(y)}&upp=${upp.toFixed(1)}`);
      await page.waitForFunction(() => ((window as any).__karta?.rendercomplete ?? 0) >= 1, null, { timeout: 60000 });
      const b = (await page.locator('.kartyta').boundingBox())!;
      mitt = [b.x + b.width / 2, b.y + b.height / 2];
    } else {
      const q = new URLSearchParams({ cog: `${data.url}/${fil}`, roll: 'klassad', epsg: '3006', res: '25', lon: String(lon), lat: String(lat), z: '9', vy: '3006', bakgrund: 'carto' });
      await page.goto(`${webb.url}/dist/perf.html?${q}`);
      await page.waitForFunction(() => (window as any).__perf.rendercomplete >= 1, null, { timeout: 60000 });
    }
    const r = await mat(page, () => page.evaluate(() => (window as any).__karta?.rendercomplete ?? (window as any).__perf.rendercomplete), mitt);
    console.log(`${lat},${lon} ${sida}: ${JSON.stringify(r)}`);
    await ctx.close();
  }
}
await browser.close(); await webb.stang(); await data.stang();
