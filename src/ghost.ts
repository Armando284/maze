import type { Point } from './grid'
import { MAZE_HEIGHT, MAZE_WIDTH } from './maze'
import { Pathfinder } from './pathfinder'
import { Player } from './player'

export class Ghost {
	position: Point

	private readonly moveInterval = 500
	private moveTimer = 0

	private readonly pathfinder: Pathfinder
	private readonly player: Player

	constructor(player: Player, startPosition: Point) {
		this.position = { ...startPosition }
		this.player = player
		this.pathfinder = new Pathfinder((position) => this.canMove(position))
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

	private canMove(position: Point): boolean {
		return (
			position.x >= 0 &&
			position.x < MAZE_WIDTH &&
			position.y >= 0 &&
			position.y < MAZE_HEIGHT
		)
	}
}
