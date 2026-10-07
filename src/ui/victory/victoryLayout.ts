/**
 * Where the victory screen pieces sit (game px, centers), as printed by
 * scripts/victory-art/prepare_victory_art.py. Pure data.
 */
export const VICTORY_LAYOUT = {
  title: { x: 480, y: 76, maxWidth: 860 },
  card: { x: 480, y: 252.8 },
  /** Portrait window inside the card frame, and the name plate below it. */
  cardWindow: { x: 480.3, y: 235.6, width: 216, height: 194 },
  namePlate: { x: 480.3, y: 351.5, width: 206 },
  resultPanel: { x: 480.3, y: 408.9, width: 522 },
  button: { x: 480, y: 472.9 },
} as const;
