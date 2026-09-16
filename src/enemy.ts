import type { Point } from './grid'
import { DIRECTIONS, shuffle } from './grid'
import { Maze } from './maze'
import { Player } from './player'
import { Pathfinder } from './pathfinder'

export type EnemyBehavior = 'patrol' | 'hunt'

export class Enemy {
	position: Point
	scared = false
	isHunter = false
	private readonly player: Player
	private readonly moveInterval: number
	private readonly behavior: EnemyBehavior
	private moveTimer = 0
	private readonly pathfinder: Pathfinder
	private readonly maze: Maze

	constructor(
		maze: Maze,
		player: Player,
		startPosition: Point,
		moveInterval: number,
		behavior: EnemyBehavior = 'hunt',
		isHunter = false,
	) {
		this.player = player
		this.maze = maze
		this.moveInterval = moveInterval
		this.behavior = behavior
		this.isHunter = isHunter
		this.pathfinder = new Pathfinder((position: Point) =>
			maze.isWalkable(position),
		)
		this.position = { ...startPosition }
	}

	update(deltaTime: number): boolean {
		this.moveTimer += deltaTime

		const interval =
			this.scared || this.behavior === 'patrol'
				? this.moveInterval * 1.6
				: this.moveInterval

		if (this.moveTimer < interval) {
			return false
		}

		this.moveTimer = 0

		if (this.scared || this.behavior === 'patrol') {
			return !this.wander()
		}

		const path = this.pathfinder.findPath(
			this.position,
			this.player.position,
		)

		if (path.length < 2) {
			return true
		}

		this.moveTo(path[1])
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
			.filter((position) => this.maze.isWalkable(position))

		if (options.length === 0) {
			return false
		}

		this.moveTo(options[0])
		return true
	}

	private moveTo(position: Point): void {
		this.position = { ...position }
	}
}