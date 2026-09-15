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

		switch (this.state.status) {
			case 'title':
				this.renderTitle()
				return

			case 'won':
				this.renderVictory()
				return

			case 'gameover':
				this.renderGameOver()
				return

			case 'playing':
				this.renderGame()
				return
		}
	}

	private renderGame(): void {
		this.context.font = `${CELL_SIZE}px monospace`
		this.context.textBaseline = 'top'

		this.renderMaze()
		this.renderBits()
		this.renderPills()
		this.renderExit()
		this.renderDaemons()
		this.renderGhost()
		this.renderPlayer()

		if (this.state.flash > 0) {
			const alpha = Math.min(1, this.state.flash * 4)

			this.context.fillStyle = `rgba(255, 255, 255, ${alpha})`
			this.context.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT)
		}
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

	private renderPlayer(): void {
		if (
			this.state.invincible > 0 &&
			Math.floor(Date.now() / 150) % 2 === 0
		) {
			return
		}

		this.context.fillStyle = '#ffffff'
		this.renderCharacter(SYMBOLS.player, this.player.position)
	}

	private renderExit(): void {
		const blink = Math.floor(Date.now() / 420) % 2 === 0

		this.context.fillStyle = blink ? '#ffff00' : '#5a5a00'
		this.renderCharacter(SYMBOLS.exit, this.maze.exitPosition)
	}

	private renderTitle(): void {
		this.context.textAlign = 'left'
		this.context.textBaseline = 'top'

		const prompt = Math.floor(Date.now() / 500) % 2 === 0

		this.context.fillStyle = '#33ff66'
		this.context.font = '22px monospace'
		this.context.fillText('MAZE.EXE', 14, 20)

		this.context.fillStyle = '#00ffd0'
		this.context.font = '12px monospace'
		this.context.fillText('DECRYPT THE VAULT // v1.0', 14, 52)

		this.context.fillStyle = '#33ff66'
		this.context.font = '12px monospace'
		this.context.fillText('COLLECT ALL BITS OR REACH THE EXIT', 14, 84)
		this.context.fillText('ANTIVIRUS (+) SCARES THE DAEMONS', 14, 102)
		this.context.fillText('EAT SCARED DAEMON / GLITCH: +200 PTS', 14, 120)
		this.context.fillText('3 LIVES PER SESSION. DONT GET CAUGHT', 14, 138)

		this.context.fillStyle = prompt ? '#33ff66' : '#0a3d17'
		this.context.font = '14px monospace'
		this.context.fillText('> PRESS ENTER TO RAID <', 14, 174)

		this.context.fillStyle = '#ffcc33'
		this.context.font = '12px monospace'
		this.context.fillText(`HI-SCORE ${pad(this.state.hiScore)}`, 14, 206)
	}

	private renderVictory(): void {
		this.context.fillStyle = '#00ff66'
		this.context.font = '20px monospace'
		this.context.textBaseline = 'top'
		this.context.textAlign = 'center'

		this.context.fillText('ACCESS GRANTED', CANVAS_WIDTH / 2, 76)

		this.context.fillStyle = '#fff'
		this.context.font = '10px monospace'
		this.context.fillText(
			`SCORE ${pad(this.state.score)}  //  SESSION ${pad2(this.state.session)}`,
			Math.abs(CANVAS_WIDTH / 2),
			106,
		)

		this.context.fillText(
			'PRESS ENTER FOR NEXT SESSION',
			Math.abs(CANVAS_WIDTH / 2),
			124,
		)

		this.context.textAlign = 'left'
	}

	private renderGameOver(): void {
		this.context.textAlign = 'left'
		this.context.textBaseline = 'top'

		this.context.fillStyle = '#ff3333'
		this.context.font = '22px monospace'
		this.context.fillText('GAME OVER', 14, 20)

		let y = 58

		if (this.state.hsEntry) {
			this.context.fillStyle = '#ffcc33'
			this.context.font = '14px monospace'
			this.context.fillText('NEW HI-SCORE!', 14, y)
			y += 22

			this.context.fillStyle = '#33ff66'
			this.context.font = '10px monospace'
			this.context.fillText('ENTER YOUR NAME:', 14, y)
			y += 18

			this.context.font = '24px monospace'
			this.context.fillStyle = '#ffffff'

			for (let i = 0; i < this.state.hsName.length; i++) {
				const blinking =
					i === this.state.hsIndex &&
					Math.floor(Date.now() / 300) % 2 === 0
				const character = blinking ? '█' : this.state.hsName[i]

				this.context.fillText(character, 14 + i * 26, y)
			}
		} else {
			this.context.fillStyle = '#5a7a5a'
			this.context.font = '10px monospace'
			this.context.fillText('PRESS ENTER FOR TITLES', 14, y)
		}

		y += 56

		this.context.fillStyle = '#33ff66'
		this.context.font = '12px monospace'
		this.context.fillText('--- HIGH SCORES ---', 14, y)
		y += 18

		this.context.font = '12px monospace'

		this.state.scores.forEach((entry, index) => {
			this.context.fillStyle = index === 0 ? '#ffcc33' : '#33ff66'
			this.context.fillText(
				`${index + 1}. ${entry.name} ${pad(entry.score)}`,
				14,
				y + index * 17,
			)
		})
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

function pad(value: number): string {
	return String(value).padStart(6, '0')
}

function pad2(value: number): string {
	return String(value).padStart(2, '0')
}