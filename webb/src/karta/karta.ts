// Portalens karta: vy i SWEREF 99 TM, CARTO Positron under och ett COG-lager i taget.
import Map from 'ol/Map.js';
import View from 'ol/View.js';
import Attribution from 'ol/control/Attribution.js';
import ScaleLine from 'ol/control/ScaleLine.js';
import Zoom from 'ol/control/Zoom.js';
import type WebGLTileLayer from 'ol/layer/WebGLTile.js';
import { transform, transformExtent } from 'ol/proj.js';
import type { Klass, Roll } from '../lib/katalog';
import { skapaCarto } from './bakgrund';
import { skapaCogLager } from './lager';
import { registreraProjektioner } from './projektioner';
import { klassadStil, kontinuerligStil } from './stil';

export type KartFil = { fil: string; epsg: number };
export type Bakgrund = 'carto' | 'ingen';
export const VY = 'EPSG:3006';
export const NODATA: Record<Roll, number> = { klassad: 255, kontinuerlig: 65535 };

export type Kartan = {
  karta: Map;
  /** Byter datalager. Vyn ligger kvar. */
  visa(kf: KartFil, roll: Roll, klasser: Klass[]): WebGLTileLayer;
  /** Anpassar vyn efter datalagrets utbredning. */
  passa(): Promise<void>;
  setOpacitet(o: number): void;
  setBakgrund(b: Bakgrund): void;
  lager(): WebGLTileLayer | null;
  /** Antal rendercomplete medan datalagrets källa är klar. */
  renderingar(): number;
};

declare global {
  interface Window {
    /** För E2E-testerna. pixelFor ger sidkoordinater. */
    __karta?: { karta: Map; rendercomplete: number; pixelFor(x: number, y: number, epsg: number): [number, number] };
  }
}

export function skapaKarta(mal: HTMLElement, opt: { bakgrund: Bakgrund; cartoNyckel: string; dataUrl: string }): Kartan {
  registreraProjektioner();
  const vy = new View({ projection: VY });
  const carto = skapaCarto(opt.cartoNyckel);
  carto.setVisible(opt.bakgrund === 'carto');
  const karta = new Map({
    target: mal,
    layers: [carto],
    view: vy,
    controls: [new Zoom(), new ScaleLine(), new Attribution({ collapsible: false })],
  });
  let lager: WebGLTileLayer | null = null;
  let opacitet = 1;
  let antal = 0;
  const bas = new URL(opt.dataUrl, location.href);

  // Kartan säger rendercomplete även innan COG-filens huvud är läst. Räkna bara när källan är klar.
  karta.on('rendercomplete', () => {
    if (lager?.getSource()?.getState() !== 'ready') return;
    antal += 1;
    if (window.__karta) window.__karta.rendercomplete = antal;
  });
  window.__karta = {
    karta,
    rendercomplete: 0,
    // Sidkoordinater (inte kartans egna), så att testerna kan flytta musen dit.
    pixelFor: (x, y, epsg) => {
      const [px, py] = karta.getPixelFromCoordinate(transform([x, y], `EPSG:${epsg}`, VY));
      const ruta = karta.getTargetElement()?.getBoundingClientRect() ?? { left: 0, top: 0 };
      return [ruta.left + px, ruta.top + py];
    },
  };

  return {
    karta,
    visa(kf, roll, klasser) {
      const stil = roll === 'klassad' ? klassadStil(klasser) : kontinuerligStil(1000, 0, 1, NODATA.kontinuerlig);
      const ny = skapaCogLager(new URL(kf.fil, bas).href, kf.epsg, NODATA[roll], stil);
      ny.setOpacity(opacitet);
      if (lager) {
        karta.removeLayer(lager);
        lager.dispose();
      }
      karta.addLayer(ny);
      lager = ny;
      return ny;
    },
    async passa() {
      const kalla = lager?.getSource();
      if (!kalla) return;
      const v = await kalla.getView();
      vy.fit(transformExtent(v.extent!, v.projection!, VY), { padding: [24, 24, 24, 24] });
    },
    setOpacitet(o) {
      opacitet = o;
      lager?.setOpacity(o);
    },
    setBakgrund(b) {
      carto.setVisible(b === 'carto');
    },
    lager: () => lager,
    renderingar: () => antal,
  };
}
