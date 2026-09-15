export const CELL_SIZE = 10;
export const GRID_WIDTH = 32;
export const GRID_HEIGHT = 20;

export interface Point {
  x: number;
  y: number;
}

export function toPixel(point: Point): Point {
  return {
    x: point.x * CELL_SIZE,
    y: point.y * CELL_SIZE,
  };
}
