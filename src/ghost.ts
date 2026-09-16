import type { Point } from './grid'
import { DIRECTIONS, shuffle } from './grid'
import { MAZE_HEIGHT, MAZE_WIDTH } from './maze'
import { Pathfinder } from './pathfinder'
import { Player } from './player'

export class Ghost {
	position: Point
	scared = false
	removed = false

	private moveInterval: number
	private moveTimer = 0

	private readonly pathfinder: Pathfinder
	private readonly player: Player

	constructor(player: Player, startPosition: Point, moveInterval: number) {
		this.position = { ...startPosition }
		this.player = player
		this.moveInterval = moveInterval
		this.pathfinder = new Pathfinder((position) => this.canMove(position))
	}

	reset(startPosition: Point, moveInterval: number): void {
		this.position = { ...startPosition }
		this.moveInterval = moveInterval
		this.scared = false
		this.removed = false
		this.moveTimer = 0
	}

	update(deltaTime: number): boolean {
		if (this.removed) {
			return false
		}

		this.moveTimer += deltaTime

		const interval = this.scared ? this.moveInterval * 1.5 : this.moveInterval

		if (this.moveTimer < interval) {
			return false
		}

		this.moveTimer = 0

		if (this.scared) {
			return this.wander()
		}

		const path = this.pathfinder.findPath(
			this.position,
			this.player.position,
		)

		if (path.length < 2) {
			return true
		}

		this.position = { ...path[1] }
		return false
	}

	isTouchingPlayer(): boolean {
		return (
			this.position.x === this.player.position.x &&
			this.position.y === this.player.position.y
		)
	}

	private wander(): boolean {
		const options = shuffle(DIRECTIONS)
			.map((direction) => ({
				x: this.position.x + direction.x,
				y: this.position.y + direction.y,
			}))
			.filter((position) => this.canMove(position))

		if (options.length === 0) {
			return true
		}

		this.position = options[0]
		return false
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