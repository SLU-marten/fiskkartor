/**
 * Datamappen: `data/` bredvid sidan, eller den som `?data=` pekar på (för tester och förhandsvisning).
 * Bara en mapp på samma webbplats godtas. Annars kunde en länk få portalen att visa en annan
 * webbplats katalog och nedladdningslänkar under SLU:s namn.
 */
export function dataRot(sok: string, sida: string): string {
  const varde = new URLSearchParams(sok).get('data');
  if (!varde) return 'data/';
  try {
    return new URL(varde, sida).origin === new URL(sida).origin ? varde : 'data/';
  } catch {
    return 'data/';
  }
}
