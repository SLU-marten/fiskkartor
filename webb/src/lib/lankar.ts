// Länkar ur katalogens textfält. Katalogen tillåter namn eller funktionsadress som kontakt och
// både rena DOI och hela länkar.

/** mailto för en e-postadress, länken för en webbadress, annars null (visas som text). */
export function kontaktLank(kontakt: string): string | null {
  const s = kontakt.trim();
  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s)) return `mailto:${s}`;
  if (/^https?:\/\//i.test(s)) return s;
  return null;
}

/** En hel länk används som den är; annars https://doi.org/ framför (utan ett eventuellt "doi:"). */
export function doiLank(doi: string): string {
  const s = doi.trim();
  if (/^https?:\/\//i.test(s)) return s;
  return `https://doi.org/${s.replace(/^doi:\s*/i, '')}`;
}
