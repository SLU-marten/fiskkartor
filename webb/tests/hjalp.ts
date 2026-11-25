// Gemensamma hjälpfunktioner för E2E-testerna (app.spec.ts och tillganglighet.spec.ts).
import AxeBuilder from '@axe-core/playwright';
import type { Page } from '@playwright/test';

export const TOM_PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=', 'base64');
const DATA = '/dist/index.html?data=/tests/fixtures/data/';

export const START = (url: string, q = '') => `${url}${DATA}#/${q ? `?${q}` : ''}`;
export const KARTA = (url: string, id: string, q = '') => `${url}${DATA}#/karta/${id}${q ? `?${q}` : ''}`;
export const SIDA = (url: string, vy: 'om' | 'tillganglighet', q = '') => `${url}${DATA}#/${vy}${q ? `?${q}` : ''}`;

/** Svarar på CARTO:s rutor med en tom bild (sandlådan når inte CARTO). Ger adresserna som begärdes. */
export async function cartoTom(page: Page): Promise<string[]> {
  const rutor: string[] = [];
  await page.route('https://basemaps.cartocdn.com/**', (r) => {
    rutor.push(r.request().url());
    return r.fulfill({ body: TOM_PNG, contentType: 'image/png', headers: { 'Access-Control-Allow-Origin': '*' } });
  });
  return rutor;
}

export async function vantaKarta(page: Page, minst = 1) {
  await page.waitForFunction((n) => ((window as any).__karta?.rendercomplete ?? 0) >= n, minst, { timeout: 30_000 });
}

/** WCAG 2.1 A och AA med axe. Ger "<regel>: <selektorer>" för varje överträdelse. */
export async function granska(page: Page): Promise<string[]> {
  const svar = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
  return svar.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(', ')}`);
}
