import {
	BINDABLE_ACTIONS,
	type GameState,
	type KeyAction,
} from './game-state'
import { ALL_ACHIEVEMENTS } from './achievements'
import { CELL_SIZE, toPixel, type Point } from './grid'
import { MAZE_WIDTH, MAZE_HEIGHT, Maze } from './maze'
import { Player } from './player'
import { Enemy } from './enemy'
import { Ghost } from './ghost'
import { CANVAS_HEIGHT, CANVAS_WIDTH } from './main'

const SYMBOLS = {
	wall: '#',
	dot: '·',
	freeze: '*',
	teleport: 'T',
	exit: 'E',
	pill: '+',
	extra: '1',
	player: '@',
	daemon: '&',
	glitch: '?',
} as const

const POPUP_LIFE = 0.9
const DEMO_DELAY = 12

const KEY_ACTION_LABELS: Record<KeyAction, string> = {
	up: 'UP',
	down: 'DOWN',
	left: 'LEFT',
	right: 'RIGHT',
	action: 'CONFIRM',
	pause: 'PAUSE',
	help: 'HELP',
	mute: 'MUTE',
}

const KEY_DEFAULT_LABELS: Record<KeyAction, string> = {
	up: '\u2191/W',
	down: '\u2193/S',
	left: '\u2190/A',
	right: '\u2192/D',
	action: 'ENTER',
	pause: 'P',
	help: '?/H',
	mute: 'M',
}

function keyName(key: string): string {
	if (key === ' ') {
		return 'SPACE'
	}

	if (key === 'Escape') {
		return 'ESC'
	}

	return key.length === 1 ? key.toUpperCase() : key
}

export class Renderer {
	private readonly context: CanvasRenderingContext2D
	private readonly background: HTMLCanvasElement
	private readonly backgroundContext: CanvasRenderingContext2D | null
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

