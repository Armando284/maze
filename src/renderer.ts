import type { GameState } from './game-state'
import { CELL_SIZE, toPixel, type Point } from './grid'
import { MAZE_WIDTH, MAZE_HEIGHT, Maze } from './maze'
import { Player } from './player'
import { Enemy } from './enemy'
import { Ghost } from './ghost'
import { CANVAS_HEIGHT, CANVAS_WIDTH } from './main'

const SYMBOLS = {
	wall: '#',
	exit: 'E',
	dot: '·',
	pill: '+',
	player: '@',
	daemon: '&',
	glitch: '?',
} as const

export class Renderer {
	private readonly context: CanvasRenderingContext2D
	private readonly player: Player
	private readonly state: GameState
	private readonly enemies: readonly Enemy[]
	private readonly ghost: Ghost
	private readonly maze: Maze

	constructor(
		context: CanvasRenderingContext2D,
		maze: Maze,
		player: Player,
		enemies: readonly Enemy[],
		ghost: Ghost,
		state: GameState,
	) {
		this.context = context
		this.maze = maze
		this.player = player
		this.enemies = enemies
		this.ghost = ghost
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

		this.context.font = `${CELL_SIZE}px monospace`
		this.context.textBaseline = 'top'

		this.renderMaze()
		this.renderBits()
		this.renderPills()
		this.renderExit()
		this.renderDaemons()
		this.renderGhost()
		this.renderPlayer()
	}

	private clear(): void {
		this.context.fillStyle = '#000'
		this.context.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT)
	}

	private renderCharacter(character: string, point: Point): void {
		const position = toPixel(point)

		this.context.fillText(character, position.x, position.y)
	}

	private renderMaze(): void {
		for (let y = 0; y < MAZE_HEIGHT; y++) {
			for (let x = 0; x < MAZE_WIDTH; x++) {
				const cell = this.maze.getCell({ x, y })

				if (cell === 'wall') {
					this.renderWall(x, y)
				}
			}
		}
	}

	private renderWall(x: number, y: number): void {
		this.context.fillStyle = '#33ff66'
		this.renderCharacter(SYMBOLS.wall, { x, y })
	}

	private renderBits(): void {
		this.context.fillStyle = '#1d6b33'

		for (let y = 0; y < MAZE_HEIGHT; y++) {
			for (let x = 0; x < MAZE_WIDTH; x++) {
				const cell = this.maze.getCell({ x, y })

				if (cell === 'dot') {
					this.renderCharacter(SYMBOLS.dot, { x, y })
				}
			}
		}
	}

	private renderPills(): void {
		const blink = Math.floor(Date.now() / 450) % 2 === 0

		this.context.fillStyle = blink ? '#00ffd0' : '#005b4a'

		for (let y = 0; y < MAZE_HEIGHT; y++) {
			for (let x = 0; x < MAZE_WIDTH; x++) {
				const cell = this.maze.getCell({ x, y })

				if (cell === 'pill') {
					this.renderCharacter(SYMBOLS.pill, { x, y })
				}
			}
		}
	}

	private renderDaemons(): void {
		for (const enemy of this.enemies) {
			this.context.fillStyle = enemy.scared ? '#00ddff' : '#ff3333'
			this.renderCharacter(SYMBOLS.daemon, enemy.position)
		}
	}

	private renderGhost(): void {
		if (this.ghost.removed) {
			return
		}

		this.context.fillStyle = this.ghost.scared ? '#00ddff' : '#cc66ff'
		this.renderCharacter(SYMBOLS.glitch, this.ghost.position)
	}

	private renderPlayer() {
		this.context.fillStyle = '#ffffff'
		this.renderCharacter(SYMBOLS.player, this.player.position)
	}

	private renderExit(): void {
		this.context.fillStyle = '#ffff00'
		this.renderCharacter(SYMBOLS.exit, this.maze.exitPosition)
	}

	private renderVictory(): void {
		this.context.fillStyle = '#00ff66'
		this.context.font = '20px monospace'
		this.context.textBaseline = 'top'
		this.context.textAlign = 'center'

		this.context.fillText('ACCESS GRANTED', Math.abs(CANVAS_WIDTH / 2), 90)

		this.context.font = '10px monospace'

		this.context.fillText(
			'PRESS ENTER TO RAID NEXT SESSION',
			Math.abs(CANVAS_WIDTH / 2),
			115,
		)

		this.context.textAlign = 'left'
	}

	private renderGameOver(): void {
		this.context.fillStyle = '#ff3333'
		this.context.font = '20px monospace'
		this.context.textBaseline = 'top'
		this.context.textAlign = 'center'

		this.context.fillText('SYSTEM FAILURE', Math.abs(CANVAS_WIDTH / 2), 90)

		this.context.fillStyle = '#fff'
		this.context.font = '10px monospace'

		this.context.fillText(
			'PRESS ENTER TO RETRY SESSION',
			Math.abs(CANVAS_WIDTH / 2),
			115,
		)

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