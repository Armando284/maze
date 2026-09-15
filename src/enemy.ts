import type { Point } from './grid'
import { DIRECTIONS, shuffle } from './grid'
import { Maze } from './maze'
import { Player } from './player'
import { Pathfinder } from './pathfinder'

export class Enemy {
	position: Point
	scared = false
	private readonly player: Player
	private readonly moveInterval: number
	private moveTimer = 0
	private readonly pathfinder: Pathfinder
	private readonly maze: Maze

	constructor(
		maze: Maze,
		player: Player,
		startPosition: Point,
		moveInterval: number,
	) {
		this.player = player
		this.maze = maze
		this.moveInterval = moveInterval
		this.pathfinder = new Pathfinder((position: Point) =>
			maze.isWalkable(position),
		)
		this.position = { ...startPosition }
	}

	update(deltaTime: number): void {
		this.moveTimer += deltaTime

		const interval = this.scared ? this.moveInterval * 1.6 : this.moveInterval

		if (this.moveTimer < interval) {
			return
		}

		this.moveTimer = 0

		if (this.scared) {
			this.wander()
			return
		}

		const path = this.pathfinder.findPath(
			this.position,
			this.player.position,
		)

		if (path.length < 2) {
			return
		}

		this.moveTo(path[1])
	}

	isTouchingPlayer(): boolean {
		return (
			this.position.x === this.player.position.x &&
			this.position.y === this.player.position.y
		)
	}

	private wander(): void {
		const options = shuffle(DIRECTIONS)
			.map((direction) => ({
				x: this.position.x + direction.x,
				y: this.position.y + direction.y,
			}))
			.filter((position) => this.maze.isWalkable(position))

		if (options.length === 0) {
			return
		}

		this.moveTo(options[0])
	}

	private moveTo(position: Point): void {
		this.position = { ...position }
	}
}