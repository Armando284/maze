import { type Point } from './grid'
import { Maze } from './maze'

export class Player {
	private readonly startPosition: Point = {
		x: 1,
		y: 1,
	}
	position: Point = { ...this.startPosition }
	private readonly maze: Maze

	constructor(maze: Maze) {
		this.maze = maze
	}

	move(direction: Point): boolean {
		const newPosition: Point = {
			x: this.position.x + direction.x,
			y: this.position.y + direction.y,
		}

		if (!this.maze.isWalkable(newPosition)) {
			return false
		}

		this.position = newPosition
		return true
	}

	isAtExit(): boolean {
		return this.maze.isExit(this.position)
	}

	reset(): void {
		this.position = { ...this.startPosition }
	}
}
