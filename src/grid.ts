export const CELL_SIZE = 10

export interface Point {
	x: number
	y: number
}

export function toPixel(point: Point): Point {
	return {
		x: point.x * CELL_SIZE,
		y: point.y * CELL_SIZE,
	}
}

export function manhattanDistance(pointA: Point, pointB: Point): number {
	return Math.abs(pointA.x - pointB.x) + Math.abs(pointA.y - pointB.y)
}
