import type { Point } from './grid'
import { DIRECTIONS } from './grid'

interface Node {
	position: Point
	previous: Node | null
}

export type CanMove = (position: Point) => boolean

export class Pathfinder {
	private readonly canMove: CanMove
	constructor(canMove: CanMove) {
		this.canMove = canMove
	}

	findPath(start: Point, target: Point): Point[] {
		if (!this.canMove(start)) {
			return []
		}

		if (!this.canMove(target)) {
			return []
		}

		const queue: Node[] = [
			{
				position: start,
				previous: null,
			},
		]

		const visited = new Set<string>()

		visited.add(this.key(start))

		while (queue.length > 0) {
			const current = queue.shift()

			if (!current) {
				break
			}

			if (
				current.position.x === target.x &&
				current.position.y === target.y
			) {
				return this.reconstructPath(current)
			}

			for (const direction of DIRECTIONS) {
				const nextPosition = {
					x: current.position.x + direction.x,
					y: current.position.y + direction.y,
				}

				const key = this.key(nextPosition)

				if (!this.canMove(nextPosition) || visited.has(key)) {
					continue
				}

				visited.add(key)

				queue.push({
					position: nextPosition,
					previous: current,
				})
			}
		}

		return []
	}

	private reconstructPath(node: Node): Point[] {
		const path: Point[] = []
		let current: Node | null = node

		while (current) {
			path.unshift(current.position)
			current = current.previous
		}

		return path
	}

	private key(point: Point): string {
		return `${point.x},${point.y}`
	}
}
