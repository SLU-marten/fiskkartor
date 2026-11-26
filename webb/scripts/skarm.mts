// Skärmbilder av vyerna för en visuell kontroll (körs med npx tsx, inte i CI).
import { chromium } from '@playwright/test';
import { startaRangeServer } from '../tests/range-server';

const server = await startaRangeServer(process.cwd());
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH, args: ['--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const bas = `${server.url}/dist/index.html?data=/tests/fixtures/data/`;
const vyer: [string, string, number, number, string?][] = (JSON.parse(process.argv[2] ?? '[]'));
for (const [namn, hash, w, h, klick] of vyer) {
  const page = await browser.newPage({ viewport: { width: w, height: h } });
  await page.route('https://basemaps.cartocdn.com/**', (r) => r.abort());
  await page.goto(bas + hash);
  await page.waitForTimeout(1500);
  if (klick) await page.getByRole('button', { name: klick }).click();
  await page.waitForTimeout(300);
  await page.screenshot({ path: `/tmp/skarm/${namn}.png` });
  await page.close();
}
await browser.close();
await server.stang();