		this.background = document.createElement('canvas')
		this.background.width = CANVAS_WIDTH
		this.background.height = CANVAS_HEIGHT
		this.backgroundContext = this.background.getContext('2d')
		this.buildBackground()
	}

	private buildBackground(): void {
		const context = this.backgroundContext

		if (!context) {
			return
		}

		context.fillStyle = '#000'
		context.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT)

		context.font = `${CELL_SIZE}px monospace`
		context.textBaseline = 'top'

		for (let y = 0; y < MAZE_HEIGHT; y++) {
			for (let x = 0; x < MAZE_WIDTH; x++) {
				const cell = this.maze.getCell({ x, y })

				if (cell === 'wall') {
					context.fillStyle = '#33ff66'
					this.renderBackgroundCharacter(SYMBOLS.wall, x, y)
				} else if (cell === 'dot') {
					context.fillStyle = '#1d6b33'
					this.renderBackgroundCharacter(SYMBOLS.dot, x, y)
				} else if (cell === 'teleport') {
					context.fillStyle = '#cc66ff'
					this.renderBackgroundCharacter(SYMBOLS.teleport, x, y)
				}
			}
		}
	}

	private renderBackgroundCharacter(character: string, x: number, y: number): void {
		this.backgroundContext?.fillText(character, x * CELL_SIZE, y * CELL_SIZE)
	}

	clearCell(point: Point): void {
		const context = this.backgroundContext

		if (!context) {
			return
		}

		context.fillStyle = '#000'
		context.fillRect(
			point.x * CELL_SIZE,
			point.y * CELL_SIZE,
			CELL_SIZE,
			CELL_SIZE,
		)
	}

	private drawBackground(): void {
		this.context.drawImage(this.background, 0, 0)
	}

	render(): void {
		this.clear()

		switch (this.state.status) {
			case 'title':
				this.renderTitle()
				return

			case 'help':
				this.renderHelp()
				return

			case 'achievements':
				this.renderAchievements()
				return

			case 'keys':
				this.renderKeys()
				return

			case 'paused':
				this.renderGame()
				this.renderPauseOverlay()

				if (this.state.demo) {
					this.drawDemoLabel()
				}
				return
		}

		if (this.state.status === 'won') {
			this.renderVictory()
		} else if (this.state.status === 'gameover') {
			this.renderGameOver()
		} else if (this.state.status === 'playing') {
			this.renderGame()

			if (this.state.introTimer > 0) {
				this.renderIntro()
			}
		}

		if (this.state.demo) {
			this.drawDemoLabel()
		}
	}

	private drawDemoLabel(): void {
		const blink = Math.floor(Date.now() / 400) % 2 === 0

		this.context.textAlign = 'left'
		this.context.textBaseline = 'top'

		this.context.fillStyle = blink ? '#ffcc33' : '#5a3a00'
		this.context.font = '10px monospace'
		this.context.fillText('DEMO MODE // PRESS ANY KEY', 14, CANVAS_HEIGHT - 16)
	}

	private drawMenuRain(): void {
		const now = Date.now()

		this.context.fillStyle = 'rgba(48, 120, 70, 0.25)'
		this.context.font = '14px monospace'

		for (let i = 0; i < 60; i++) {
			const x = (i * 83 + 9) % CANVAS_WIDTH
			const speed = 16 + ((i * 37) % 30)
			const y = ((now * 0.01 + i * 131) % (CANVAS_HEIGHT + 40)) - 20
			const glyph =
				'0123456789ABCDEF'[(i * 5 + Math.floor(now / 400)) % 16]

			this.context.fillText(glyph, x, y)
		}
	}

	private renderGame(): void {
		if (this.state.shake > 0) {
			const magnitude = this.state.shake * 0.5

			this.context.save()
			this.context.translate(
				(Math.random() * 2 - 1) * magnitude,
				(Math.random() * 2 - 1) * magnitude,
			)
		}

		this.context.font = `${CELL_SIZE}px monospace`
		this.context.textBaseline = 'top'

		this.drawBackground()
		this.renderPills()
		this.renderSpecialCells()
		this.renderExit()
		this.renderDaemons()
		this.renderGhost()
		this.renderPlayer()
		this.renderParticles()

		if (this.state.flash > 0) {
			const alpha = Math.min(1, this.state.flash * 4)

			this.context.fillStyle = `rgba(255, 255, 255, ${alpha})`
			this.context.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT)
		}

		this.renderPopups()

		if (this.state.shake > 0) {
			this.context.restore()
		}

		this.renderAchievementToast()
	}

	private renderAchievementToast(): void {
		const toast = this.state.achieveToast

		if (!toast || toast.life <= 0) {
			return
		}

		const fade = Math.min(1, toast.life * 3)
		const blink = Math.floor(Date.now() / 250) % 2 === 0

		this.context.globalAlpha = fade
		this.context.fillStyle = 'rgba(0, 0, 0, 0.62)'
		this.context.fillRect(0, 0, CANVAS_WIDTH, 44)

		this.context.textAlign = 'center'
		this.context.textBaseline = 'top'

		this.context.fillStyle = '#ffcc33'
		this.context.font = '10px monospace'
		this.context.fillText(
			blink ? '*** ACHIEVEMENT UNLOCKED ***' : 'ACHIEVEMENT UNLOCKED',
			CANVAS_WIDTH / 2,
			7,
		)

		this.withGlow(6, '#ffcc33', () => {
			this.context.fillStyle = '#ffffff'
			this.context.font = '14px monospace'
			this.context.fillText(`* ${toast.title} *`, CANVAS_WIDTH / 2, 22)
		})

		this.context.globalAlpha = 1
		this.context.textAlign = 'left'
	}

	private withGlow(blur: number, color: string, draw: () => void): void {
		const context = this.context

		context.shadowColor = color
		context.shadowBlur = blur
		draw()
		context.shadowBlur = 0
	}

	private renderParticles(): void {
		for (const particle of this.state.particles) {
			const position = toPixel({ x: particle.x, y: particle.y })
			const alpha = Math.max(0, particle.life / particle.maxLife)

			this.context.fillStyle = particle.color
			this.context.globalAlpha = alpha
			this.context.fillRect(
				position.x + CELL_SIZE / 2 - particle.size / 2,
				position.y + CELL_SIZE / 2 - particle.size / 2,
				particle.size,
				particle.size,
			)
		}

		this.context.globalAlpha = 1
	}

	private renderPopups(): void {
		this.context.font = '10px monospace'
		this.context.textBaseline = 'top'

		for (const popup of this.state.popups) {
			const position = toPixel({ x: popup.x, y: popup.y })
			const progress = 1 - popup.life / POPUP_LIFE

			this.context.globalAlpha = Math.max(
				0,
				Math.min(1, popup.life / POPUP_LIFE),
			)
			this.context.fillStyle = popup.color
			this.context.fillText(popup.text, position.x + 4, position.y - progress * 26)
		}

		this.context.globalAlpha = 1
	}

	private renderPauseOverlay(): void {
		this.context.fillStyle = 'rgba(0, 0, 0, 0.72)'
		this.context.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT)

		this.context.textAlign = 'center'
		this.context.textBaseline = 'top'

		this.context.fillStyle = '#33ff66'
		this.context.font = '20px monospace'
		this.context.fillText('PAUSED', CANVAS_WIDTH / 2, 104)

		this.context.fillStyle = '#fff'
		this.context.font = '10px monospace'
		this.context.fillText(
			'P/R/Q RESUME RESTART QUIT // B RESUME',
			CANVAS_WIDTH / 2,
			132,
		)

		this.context.textAlign = 'left'
	}

	private renderIntro(): void {
		const ready = Math.floor(Date.now() / 400) % 2 === 0
		const playerPrefix =
			this.state.playerCount === 2
				? `PLAYER ${this.state.currentPlayer} // `
				: ''

		this.context.textAlign = 'center'
		this.context.textBaseline = 'top'

		this.context.fillStyle = '#33ff66'
		this.context.font = '20px monospace'
		this.context.fillText(
			`${playerPrefix}SESSION ${pad2(this.state.session)}`,
			CANVAS_WIDTH / 2,
			96,
		)

		this.context.fillStyle = ready ? '#fff' : '#5a7a5a'
		this.context.font = '12px monospace'
		this.context.fillText('READY?', CANVAS_WIDTH / 2, 124)

		if (this.state.session >= 3) {
			const warn = Math.floor(Date.now() / 300) % 2 === 0

			this.context.fillStyle = warn ? '#ff8833' : '#5a3a00'
			this.context.font = '12px monospace'
			this.context.fillText('HUNTER INBOUND', CANVAS_WIDTH / 2, 148)
		}

		this.context.textAlign = 'left'
	}

	private clear(): void {
		this.context.fillStyle = '#000'
		this.context.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT)
	}

	private renderCharacter(character: string, point: Point): void {
		const position = toPixel(point)

		this.context.fillText(character, position.x, position.y)
	}

	private renderPills(): void {
		const blink = Math.floor(Date.now() / 450) % 2 === 0

		this.withGlow(5, '#00ffd0', () => {
			this.context.fillStyle = blink ? '#00ffd0' : '#005b4a'

			for (let y = 0; y < MAZE_HEIGHT; y++) {
				for (let x = 0; x < MAZE_WIDTH; x++) {
					const cell = this.maze.getCell({ x, y })

					if (cell === 'pill') {
						this.renderCharacter(SYMBOLS.pill, { x, y })
					}
				}
			}
		})
	}

	private renderSpecialCells(): void {
		const blink = Math.floor(Date.now() / 350) % 2 === 0

		for (let y = 0; y < MAZE_HEIGHT; y++) {
			for (let x = 0; x < MAZE_WIDTH; x++) {
				const cell = this.maze.getCell({ x, y })

				if (cell === 'freeze') {
					this.withGlow(4, '#66ccff', () => {
						this.context.fillStyle = blink ? '#66ccff' : '#2a4a5a'
						this.renderCharacter(SYMBOLS.freeze, { x, y })
					})
				} else if (cell === 'extra') {
					this.withGlow(4, '#ffcc33', () => {
						this.context.fillStyle = blink ? '#ffcc33' : '#5a4a00'
						this.renderCharacter(SYMBOLS.extra, { x, y })
					})
				}
			}
		}
	}

	private renderDaemons(): void {
		const frozen = this.state.freeze > 0

		for (const enemy of this.enemies) {
			if (frozen) {
				this.context.fillStyle = '#5a6a7a'
				this.renderCharacter(SYMBOLS.daemon, enemy.position)
				continue
			}

			const color = enemy.scared
				? '#00ddff'
				: enemy.isHunter
					? '#ff8833'
					: '#ff3333'

			this.withGlow(4, color, () => {
				this.context.fillStyle = color
				this.renderCharacter(SYMBOLS.daemon, enemy.position)
			})
		}
	}

	private renderGhost(): void {
		if (this.ghost.removed) {
			return
		}

		if (this.state.freeze > 0) {
			this.context.fillStyle = '#5a6a7a'
			this.renderCharacter(SYMBOLS.glitch, this.ghost.position)
			return
		}

		const color = this.ghost.scared ? '#00ddff' : '#cc66ff'

		this.withGlow(5, color, () => {
			this.context.fillStyle = color
			this.renderCharacter(SYMBOLS.glitch, this.ghost.position)
		})
	}

	private renderHelp(): void {
		const returnHint = Math.floor(Date.now() / 400) % 2 === 0

		this.context.textAlign = 'left'
		this.context.textBaseline = 'top'
		this.drawMenuRain()

		this.context.fillStyle = '#33ff66'
		this.context.font = '22px monospace'
		this.context.fillText('HELP // MANUAL', 14, 20)

		const lines: string[] = [
			'MOVE .... ARROWS / WASD / D-PAD / STICK',
			'BITS · .. +10 EA INTO SCORE, COMBO UP TO x5',
			'+ ........ ANTIVIRUS, EAT SCARED DAEMONS',
			'* ........ FREEZE DAEMONS 5S (LETHAL)',
			'1 ........ RARE +1 LIFE',
			'T ........ TELEPORT BETWEEN THE TWO TILES',
			'& / ? .... DAEMON / GLITCH, -1 LIFE TOUCH',
			'E ........ REACH THE EXIT +1000, NEXT VAULT',
			'SESSION .. NEXT ROUND: FASTER, MORE DAEMONS',
		]

		this.context.fillStyle = '#00ffd0'
		this.context.font = '10px monospace'

		lines.forEach((line, index) => {
			this.context.fillText(line, 14, 56 + index * 16)
		})

		this.context.fillStyle = '#ffcc33'
		this.context.font = '12px monospace'
		this.context.fillText(
			`DIFFICULTY: ${this.state.difficulty.toUpperCase()}   [\u25C0 \u25B6]`,
			14,
			206,
		)
		this.context.fillText(
			this.state.gamepadConnected
				? 'GAMEPAD: CONNECTED'
				: 'GAMEPAD: NO PAD',
			14,
			226,
		)

		this.context.fillStyle = returnHint ? '#33ff66' : '#0a3d17'
		this.context.font = '14px monospace'
		this.context.fillText('> ENTER BACK // ? ACHIEVEMENTS <', 14, 246)
	}

	private renderAchievements(): void {
		const backHint = Math.floor(Date.now() / 400) % 2 === 0
		const unlockedCount = this.state.unlocked.length

		this.context.textAlign = 'left'
		this.context.textBaseline = 'top'
		this.drawMenuRain()

		this.context.fillStyle = '#ffcc33'
		this.context.font = '22px monospace'
		this.context.fillText('ACHIEVEMENTS', 14, 20)

		ALL_ACHIEVEMENTS.forEach((achievement, index) => {
			const unlocked = this.state.unlocked.includes(achievement.id)
			const y = 58 + index * 17

			this.context.fillStyle = unlocked ? '#ffcc33' : '#2a4a2a'
			this.context.font = '12px monospace'
			this.context.fillText(
				`${unlocked ? ' *' : '  '} ${achievement.name}`,
				14,
				y,
			)

			this.context.fillStyle = unlocked ? '#8a7a3a' : '#1d3a1d'
			this.context.font = '10px monospace'
			this.context.fillText(achievement.description, 148, y + 2)
		})

		this.context.fillStyle = '#33ff66'
		this.context.font = '12px monospace'
		this.context.fillText(
			`${unlockedCount}/${ALL_ACHIEVEMENTS.length} UNLOCKED`,
			14,
			246,
		)

		this.context.fillStyle = backHint ? '#33ff66' : '#0a3d17'
		this.context.font = '14px monospace'
		this.context.fillText('> ENTER BACK // ? KEYS <', 14, 266)
	}

	private renderKeys(): void {
		const awaiting = this.state.keysAwaiting
		const backHint = Math.floor(Date.now() / 400) % 2 === 0
		const zoomPercent = 100 + this.state.zoomIndex * 25

		this.context.textAlign = 'left'
		this.context.textBaseline = 'top'
		this.drawMenuRain()

		this.context.fillStyle = '#ffcc33'
		this.context.font = '22px monospace'
		this.context.fillText('KEYS // OPTIONS', 14, 20)

		this.context.fillStyle = '#5a7a5a'
		this.context.font = '10px monospace'
		this.context.fillText(
			'\u25B2 \u25BC SELECT // \u25C0 \u25B6 ZOOM // CONFIRM REMAP',
			14,
			50,
		)

		BINDABLE_ACTIONS.forEach((action, index) => {
			const selected = index === this.state.keysIndex
			const bound = this.state.bindings[action]
			const display = keyName(bound ?? KEY_DEFAULT_LABELS[action])
			const y = 72 + index * 18

			this.context.fillStyle = selected ? '#33ff66' : '#00ffd0'
			this.context.font = selected
				? 'bold 12px monospace'
				: '12px monospace'
			this.context.fillText(
				`${bound ? '*' : ' '}${selected ? '>' : ' '} ${
					KEY_ACTION_LABELS[action]
				}`,
				24,
				y,
			)

			this.context.fillStyle = bound ? '#ffcc33' : '#5a7a5a'
			this.context.textAlign = 'right'
			this.context.fillText(display, CANVAS_WIDTH - 24, y)
			this.context.textAlign = 'left'
		})

		this.context.fillStyle = '#00ffd0'
		this.context.font = '12px monospace'
		this.context.fillText(
			`TERMINAL ZOOM: ${zoomPercent}%   [\u25C0 \u25B6]`,
			24,
			222,
		)

		this.context.fillStyle = '#33ff66'
		this.context.font = '12px monospace'
		this.context.fillText('* = CUSTOM BIND SAVED', 24, 232)

		this.context.fillStyle = backHint ? '#33ff66' : '#0a3d17'
		this.context.font = '14px monospace'
		this.context.fillText(
			awaiting
				? '> PRESS A KEY... (ESC CANCEL) <'
				: '> CONFIRM REMAP // ? BACK <',
			14,
			250,
		)
	}

	private renderPlayer(): void {
		if (this.state.deathTimer > 0) {
			this.context.fillStyle = '#ff3333'
			this.renderCharacter('X', this.player.position)
			return
		}

		if (
			this.state.invincible > 0 &&
			Math.floor(Date.now() / 150) % 2 === 0
		) {
			return
		}

		this.withGlow(6, '#00ff66', () => {
			this.context.fillStyle = '#ffffff'
			this.renderCharacter(SYMBOLS.player, this.player.position)
		})
	}

	private renderExit(): void {
		const blink = Math.floor(Date.now() / 420) % 2 === 0

		this.withGlow(4, '#ffff00', () => {
			this.context.fillStyle = blink ? '#ffff00' : '#5a5a00'
			this.renderCharacter(SYMBOLS.exit, this.maze.exitPosition)
		})
	}

	private renderTitle(): void {
		this.context.textAlign = 'left'
		this.context.textBaseline = 'top'
		this.drawMenuRain()

		const prompt = Math.floor(Date.now() / 500) % 2 === 0

		this.withGlow(8, '#00ff66', () => {
			this.context.fillStyle = '#33ff66'
			this.context.font = '22px monospace'
			this.context.fillText('MAZE.EXE', 14, 20)
		})

		this.context.fillStyle = '#00ffd0'
		this.context.font = '12px monospace'
		this.context.fillText('DECRYPT THE VAULT // v2.0', 14, 52)

		this.context.fillStyle = '#33ff66'
		this.context.font = '12px monospace'
		this.context.fillText('COLLECT BITS: +10 EA × COMBO', 14, 84)
		this.context.fillText('ANTIVIRUS (+) SCARES THE DAEMONS', 14, 102)
		this.context.fillText('* FREEZE // 1 EXTRA LIFE // T WARP', 14, 120)
		this.context.fillText('REACH THE EXIT TO DECRYPT THE VAULT', 14, 138)
		this.context.fillText('HUNTER (ORANGE) APPEARS SESSION 3', 14, 156)

		this.context.fillStyle = prompt ? '#33ff66' : '#0a3d17'
		this.context.font = '14px monospace'
		this.context.fillText('> PRESS ENTER TO RAID <', 14, 174)

		this.context.fillStyle = '#5a7a5a'
		this.context.font = '10px monospace'
		this.context.fillText('P PAUSE // M MUTE // PAD // ? MENUS', 14, 192)

		const blinkLine = Math.floor(Date.now() / 500) % 2 === 0

		this.context.fillStyle = blinkLine ? '#ffcc33' : '#5a3a00'
		this.context.font = '12px monospace'
		this.context.fillText(
			`DIFFICULTY: ${this.state.difficulty.toUpperCase()}   [\u25C0 \u25B6]`,
			14,
			202,
		)

		this.context.fillStyle = '#33ff66'
		this.context.font = '12px monospace'
		this.context.fillText(
			`ACHIEVEMENTS ${this.state.unlocked.length}/${ALL_ACHIEVEMENTS.length}`,
			14,
			214,
		)

		const secondsLeft = Math.max(0, Math.ceil(DEMO_DELAY - this.state.demoTimer))
		const idle = Math.floor(Date.now() / 500) % 2 === 0

		this.context.fillStyle = idle ? '#5a7a5a' : '#2a3a2a'
		this.context.fillText(`AUTO-DEMO IN ${secondsLeft}`, 14, 226)

		this.context.fillStyle = '#ffcc33'
		this.context.font = '12px monospace'
		this.context.fillText(`HI-SCORE ${pad(this.state.hiScore)}`, 14, 238)

		this.context.fillStyle = '#33ff66'
		this.context.font = '12px monospace'
		this.context.fillText(
			`PLAYERS ${this.state.playerCount}   [1 / 2]`,
			14,
			250,
		)
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
			`SCORE ${pad(Math.floor(this.state.scoreDisplay))}  //  SESSION ${pad2(this.state.session)}`,
			Math.abs(CANVAS_WIDTH / 2),
			106,
		)

		if (!this.state.demo) {
			this.context.fillText(
				'PRESS ENTER FOR NEXT SESSION',
				Math.abs(CANVAS_WIDTH / 2),
				124,
			)
		}

		this.context.textAlign = 'left'
	}

	private renderGameOver(): void {
		this.context.textAlign = 'left'
		this.context.textBaseline = 'top'
		this.drawMenuRain()

		this.context.fillStyle = '#ff3333'
		this.context.font = '22px monospace'
		this.context.fillText('GAME OVER', 14, 20)

		let y = 58

		if (this.state.hsEntry) {
			this.context.fillStyle = '#33ff66'
			this.context.font = '14px monospace'
			this.context.fillText(
				`SCORE ${pad(Math.floor(this.state.scoreDisplay))}`,
				14,
				y,
			)
			y += 18

			this.context.fillStyle = '#ffcc33'
			this.context.font = '14px monospace'
			this.context.fillText('NEW HI-SCORE!', 14, y)
			y += 18

			this.context.fillStyle = '#33ff66'
			this.context.font = '10px monospace'
			this.context.fillText('ENTER YOUR NAME:', 14, y)
			y += 16

			this.context.font = '24px monospace'
			this.context.fillStyle = '#ffffff'

			for (let i = 0; i < this.state.hsName.length; i++) {
				const blinking =
					i === this.state.hsIndex &&
					Math.floor(Date.now() / 300) % 2 === 0
				const character = blinking ? '█' : this.state.hsName[i]

				this.context.fillText(character, 14 + i * 26, y)
			}
		} else if (!this.state.demo) {
			this.context.fillStyle = '#5a7a5a'
			this.context.font = '10px monospace'
			this.context.fillText(
				this.state.playerCount === 2 && this.state.currentPlayer === 1
					? 'PRESS ENTER FOR PLAYER 2'
					: 'PRESS ENTER FOR TITLES',
				14,
				y,
			)
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

		if (
			this.state.playerCount === 2 &&
			this.state.currentPlayer === 2 &&
			!this.state.demo
		) {
			const playerOne = this.state.playerScores[0]
			const playerTwo = this.state.score
			const winner =
				playerOne > playerTwo
					? 'PLAYER 1 WINS!'
					: playerTwo > playerOne
						? 'PLAYER 2 WINS!'
						: 'DRAW!'
			const after = y + this.state.scores.length * 17

			this.context.fillStyle = '#00ffd0'
			this.context.font = '12px monospace'
			this.context.fillText(
				`P1 ${pad(playerOne)}  P2 ${pad(playerTwo)}`,
				14,
				after,
			)

			this.context.fillStyle = '#ffcc33'
			this.context.font = '12px monospace'
			this.context.fillText(winner, 14, after + 16)
		}
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