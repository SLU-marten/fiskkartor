// Spara kartan som PNG: lagren som de syns, legenden och attribution, ritade på en 2D-duk.
import type Map from 'ol/Map.js';
import { fromString } from 'ol/transform.js';
import { KONTINUERLIGA_STEG, legendfarger } from '../karta/stil';
import type { Klass, Roll } from './katalog';

export type LegendData = { titel: string; roll: Roll; klasser: Klass[]; enhet: string };

/** Legendens plats och mått i bilden (uppe till vänster). */
export const LEGEND = { x: 12, y: 12, kant: 10, rubrik: 20, rad: 22, ruta: 14 };
const REMSA = 24;
const BAKGRUND_ATTRIBUTION = '© OpenStreetMap, © CARTO';
const BLACK = '#17303b';
const TYPSNITT = "'Atkinson Hyperlegible Next', system-ui, sans-serif";

function arBakgrund(duk: HTMLCanvasElement): boolean {
  return duk.classList.contains('bakgrund') || duk.closest('.bakgrund') !== null;
}

/** Ritar lagrens dukar i kartans ordning, som OpenLayers egen sammanställning. Ger om bakgrunden ritades. */
function ritaLager(ctx: CanvasRenderingContext2D, karta: Map, medBakgrund: boolean): boolean {
  let bakgrund = false;
  const dukar = karta.getViewport()?.querySelectorAll<HTMLCanvasElement>('.ol-layers canvas') ?? [];
  for (const duk of dukar) {
    if (duk.width === 0) continue;
    const ar = arBakgrund(duk);
    if (ar && !medBakgrund) continue;
    const behallare = duk.parentElement as HTMLElement;
    ctx.save();
    const opacitet = behallare.style.opacity || duk.style.opacity;
    ctx.globalAlpha = opacitet === '' ? 1 : Number(opacitet);
    if (duk.style.transform) {
      ctx.setTransform(...(fromString(duk.style.transform) as [number, number, number, number, number, number]));
    } else {
      ctx.setTransform(parseFloat(duk.style.width) / duk.width, 0, 0, parseFloat(duk.style.height) / duk.height, 0, 0);
    }
    ctx.drawImage(duk, 0, 0);
    ctx.restore();
    bakgrund ||= ar;
  }
  return bakgrund;
}

function kortad(ctx: CanvasRenderingContext2D, text: string, max: number): string {
  if (ctx.measureText(text).width <= max) return text;
  let t = text;
  while (t.length > 1 && ctx.measureText(`${t}…`).width > max) t = t.slice(0, -1);
  return `${t}…`;
}

function ritaLegend(ctx: CanvasRenderingContext2D, legend: LegendData, maxBredd: number) {
  const { x, y, kant, rubrik, rad, ruta } = LEGEND;
  const poster = legend.roll === 'klassad' ? legendfarger(legend.klasser) : [];
  const rader = legend.roll === 'klassad' ? poster.length : 2;
  ctx.font = `700 13px ${TYPSNITT}`;
  const titel = kortad(ctx, legend.titel, maxBredd - 2 * kant);
  ctx.font = `13px ${TYPSNITT}`;
  const textbredd = Math.max(
    ctx.measureText(titel).width + 10,
    ...poster.map((p) => ruta + 8 + ctx.measureText(p.klass.namn).width),
    legend.roll === 'kontinuerlig' ? 160 : 0,
  );
  const bredd = Math.min(maxBredd, textbredd + 2 * kant);
  const hojd = 2 * kant + rubrik + rader * rad;
  ctx.fillStyle = 'rgb(255 255 255 / 92%)';
  ctx.fillRect(x, y, bredd, hojd);
  ctx.strokeStyle = '#c9d6d8';
  ctx.strokeRect(x + 0.5, y + 0.5, bredd - 1, hojd - 1);
  ctx.fillStyle = BLACK;
  ctx.textBaseline = 'middle';
  ctx.font = `700 13px ${TYPSNITT}`;
  ctx.fillText(titel, x + kant, y + kant + rubrik / 2 - 2);
  ctx.font = `13px ${TYPSNITT}`;
  const forsta = y + kant + rubrik;
  if (legend.roll === 'klassad') {
    poster.forEach((p, i) => {
      ctx.fillStyle = p.rgb;
      ctx.fillRect(x + kant, forsta + i * rad, ruta, ruta);
      ctx.fillStyle = BLACK;
      ctx.fillText(p.klass.namn, x + kant + ruta + 8, forsta + i * rad + ruta / 2);
    });
  } else {
    const gradient = ctx.createLinearGradient(x + kant, 0, x + kant + 160, 0);
    KONTINUERLIGA_STEG.forEach((f, i) => gradient.addColorStop(i / (KONTINUERLIGA_STEG.length - 1), f));
    ctx.fillStyle = gradient;
    ctx.fillRect(x + kant, forsta, 160, ruta);
    ctx.fillStyle = BLACK;
    ctx.fillText(`0`, x + kant, forsta + rad + ruta / 2);
    ctx.textAlign = 'right';
    ctx.fillText(`1  ${legend.enhet}`, x + kant + 160, forsta + rad + ruta / 2);
    ctx.textAlign = 'left';
  }
}

function ritaAttribution(ctx: CanvasRenderingContext2D, text: string, bredd: number, hojd: number) {
  ctx.fillStyle = 'rgb(255 255 255 / 92%)';
  ctx.fillRect(0, hojd - REMSA, bredd, REMSA);
  ctx.fillStyle = BLACK;
  ctx.font = `12px ${TYPSNITT}`;
  ctx.textBaseline = 'middle';
  ctx.fillText(kortad(ctx, text, bredd - 16), 8, hojd - REMSA / 2);
}

/**
 * Sparar kartan som PNG i kartans storlek. Ritas när alla rutor är laddade (rendercomplete efter
 * renderSync). Om bakgrundskartan gör duken spärrad för export ritas bilden om utan bakgrund.
 */
export function sparaSomBild(karta: Map, legend: LegendData, attribution: string): Promise<{ blob: Blob; utanBakgrund: boolean }> {
  return new Promise((klar, fel) => {
    karta.once('rendercomplete', () => {
      try {
        const [bredd, hojd] = karta.getSize() ?? [0, 0];
        const rita = (medBakgrund: boolean) => {
          const duk = document.createElement('canvas');
          duk.width = bredd;
          duk.height = hojd;
          const ctx = duk.getContext('2d')!;
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(0, 0, bredd, hojd);
          const bakgrund = ritaLager(ctx, karta, medBakgrund);
          ritaLegend(ctx, legend, Math.min(320, bredd - 2 * LEGEND.x));
          ritaAttribution(ctx, bakgrund ? `${attribution}  ${BAKGRUND_ATTRIBUTION}` : attribution, bredd, hojd);
          return duk;
        };
        const spara = (duk: HTMLCanvasElement, utanBakgrund: boolean) =>
          duk.toBlob((blob) => (blob ? klar({ blob, utanBakgrund }) : fel(new Error('Bilden kunde inte skapas'))), 'image/png');
        try {
          spara(rita(true), false);
        } catch (e) {
          if ((e as DOMException).name !== 'SecurityError') throw e;
          spara(rita(false), true);
        }
      } catch (e) {
        fel(e);
      }
    });
    karta.renderSync();
  });
}
