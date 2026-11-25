// Kontrastförhållande enligt WCAG 2.1: relativ luminans med sRGB-linjärisering (gränsen 0,04045).

function luminans(hex: string): number {
  const kanaler = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
  const [r, g, b] = kanaler.map((c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** Kontrasten mellan två färger på formen #rrggbb, från 1 till 21. */
export function kontrast(a: string, b: string): number {
  const [ljus, mork] = [luminans(a), luminans(b)].sort((x, y) => y - x);
  return (ljus + 0.05) / (mork + 0.05);
}
