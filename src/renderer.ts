import type { GameState } from './game-state'
import { CELL_SIZE, toPixel, type Point } from './grid'
import { MAZE_WIDTH, MAZE_HEIGHT, getCell } from './maze'
import { Player } from './player'
import { Enemy } from './enemy'

export class Renderer {
	private readonly context: CanvasRenderingContext2D
	private readonly player: Player
	private readonly state: GameState
	private readonly enemy: Enemy

	constructor(
		context: CanvasRenderingContext2D,
		player: Player,
		enemy: Enemy,
		state: GameState,
	) {
		this.context = context
		this.player = player
		this.enemy = enemy
		this.state = state
	}

	render(): void {
		this.clear()

		if (this.state.status === 'won') {
			this.renderVictory()
			return
		}

		if (this.state.status === 'lost') {
			this.renderGameOver()
			return
		}

		this.renderMaze()
		this.renderExit()
		this.renderEnemy()
		this.renderPlayer()
	}

	private clear(): void {
		this.context.fillStyle = '#000'
		this.context.fillRect(0, 0, 320, 200)
	}

	private renderMaze(): void {
		for (let y = 0; y < MAZE_HEIGHT; y++) {
			for (let x = 0; x < MAZE_WIDTH; x++) {
				const cell = getCell(x, y)

				if (cell === 'wall') {
					this.renderWall(x, y)
				}
			}
		}
	}

	private renderWall(x: number, y: number): void {
		const position = toPixel({ x, y })

		this.context.fillStyle = '#fff'

		this.context.fillRect(position.x, position.y, CELL_SIZE, CELL_SIZE)
	}

	private renderPlayer() {
		const position = toPixel(this.player.position)

		this.context.fillStyle = '#00ff66'
		this.context.fillRect(
			position.x + 2,
			position.y + 2,
			CELL_SIZE - 4,
			CELL_SIZE - 4,
		)
	}

	private renderExit(): void {
		for (let y = 0; y < MAZE_HEIGHT; y++) {
			for (let x = 0; x < MAZE_WIDTH; x++) {
				if (getCell(x, y) !== 'exit') {
					continue
				}

				const position = toPixel({ x, y })

				this.context.fillStyle = '#ffff00'

				this.context.fillRect(
					position.x + 2,
					position.y + 2,
					CELL_SIZE - 4,
					CELL_SIZE - 4,
				)

				return
			}
		}
	}

	private renderVictory(): void {
		this.context.fillStyle = '#00ff66'
		this.context.font = '20px monospace'
		this.context.textAlign = 'center'

		this.context.fillText('YOU ESCAPED', 160, 90)

		this.context.font = '10px monospace'

		this.context.fillText('PRESS ENTER TO PLAY AGAIN', 160, 115)

		this.context.textAlign = 'left'
	}

	private renderEnemy(): void {
		const position = toPixel(this.enemy.position)

		this.context.fillStyle = '#ff3333'

		this.context.fillRect(
			position.x + 2,
			position.y + 2,
			CELL_SIZE - 4,
			CELL_SIZE - 4,
		)
	}

	private renderGameOver(): void {
		this.context.fillStyle = '#ff3333'
		this.context.font = '20px monospace'
		this.context.textAlign = 'center'

		this.context.fillText('YOU WERE CAUGHT', 160, 90)

		this.context.fillStyle = '#fff'
		this.context.font = '10px monospace'

		this.context.fillText('PRESS ENTER TO TRY AGAIN', 160, 115)

		this.context.textAlign = 'left'
	}

	renderPath(path: Point[]): void {
		this.context.fillStyle = '#444'

		for (const point of path) {
			const position = toPixel(point)

			this.context.fillRect(
				position.x + 3,
				position.y + 3,
				CELL_SIZE - 6,
				CELL_SIZE - 6,
			)
		}
	}
}
