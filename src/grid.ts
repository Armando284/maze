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

export function isInsideGrid(point: Point): boolean {
  return (
    point.x >= 0 &&
    point.x < GRID_WIDTH &&
    point.y >= 0 &&
    point.y < GRID_HEIGHT
  )
}