// Mätning av zoomens jämnhet (inte ett test): bildrutetider under 12 hjulsteg per variant.
// Kör från webb/ efter npm run build: node scripts/zoom-mat.mts  (TESTDATA = mapp med abborre_klassad.tif)
import { chromium } from '@playwright/test';
import { startaRangeServer } from '../tests/range-server.ts';

const webb = await startaRangeServer(new URL('..', import.meta.url).pathname);
const data = await startaRangeServer(process.env.TESTDATA ?? new URL('../../_data/test', import.meta.url).pathname);
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH, args: ['--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const varianter: Record<string, Record<string, string | number>> = {
  'A 3857 standard': { vy: 3857 },
  'B 3857 transition=0 preload=99': { vy: 3857, transition: 0, preload: 99 },
  'C 3006 standard': { vy: 3006 },
  'D 3006 transition=0 preload=99': { vy: 3006, transition: 0, preload: 99 },
  'E fil i 3857, 3857-vy': { vy: 3857, epsg: 3857, fil: 'abborre_klassad_3857.tif' },
};
const valda = process.env.VARIANTER?.split(',');
for (const [namn, { fil = 'abborre_klassad.tif', ...extra }] of Object.entries(varianter)) {
  if (valda && !valda.some((v) => namn.startsWith(v))) continue;
  const resultat: any[] = [];
  for (const [lat, lon] of [[59.33, 18.9], [56.9, 16.5]]) {
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 720 } });
    const page = await ctx.newPage();
    const cdp = await ctx.newCDPSession(page);
    await cdp.send('Network.enable');
    await cdp.send('Network.emulateNetworkConditions', { offline: false, latency: 40, downloadThroughput: 1.25e6, uploadThroughput: 5e5 });
    const q = new URLSearchParams(Object.entries({ cog: `${data.url}/${fil}`, roll: 'klassad', epsg: 3006, res: 25, lon, lat, z: 9, ...extra }).map(([k, v]) => [k, String(v)]));
    await page.goto(`${webb.url}/dist/perf.html?${q}`);
    await page.waitForFunction(() => (window as any).__perf.rendercomplete >= 1, null, { timeout: 60000 });
    // Starta en rAF-logg och zooma in 12 hjulsteg (≈4 nivåer) mitt i kartan, 120 ms mellan stegen.
    await page.evaluate(() => {
      const w = window as any; w.__ramar = []; let fore = performance.now();
      const loop = (t: number) => { w.__ramar.push(t - fore); fore = t; if (!w.__stopp) requestAnimationFrame(loop); };
      requestAnimationFrame(loop);
    });
    await page.mouse.move(640, 360);
    const t0 = Date.now();
    for (let i = 0; i < 12; i++) { await page.mouse.wheel(0, -120); await page.waitForTimeout(120); }
    const fore = await page.evaluate(() => (window as any).__perf.rendercomplete);
    await page.waitForFunction((n) => (window as any).__perf.rendercomplete > n, fore, { timeout: 60000 });
    const klart = Date.now() - t0;
    const ramar: number[] = await page.evaluate(() => { (window as any).__stopp = true; return (window as any).__ramar; });
    const sorterade = [...ramar].sort((a, b) => a - b);
    resultat.push({ punkt: `${lat},${lon}`, klartMs: klart, max: Math.round(sorterade.at(-1)!), p95: Math.round(sorterade[Math.floor(0.95 * sorterade.length)]), over50: ramar.filter((r) => r > 50).length, ramar: ramar.length });
    await ctx.close();
  }
  console.log(namn, JSON.stringify(resultat));
}
await browser.close(); await webb.stang(); await data.stang();
