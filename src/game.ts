import { Player } from './player'
import { Renderer } from './renderer'
import { type GameState } from './game-state'
import { Maze } from './maze'
import { Enemy } from './enemy'

export class Game {
	private lastTime = 0
	private readonly player: Player
	private readonly renderer: Renderer
	private readonly state: GameState = {
		status: 'playing',
	}
	private readonly maze: Maze
	private readonly enemy: Enemy

	constructor(context: CanvasRenderingContext2D) {
		this.maze = new Maze()
		this.player = new Player(this.maze)
		this.enemy = new Enemy(this.maze, this.player, { x: 28, y: 17 })
		this.renderer = new Renderer(
			context,
			this.player,
			this.enemy,
			this.state,
		)

		window.addEventListener('keydown', (event) => {
			this.handleInput(event)
		})
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
		void deltaTime
		this.enemy.update(deltaTime)
	}

	private handleInput(event: KeyboardEvent): void {
		if (this.state.status === 'won' && event.key === 'Enter') {
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
		this.checkVictory()
	}

	private checkVictory() {
		if (this.player.isAtExit()) {
			this.state.status = 'won'
		}
	}

	private restart(): void {
		this.state.status = 'playing'
		this.player.reset()
	}
}
