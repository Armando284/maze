import type { Point } from './grid'
import { DIRECTIONS, manhattanDistance, shuffle } from './grid'

export type Cell = 'wall' | 'floor' | 'dot' | 'pill' | 'exit'

export const MAZE_WIDTH = 31
export const MAZE_HEIGHT = 19

export class Maze {
	private readonly cells: Cell[][]
	private readonly loopDensity = 0.3
	private dotCount = 0

	constructor() {
		this.cells = this.generate()
		this.dotCount = this.countDots()
	}

	getCell(point: Point): Cell {
		if (!this.isInside(point)) {
			return 'wall'
		}

		return this.cells[point.y][point.x]
	}

	isInside(point: Point): boolean {
		return (
			point.x >= 0 &&
			point.x < MAZE_WIDTH &&
			point.y >= 0 &&
			point.y < MAZE_HEIGHT
		)
	}

	isWalkable(point: Point): boolean {
		return this.getCell(point) !== 'wall'
	}

	isExit(point: Point): boolean {
		return this.getCell(point) === 'exit'
	}

	private generate(): Cell[][] {
		const cells = Array.from({ length: MAZE_HEIGHT }, () =>
			Array<Cell>(MAZE_WIDTH).fill('wall'),
		)

		const start: Point = {
			x: 1,
			y: 1,
		}

		cells[start.y][start.x] = 'floor'

		this.carve(cells, start.x, start.y)

		this.addLoops(cells)

		this.fillDots(cells)

		cells[start.y][start.x] = 'floor'

		cells[MAZE_HEIGHT - 2][MAZE_WIDTH - 2] = 'exit'

		this.placePills(cells)

		return cells
	}

	private placePills(cells: Cell[][]): void {
		const candidates: Point[] = []
		const start: Point = { x: 1, y: 1 }
		const exit = this.exitPosition

		for (let y = 1; y < MAZE_HEIGHT - 1; y++) {
			for (let x = 1; x < MAZE_WIDTH - 1; x++) {
				if (cells[y][x] !== 'dot') {
					continue
				}

				const point = { x, y }

				if (manhattanDistance(point, start) < 10) {
					continue
				}

				if (manhattanDistance(point, exit) < 4) {
					continue
				}

				candidates.push(point)
			}
		}

		const pills = shuffle(candidates).slice(0, 2)

		for (const point of pills) {
			cells[point.y][point.x] = 'pill'
		}
	}

	private countDots(): number {
		let count = 0

		for (const row of this.cells) {
			for (const cell of row) {
				if (cell === 'dot') {
					count++
				}
			}
		}

		return count
	}

	private fillDots(cells: Cell[][]): void {
		for (let y = 0; y < MAZE_HEIGHT; y++) {
			for (let x = 0; x < MAZE_WIDTH; x++) {
				if (cells[y][x] === 'floor') {
					cells[y][x] = 'dot'
				}
			}
		}
	}

	collectDot(point: Point): boolean {
		if (this.cells[point.y][point.x] !== 'dot') {
			return false
		}

		this.cells[point.y][point.x] = 'floor'
		this.dotCount--

		return true
	}

	collectPill(point: Point): boolean {
		if (this.cells[point.y][point.x] !== 'pill') {
			return false
		}

		this.cells[point.y][point.x] = 'floor'

		return true
	}

	get dotsRemaining(): number {
		return this.dotCount
	}

	findNearestCollectable(from: Point): Point | null {
		const queue: Point[] = [from]
		const visited = new Set<string>([`${from.x},${from.y}`])

		while (queue.length > 0) {
			const current = queue.shift()

			if (!current) {
				break
			}

			for (const direction of DIRECTIONS) {
				const next = {
					x: current.x + direction.x,
					y: current.y + direction.y,
				}

				if (!this.isWalkable(next)) {
					continue
				}

				const key = `${next.x},${next.y}`

				if (visited.has(key)) {
					continue
				}

				visited.add(key)

				const cell = this.cells[next.y][next.x]

				if (cell === 'dot' || cell === 'pill') {
					return next
				}

				queue.push(next)
			}
		}

		return null
	}

	private carve(cells: Cell[][], x: number, y: number): void {
		const directions = [
			{ x: 0, y: -2 },
			{ x: 2, y: 0 },
			{ x: 0, y: 2 },
			{ x: -2, y: 0 },
		]

		this.shuffle(directions)

		for (const direction of directions) {
			const nextX = x + direction.x
			const nextY = y + direction.y

			if (
				nextX <= 0 ||
				nextX >= MAZE_WIDTH - 1 ||
				nextY <= 0 ||
				nextY >= MAZE_HEIGHT - 1
			) {
				continue
			}

			if (cells[nextY][nextX] !== 'wall') {
				continue
			}

			const middleX = x + direction.x / 2
			const middleY = y + direction.y / 2

			cells[middleY][middleX] = 'floor'
			cells[nextY][nextX] = 'floor'

			this.carve(cells, nextX, nextY)
		}
	}

	private shuffle<T>(items: T[]): void {
		for (let i = items.length - 1; i > 0; i--) {
			const j = Math.floor(Math.random() * (i + 1))

			;[items[i], items[j]] = [items[j], items[i]]
		}
	}

	findRandomFloor(): Point {
		const floorCells: Point[] = []

		for (let y = 1; y < MAZE_HEIGHT - 1; y++) {
			for (let x = 1; x < MAZE_WIDTH - 1; x++) {
				const cell = this.cells[y][x]

				if (cell === 'floor' || cell === 'dot') {
					floorCells.push({ x, y })
				}
			}
		}

		return floorCells[Math.floor(Math.random() * floorCells.length)]
	}

	get exitPosition(): Point {
		return {
			x: MAZE_WIDTH - 2,
			y: MAZE_HEIGHT - 2,
		}
	}

	private addLoops(cells: Cell[][]): void {
		const candidates: Point[] = []

		for (let y = 1; y < MAZE_HEIGHT - 1; y++) {
			for (let x = 1; x < MAZE_WIDTH - 1; x++) {
				if (cells[y][x] !== 'wall') {
					continue
				}

				const horizontal =
					cells[y][x - 1] === 'floor' && cells[y][x + 1] === 'floor'

				const vertical =
					cells[y - 1][x] === 'floor' && cells[y + 1][x] === 'floor'

				if (horizontal || vertical) {
					candidates.push({ x, y })
				}
			}
		}

		this.shuffle(candidates)

		const amount = Math.floor(candidates.length * this.loopDensity)

		for (let i = 0; i < amount; i++) {
			const point = candidates[i]

			cells[point.y][point.x] = 'floor'
		}
	}
}
