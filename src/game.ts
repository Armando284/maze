import { Player } from './player'
import { Renderer } from './renderer'
import { type GameState } from './game-state'
import { Maze } from './maze'
import { Enemy } from './enemy'
import { Ghost } from './ghost'
import type { Point } from './grid'

export class Game {
	private readonly context: CanvasRenderingContext2D
	private lastTime = 0
	private readonly state: GameState = {
		status: 'playing',
	}
	private maze!: Maze
	private player!: Player
	private enemy!: Enemy
	private ghost!: Ghost
	private renderer!: Renderer

	constructor(context: CanvasRenderingContext2D) {
		this.context = context
		this.createGame()
		this.createRenderer()

		window.addEventListener('keydown', (event) => {
			this.handleInput(event)
		})
	}

	private createGame(): void {
		this.maze = new Maze()

		this.player = new Player(this.maze)

		this.enemy = new Enemy(this.maze, this.player, this.findEnemyStart())

		this.ghost = new Ghost(this.player, this.findGhostStart())

		this.state.status = 'playing'
	}

	private createRenderer(): void {
		this.renderer = new Renderer(
			this.context,
			this.maze,
			this.player,
			this.enemy,
			this.ghost,
			this.state,
		)
	}

	start(): void {
		requestAnimationFrame((time) => this.loop(time))
	}

	private loop(time: number): void {
		const deltaTime = time - this.lastTime
		this.lastTime = time

		this.update(deltaTime)
		this.renderer.render()

		requestAnimationFrame((nextTime) => this.loop(nextTime))
	}

	private update(deltaTime: number): void {
		this.enemy.update(deltaTime)
		this.ghost.update(deltaTime)

		if (this.checkVictory()) {
			return
		}

		if (this.checkDefeat()) {
			return
		}
	}

	private handleInput(event: KeyboardEvent): void {
		if (this.state.status !== 'playing' && event.key === 'Enter') {
			this.restart()
			return
		}

		if (this.state.status !== 'playing') {
			return
		}

		switch (event.key) {
			case 'ArrowUp':
			case 'w':
			case 'W':
				this.player.move({ x: 0, y: -1 })
				break

			case 'ArrowDown':
			case 's':
			case 'S':
				this.player.move({ x: 0, y: 1 })
				break

			case 'ArrowLeft':
			case 'a':
			case 'A':
				this.player.move({ x: -1, y: 0 })
				break

			case 'ArrowRight':
			case 'd':
			case 'D':
				this.player.move({ x: 1, y: 0 })
				break
		}
	}

	private checkVictory(): boolean {
		if (this.player.isAtExit()) {
			this.state.status = 'won'
			return true
		}
		return false
	}

	private checkDefeat(): boolean {
		if (this.enemy.isTouchingPlayer() || this.ghost.isTouchingPlayer()) {
			this.state.status = 'lost'
			return true
		}
		return false
	}

	private restart(): void {
		this.createGame()
		this.createRenderer()
	}

	private findEnemyStart(): Point {
		let position = this.maze.findRandomFloor()

		while (
			position.x === this.player.position.x &&
			position.y === this.player.position.y
		) {
			position = this.maze.findRandomFloor()
		}

		return position
	}

	private findGhostStart(): Point {
		let position = this.maze.findRandomFloor()

		while (
			position.x === this.player.position.x &&
			position.y === this.player.position.y
		) {
			position = this.maze.findRandomFloor()
		}

		return position
	}
}
