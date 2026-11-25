// Mobilpanelen (fliken) har två lägen, nere och uppe. Ett svep på greppet byter läge när fingret
// eller musen har flyttats mer än DRAG_GRANS px; kortare rörelser räknas som ett tryck, som
// greppets klickhanterare sköter.

export const DRAG_GRANS = 40;

/** Läget efter ett svep med förflyttningen dy (negativ uppåt), eller null om det var ett tryck. */
export function greppBeslut(uppe: boolean, dy: number): boolean | null {
  if (dy < -DRAG_GRANS) return true;
  if (dy > DRAG_GRANS) return false;
  return null;
}
