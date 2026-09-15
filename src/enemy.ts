import type { Point } from './grid'
import { Maze } from './maze'
import { Player } from './player'
import { Pathfinder } from './pathfinder'

export class Enemy {
	position: Point
	private readonly player: Player
	private readonly moveInterval: number = 250
	private moveTimer: number = 0
	private readonly pathfinder: Pathfinder

	constructor(maze: Maze, player: Player, startPosition: Point) {
		this.player = player
		this.pathfinder = new Pathfinder(maze)
		this.position = { ...startPosition }
	}

	update(deltaTime: number): void {
		this.moveTimer += deltaTime

		if (this.moveTimer < this.moveInterval) {
			return
		}

		this.moveTimer = 0

		const path = this.pathfinder.findPath(
			this.position,
			this.player.position,
		)

		if (path.length < 2) {
			return
		}

		this.position = { ...path[1] }
	}

	isTouchingPlayer(): boolean {
		return (
			this.position.x === this.player.position.x &&
			this.position.y === this.player.position.y
		)
	}
}
