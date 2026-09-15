import type { Point } from './grid'
import { Maze } from './maze'
import { Player } from './player'

export class Enemy {
	position: Point
	private readonly maze: Maze
	private readonly player: Player
	private readonly moveInterval: number = 250
	private moveTimer: number = 0

	constructor(maze: Maze, player: Player, startPosition: Point) {
		this.maze = maze
		this.player = player
		this.position = { ...startPosition }
	}

	update(deltaTime: number): void {
		this.moveTimer += deltaTime

		if (this.moveTimer < this.moveInterval) {
			return
		}

		this.moveTimer = 0

		const direction = this.getDirectionTowardsPlayer()

		if (!direction) {
			return
		}

		const nextPosition = {
			x: this.position.x + direction.x,
			y: this.position.y + direction.y,
		}

		if (this.maze.isWalkable(nextPosition)) {
			this.position = nextPosition
		}
	}

	private getDirectionTowardsPlayer(): Point | null {
		const dx = this.player.position.x - this.position.x
		const dy = this.player.position.y - this.position.y

		if (dx === 0 && dy === 0) {
			return null
		}

		if (Math.abs(dx) >= Math.abs(dy)) {
			return {
				x: Math.sign(dx),
				y: 0,
			}
		}

		return {
			x: 0,
			y: Math.sign(dy),
		}
	}

	isTouchingPlayer(): boolean {
		return (
			this.position.x === this.player.position.x &&
			this.position.y === this.player.position.y
		)
	}
}
