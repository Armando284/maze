export const CELL_SIZE = 16

export interface Point {
	x: number
	y: number
}

export const DIRECTIONS: readonly Point[] = [
	{ x: 0, y: -1 },
	{ x: 1, y: 0 },
	{ x: 0, y: 1 },
	{ x: -1, y: 0 },
]

export function toPixel(point: Point): Point {
	return {
		x: point.x * CELL_SIZE,
		y: point.y * CELL_SIZE,
	}
}

export function manhattanDistance(pointA: Point, pointB: Point): number {
	return Math.abs(pointA.x - pointB.x) + Math.abs(pointA.y - pointB.y)
}

export function shuffle<T>(items: readonly T[]): T[] {
	const copy = [...items]

	for (let i = copy.length - 1; i > 0; i--) {
		const j = Math.floor(Math.random() * (i + 1))

		;[copy[i], copy[j]] = [copy[j], copy[i]]
	}

	return copy
}
