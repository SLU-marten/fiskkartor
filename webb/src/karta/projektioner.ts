import proj4 from 'proj4';
import { register } from 'ol/proj/proj4.js';
import { get as hamtaProjektion } from 'ol/proj.js';

/** Koordinatsystem som portalen tar emot (samma lista som publiceringen i R). */
export const TILLATNA_EPSG = [3006, 3035, 25833, 4326, 3857] as const;

// SWEREF 99 TM och ETRS89 / UTM 33N har samma parametrar.
export const UTM33 = '+proj=utm +zone=33 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs +type=crs';
const LAEA =
  '+proj=laea +lat_0=52 +lon_0=10 +x_0=4321000 +y_0=3210000 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs +type=crs';

/** Registrerar EPSG:3006, 25833 och 3035 i proj4 och OpenLayers. 4326 och 3857 finns redan. */
export function registreraProjektioner(): void {
  proj4.defs('EPSG:3006', UTM33);
  proj4.defs('EPSG:25833', UTM33);
  proj4.defs('EPSG:3035', LAEA);
  register(proj4);
  // Samma utbredning som Lantmäteriets rutnät för SWEREF 99 TM, så att en vy i 3006 kan zooma.
  for (const kod of ['EPSG:3006', 'EPSG:25833']) hamtaProjektion(kod)?.setExtent([-1200000, 4700000, 2600000, 8500000]);
}
