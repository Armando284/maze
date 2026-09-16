import { Player } from './player'
import { ALL_ACHIEVEMENTS } from './achievements'
import { Renderer } from './renderer'
import {
	BINDABLE_ACTIONS,
	type Difficulty,
	type GameState,
	type KeyAction,
	type PlayStats,
	type ScoreEntry,
} from './game-state'
import { Maze } from './maze'
import { Enemy, type EnemyBehavior } from './enemy'
import { Ghost } from './ghost'
import { Audio } from './audio'
import { Hud } from './hud'
import { GamepadInput } from './gamepad'
import { Pathfinder } from './pathfinder'
import { type Point, manhattanDistance } from './grid'

const PLAYER_MOVE_INTERVAL = 110
const POINTS_PER_BIT = 10
const PILL_BONUS = 50
const SLAY_BONUS = 200
const HUNTER_BONUS = 300
const SESSION_BONUS = 1000
const HUNT_SESSION = 2
const HUNTER_SESSION = 3
const FRIGHT_DURATION = 8
const FREEZE_DURATION = 5
const EXTRA_LIFE_CAP = 6
const COMBO_WINDOW = 1200
const COMBO_MAX = 5
const MAX_LIVES = 3
const INVINCIBLE_DURATION = 2
const FLASH_DURATION = 0.3
const INTRO_DURATION = 1.4
const POPUP_LIFE = 0.9
const DEATH_DURATION = 0.9
const SHAKE_MAX = 10
const MAX_PARTICLES = 120
const MAX_POPUPS = 30
const ACHIEVE_TOAST_DURATION = 3.5
const DEMO_DELAY = 12
const DEMO_RESULT_DELAY = 4
const MAX_SCORES = 5
const SCORES_KEY = 'maze-scores'
const HI_SCORE_KEY = 'maze-hi-score'
const MUTED_KEY = 'maze-muted'
const DIFFICULTY_KEY = 'maze-difficulty'
const STATS_KEY = 'maze-stats'
const ACHIEVEMENTS_KEY = 'maze-achievements'
const KEYS_KEY = 'maze-keys'
const ZOOM_KEY = 'maze-zoom'
const PLAYERS_KEY = 'maze-players'
const INITIALS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
const ZOOM_OPTIONS = [1, 1.25, 1.5]

const EMPTY_STATS: PlayStats = {
	bits: 0,
	daemons: 0,
	ghosts: 0,
	freezeUses: 0,
	teleportUses: 0,
	pills: 0,
	maxCombo: 0,
}

interface DifficultyConfig {
	lives: number
	speedScale: number
}

const DIFFICULTIES: Record<Difficulty, DifficultyConfig> = {
	easy: { lives: 5, speedScale: 1.2 },
	normal: { lives: 3, speedScale: 1 },
	ranked: { lives: 2, speedScale: 0.85 },
}

const DIFFICULTY_ORDER: readonly Difficulty[] = ['easy', 'normal', 'ranked']

const DIRECTION_BY_KEY: Record<string, Point> = {
	ArrowUp: { x: 0, y: -1 },
	w: { x: 0, y: -1 },
	W: { x: 0, y: -1 },
	ArrowDown: { x: 0, y: 1 },
	s: { x: 0, y: 1 },
	S: { x: 0, y: 1 },
	ArrowLeft: { x: -1, y: 0 },
	a: { x: -1, y: 0 },
	A: { x: -1, y: 0 },
	ArrowRight: { x: 1, y: 0 },
	d: { x: 1, y: 0 },
	D: { x: 1, y: 0 },
}

export class Game {
	private readonly context: CanvasRenderingContext2D
	private lastTime = 0
	private playerMoveTimer = 0
	private nextBounceAt = 0
	private started = false
	private readonly heldKeys = new Set<string>()
	private readonly pressOrder: string[] = []
	private touchX = 0
	private touchY = 0
	private touchActive = false
	private readonly audio = new Audio()
	private readonly hud = new Hud()
	private readonly gamepad: GamepadInput
	private readonly state: GameState = {
		status: 'title',
		playerCount: 1,
		currentPlayer: 1,
		playerScores: [0, 0],
		score: 0,
		hiScore: 0,
		session: 1,
		fright: 0,
		freeze: 0,
		lives: MAX_LIVES,
		invincible: 0,
		flash: 0,
		muted: false,
		difficulty: 'normal',
		gamepadConnected: false,
		stats: { ...EMPTY_STATS },
		unlocked: [],
		lostLifeThisSession: false,
		achieveToast: null,
		bindings: {},
		keysIndex: 0,
		keysAwaiting: false,
		zoomIndex: 0,
		introTimer: 0,
		deathTimer: 0,
		shake: 0,
		combo: 0,
		comboTimer: 0,
		scoreDisplay: 0,
		demo: false,
		demoTimer: 0,
		popups: [],
		particles: [],
		scores: this.loadScores(),
		hsName: 'AAA',
		hsIndex: 0,
		hsEntry: false,
	}
	private readonly enemyMinDistance = 12
	private get ghostMinDistance(): number {
		return Math.max(6, 18 - (this.state.session - 1) * 2)
	}

	private get maxLives(): number {
		return DIFFICULTIES[this.state.difficulty].lives
	}

	private get difficultyScale(): number {
		return DIFFICULTIES[this.state.difficulty].speedScale
	}

	private maze!: Maze
	private player!: Player
	private enemies: Enemy[] = []
	private ghost!: Ghost
	private renderer!: Renderer
	private botPathfinder: Pathfinder | null = null
	private readonly movementKeys = new Map<string, Point>()
	private readonly actionKeys = new Set<string>()
	private readonly pauseKeys = new Set<string>()
	private readonly helpKeys = new Set<string>()
	private readonly muteKeys = new Set<string>()

	constructor(context: CanvasRenderingContext2D) {
		this.context = context
		this.state.muted = this.loadMuted()
		this.audio.setMuted(this.state.muted)
		this.state.difficulty = this.loadDifficulty()
		this.state.hiScore = this.loadHiScore()
		this.state.stats = this.loadStats()
		this.state.unlocked = this.loadUnlocked()
		this.state.bindings = this.loadBindings()
		this.state.zoomIndex = this.loadZoom()
		this.state.playerCount = this.loadPlayerCount()
		this.rebuildInputs()
		this.applyZoom()
		this.createGame()
		this.createRenderer()
		this.state.status = 'title'

		window.addEventListener('keydown', (event) => {
			this.handleKeyDown(event)
		})
		window.addEventListener('keyup', (event) => {
			this.handleKeyUp(event)
		})

		this.gamepad = new GamepadInput(
			(key) => this.simulateKey('keydown', key),
			(key) => this.simulateKey('keyup', key),
		)

		const canvas = this.context.canvas
		canvas.addEventListener(
			'touchstart',
			(event) => this.handleTouchStart(event),
			{ passive: true },
		)
		canvas.addEventListener(
			'touchend',
			(event) => this.handleTouchEnd(event),
			{ passive: true },
		)
	}

	private handleTouchStart(event: TouchEvent): void {
		const touch = event.touches[0]

		if (!touch) {
			return
		}

		this.touchX = touch.clientX
		this.touchY = touch.clientY
		this.touchActive = true
	}

	private handleTouchEnd(event: TouchEvent): void {
		if (!this.touchActive) {
			return
		}

		this.touchActive = false
		const touch = event.changedTouches[0]

		if (!touch) {
			return
		}

		const dx = touch.clientX - this.touchX
		const dy = touch.clientY - this.touchY
		const absX = Math.abs(dx)
		const absY = Math.abs(dy)

		if (Math.max(absX, absY) < 30) {
			this.handleCanvasTap()
			return
		}

		if (this.state.status !== 'playing') {
			return
		}

		const key =
			absX > absY
				? dx > 0
					? 'ArrowRight'
					: 'ArrowLeft'
				: dy > 0
					? 'ArrowDown'
					: 'ArrowUp'

		this.simulateKey('keydown', key)
		window.setTimeout(() => this.simulateKey('keyup', key), 60)
	}

	private handleCanvasTap(): void {
		if (this.state.status === 'playing') {
			return
		}

		if (this.state.status === 'keys' && this.state.keysAwaiting) {
			return
		}

		if (this.state.status === 'paused') {
			this.simulateKey('keydown', 'p')
			return
		}

		this.simulateKey('keydown', 'Enter')
	}

	private simulateKey(type: 'keydown' | 'keyup', key: string): void {
		window.dispatchEvent(new KeyboardEvent(type, { key }))
	}

	unlockAudio(): void {
		this.audio.unlock()
	}

	getAudio(): Audio {
		return this.audio
	}

	playBootJingle(): void {
		this.audio.bootJingle()
	}

	private createGame(): void {
		this.maze = new Maze()

		this.player = new Player(this.maze)

		this.spawnEnemies()

		this.ghost = new Ghost(
			this.player,
			this.findGhostStart(),
			this.ghostInterval,
		)

		this.heldKeys.clear()
		this.pressOrder.length = 0
		this.playerMoveTimer = 0

		this.state.status = 'playing'
		this.state.lives = this.maxLives
		this.state.lostLifeThisSession = false
		this.state.achieveToast = null
		this.state.fright = 0
		this.state.freeze = 0
		this.state.invincible = 0
		this.state.flash = 0
		this.state.deathTimer = 0
		this.state.shake = 0
		this.state.hsEntry = false
		this.state.popups.length = 0
		this.state.particles.length = 0
		this.state.combo = 0
		this.state.comboTimer = 0
		this.state.scoreDisplay = 0
	}

	private spawnEnemies(): void {
		const starts = this.findEnemyStarts(this.enemyCount)

		this.enemies.length = 0
		this.enemies.push(
			...starts.map((start, index) => {
				const isHunter =
					this.state.session >= HUNTER_SESSION && index === 0
				const behavior: EnemyBehavior =
					this.state.session >= HUNT_SESSION ? 'hunt' : 'patrol'
				const interval = isHunter ? this.hunterInterval : this.enemyInterval

				return new Enemy(
					this.maze,
					this.player,
					start,
					interval,
					behavior,
					isHunter,
				)
			}),
		)
	}

	private resetEntities(): void {
		this.spawnEnemies()
		this.ghost.reset(this.findGhostStart(), this.ghostInterval)
		this.player.reset()
		this.state.fright = 0
	}

	private createRenderer(): void {
		this.renderer = new Renderer(
			this.context,
			this.maze,
			this.player,
			this.enemies,
			this.ghost,
			this.state,
		)
	}

	start(): void {
		this.started = true
		this.audio.startMusic()
		requestAnimationFrame((time) => this.loop(time))
	}

	private loop(time: number): void {
		const deltaTime = time - this.lastTime
		this.lastTime = time

		this.gamepad.update()
		this.state.gamepadConnected = this.gamepad.isConnected
		this.update(deltaTime)
		this.renderer.render()
		this.hud.update(this.state)

		requestAnimationFrame((nextTime) => this.loop(nextTime))
	}

	private update(deltaTime: number): void {
		if (this.state.status === 'paused') {
			return
		}

		if (this.state.status === 'title') {
			if (!this.state.demo) {
				this.state.demoTimer += deltaTime / 1000

				if (this.state.demoTimer >= DEMO_DELAY) {
					this.startDemo()
				}
			}
			this.updateHiScore()
			return
		}

		if (this.state.status !== 'playing') {
			if (
				this.state.demo &&
				(this.state.status === 'won' || this.state.status === 'gameover')
			) {
				this.state.demoTimer -= deltaTime / 1000

				if (this.state.demoTimer <= 0) {
					if (this.state.status === 'won') {
						this.state.demoTimer = 0
						this.nextSession()
					} else {
						this.endDemo()
					}
				}
			}

			if (
				this.state.status === 'gameover' ||
				this.state.status === 'won'
			) {
				const step = deltaTime / 1000
				this.state.scoreDisplay = Math.min(
					this.state.score,
					this.state.scoreDisplay + (this.state.score * 0.6 + 40) * step,
				)
			}

			this.updateHiScore()
			return
		}

		if (this.state.introTimer > 0) {
			this.state.introTimer = Math.max(
				0,
				this.state.introTimer - deltaTime / 1000,
			)
			this.updateHiScore()
			return
		}

		if (this.state.deathTimer > 0) {
			this.state.deathTimer -= deltaTime / 1000
			this.state.flash = Math.max(0, this.state.flash - deltaTime / 1000)
			this.state.shake = Math.max(0, this.state.shake - deltaTime / 50)
			const slowStep = deltaTime * 0.35
			this.agePopups(slowStep)
			this.ageParticles(slowStep)
			this.spawnDeathEmbers()

			if (this.state.deathTimer <= 0) {
				this.state.deathTimer = 0
				this.gameOver()
				this.updateHiScore()
			}
			return
		}

		if (this.state.demo) {
			this.botTick()
		}
		this.audio.setTempo(
			this.state.fright > 0 || this.state.freeze > 0 ? 0.72 : 1,
		)
		this.updatePlayer(deltaTime)
		this.updateFrightState(deltaTime)
		this.updateTimers(deltaTime)
		this.agePopups(deltaTime)
		this.ageParticles(deltaTime)

		const frozen = this.state.freeze > 0

		if (!frozen) {
			for (const enemy of this.enemies) {
				const bumped = enemy.update(deltaTime)

				if (bumped) {
					this.bounce(enemy.position, { x: 0, y: 0 }, '#ff6666')
				}
			}

			const ghostBumped = this.ghost.update(deltaTime)

			if (ghostBumped) {
				this.bounce(this.ghost.position, { x: 0, y: 0 }, '#ccff99')
			}
		}

		if (this.checkVictory()) {
			return
		}

		if (this.checkCollisions()) {
			return
		}

		this.updateHiScore()
	}

	private startDemo(): void {
		this.state.demo = true
		this.state.demoTimer = 0
		this.state.session = 1
		this.state.score = 0
		this.botPathfinder = new Pathfinder((position) =>
			this.maze.isWalkable(position),
		)
		this.createGame()
		this.createRenderer()
		this.state.introTimer = 0
		this.audio.startMusic()
	}

	private endDemo(): void {
		this.state.demo = false
		this.state.demoTimer = 0
		this.state.status = 'title'
	}

	private botTick(): void {
		const pathfinder = this.botPathfinder

		if (!pathfinder) {
			return
		}

		const collectable = this.maze.findNearestCollectable(this.player.position)
		const target = collectable ?? this.maze.exitPosition
		const path = pathfinder.findPath(this.player.position, target)

		if (path.length < 2) {
			return
		}

		const step = {
			x: path[1].x - path[0].x,
			y: path[1].y - path[0].y,
		}
		const key = directionKey(step)

		if (!key || this.pressOrder[this.pressOrder.length - 1] === key) {
			return
		}

		this.heldKeys.clear()
		this.pressOrder.length = 0
		this.pressOrder.push(key)
	}

	private agePopups(deltaTime: number): void {
		const popups = this.state.popups
		const step = deltaTime / 1000
		let alive = 0

		for (const popup of popups) {
			popup.life -= step

			if (popup.life > 0) {
				popups[alive] = popup
				alive++
			}
		}

		popups.length = alive
	}

	private addPopup(text: string, x: number, y: number, color: string): void {
		const popups = this.state.popups

		if (popups.length >= MAX_POPUPS) {
			popups.shift()
		}

		popups.push({ text, x, y, life: POPUP_LIFE, color })
	}

	private ageParticles(deltaTime: number): void {
		const particles = this.state.particles
		const step = deltaTime / 1000
		let alive = 0

		for (const particle of particles) {
			particle.life -= step
			particle.x += particle.vx * step
			particle.y += particle.vy * step

			if (particle.life > 0) {
				particles[alive] = particle
				alive++
			}
		}

		particles.length = alive
	}

	private spawnBurst(
		x: number,
		y: number,
		color: string,
		count: number,
		speed: number,
		size: number,
	): void {
		for (let index = 0; index < count; index++) {
			if (this.state.particles.length >= MAX_PARTICLES) {
				break
			}

			const angle = Math.random() * Math.PI * 2
			const velocity = speed * (0.3 + Math.random() * 0.7)

			this.state.particles.push({
				x,
				y,
				vx: Math.cos(angle) * velocity,
				vy: Math.sin(angle) * velocity,
				life: 0.3 + Math.random() * 0.3,
				maxLife: 0.6,
				color,
				size: size * (0.6 + Math.random() * 0.8),
			})
		}
	}

	private spawnDeathEmbers(): void {
		const position = this.player.position
		const palette = ['#ff3333', '#ffaa33', '#ffff66']

		for (let index = 0; index < 2; index++) {
			this.spawnBurst(
				position.x,
				position.y,
				palette[Math.floor(Math.random() * palette.length)],
				1,
				2.2,
				2.5,
			)
		}
	}

	private updateTimers(deltaTime: number): void {
		this.state.invincible = Math.max(0, this.state.invincible - deltaTime / 1000)
		this.state.flash = Math.max(0, this.state.flash - deltaTime / 1000)
		this.state.shake = Math.max(0, this.state.shake - deltaTime / 50)
		this.state.freeze = Math.max(0, this.state.freeze - deltaTime / 1000)

		this.state.comboTimer = Math.max(0, this.state.comboTimer - deltaTime)

		if (this.state.comboTimer === 0) {
			this.state.combo = 0
		}

		if (this.state.achieveToast) {
			this.state.achieveToast.life = Math.max(
				0,
				this.state.achieveToast.life - deltaTime / 1000,
			)

			if (this.state.achieveToast.life === 0) {
				this.state.achieveToast = null
			}
		}
	}

	private updateFrightState(deltaTime: number): void {
		if (this.state.fright <= 0) {
			return
		}

		this.state.fright = Math.max(0, this.state.fright - deltaTime / 1000)

		if (this.state.fright === 0) {
			for (const enemy of this.enemies) {
				enemy.scared = false
			}
			this.ghost.scared = false
		}
	}

	private updatePlayer(deltaTime: number): void {
		this.playerMoveTimer += deltaTime

		if (this.playerMoveTimer < PLAYER_MOVE_INTERVAL) {
			return
		}

		this.playerMoveTimer = 0

		if (this.pressOrder.length === 0) {
			return
		}

		const direction = this.currentDirection

		if (direction) {
			this.movePlayer(direction)
		}
	}

	private get currentDirection(): Point | null {
		const key = this.pressOrder[this.pressOrder.length - 1]

		if (!key) {
			return null
		}

		return this.movementKeys.get(key) ?? null
	}

	private handleKeyDown(event: KeyboardEvent): void {
		this.audio.unlock()

		if (!this.started) {
			return
		}

		if (this.state.status === 'keys' && this.state.keysAwaiting) {
			this.handleKeysKey(event)
			return
		}

		if (this.muteKeys.has(event.key)) {
			this.toggleMute()
			return
		}

		if (this.state.demo) {
			this.endDemo()

			if (this.isAction(event.key)) {
				this.startRun()
			}
			return
		}

		switch (this.state.status) {
			case 'title':
				this.state.demoTimer = 0

				if (event.key === '1' || event.key === '2') {
					this.setPlayerCount(event.key === '2' ? 2 : 1)
					return
				}

				if (this.isHelp(event.key)) {
					this.state.status = 'help'
					return
				}

				if (this.isAction(event.key)) {
					this.startRun()
					return
				}

				const titleStep = this.difficultyStep(event.key)

				if (titleStep !== 0) {
					this.cycleDifficulty(titleStep)
				}
				return

			case 'help':
				if (this.isHelp(event.key)) {
					this.state.status = 'achievements'
					return
				}

				if (this.isAction(event.key) || this.pauseKeys.has(event.key)) {
					this.state.status = 'title'
					return
				}

				const helpStep = this.difficultyStep(event.key)

				if (helpStep !== 0) {
					this.cycleDifficulty(helpStep)
				}
				return

			case 'achievements':
				if (this.isHelp(event.key)) {
					this.state.status = 'keys'
					return
				}

				if (this.isAction(event.key) || this.pauseKeys.has(event.key)) {
					this.state.status = 'title'
				}
				return

			case 'keys':
				this.handleKeysKey(event)
				return

			case 'gameover':
				this.handleGameOverKey(event)
				return

			case 'won':
				if (this.isAction(event.key)) {
					this.nextSession()
				}
				return

			case 'playing':
				if (this.pauseKeys.has(event.key)) {
					this.setPaused(true)
					return
				}
				this.handlePlayingKey(event)
				return

			case 'paused':
				if (event.key === 'r' || event.key === 'R') {
					this.newGame()
					return
				}

				if (event.key === 'q' || event.key === 'Q') {
					this.audio.stopMusic()
					this.state.status = 'title'
					return
				}

				if (this.pauseKeys.has(event.key)) {
					this.setPaused(false)
				}
				return
		}
	}

	private isAction(key: string): boolean {
		return this.actionKeys.has(key)
	}

	private isHelp(key: string): boolean {
		return this.helpKeys.has(key)
	}

	private difficultyStep(key: string): number {
		const direction = this.movementKeys.get(key)

		if (!direction) {
			return 0
		}

		if (direction.x === -1) {
			return -1
		}

		if (direction.x === 1) {
			return 1
		}

		return 0
	}

	private rebuildInputs(): void {
		this.movementKeys.clear()
		this.actionKeys.clear()
		this.pauseKeys.clear()
		this.helpKeys.clear()
		this.muteKeys.clear()

		for (const [key, point] of Object.entries(DIRECTION_BY_KEY)) {
			this.movementKeys.set(key, point)
		}

		this.actionKeys.add('Enter').add(' ')
		this.pauseKeys.add('p').add('P').add('Escape')
		this.helpKeys.add('?').add('h').add('H')
		this.muteKeys.add('m').add('M')

		const bindings = this.state.bindings

		if (bindings.up) {
			this.movementKeys.set(bindings.up, { x: 0, y: -1 })
		}

		if (bindings.down) {
			this.movementKeys.set(bindings.down, { x: 0, y: 1 })
		}

		if (bindings.left) {
			this.movementKeys.set(bindings.left, { x: -1, y: 0 })
		}

		if (bindings.right) {
			this.movementKeys.set(bindings.right, { x: 1, y: 0 })
		}

		if (bindings.action) {
			this.actionKeys.add(bindings.action)
		}

		if (bindings.pause) {
			this.pauseKeys.add(bindings.pause)
		}

		if (bindings.help) {
			this.helpKeys.add(bindings.help)
		}

		if (bindings.mute) {
			this.muteKeys.add(bindings.mute)
		}
	}

	private setKeyBinding(action: KeyAction, key: string): void {
		this.state.bindings = { ...this.state.bindings, [action]: key }
		this.rebuildInputs()
		this.saveBindings()
	}

	private handleKeysKey(event: KeyboardEvent): void {
		if (this.state.keysAwaiting) {
			if (event.key === 'Escape') {
				this.state.keysAwaiting = false
				return
			}

			const action = BINDABLE_ACTIONS[this.state.keysIndex]

			if (action) {
				this.setKeyBinding(action, event.key)
			}

			this.state.keysAwaiting = false
			return
		}

		const direction = this.movementKeys.get(event.key)

		if (direction) {
			if (direction.y === -1) {
				this.state.keysIndex = Math.max(0, this.state.keysIndex - 1)
			} else if (direction.y === 1) {
				this.state.keysIndex = Math.min(
					BINDABLE_ACTIONS.length - 1,
					this.state.keysIndex + 1,
				)
			} else if (direction.x === -1) {
				this.adjustZoom(-1)
			} else if (direction.x === 1) {
				this.adjustZoom(1)
			}
			return
		}

		if (this.isAction(event.key)) {
			this.state.keysAwaiting = true
			return
		}

		if (this.isHelp(event.key) || this.pauseKeys.has(event.key)) {
			this.state.status = 'title'
		}
	}

	private adjustZoom(step: number): void {
		this.state.zoomIndex = Math.min(
			ZOOM_OPTIONS.length - 1,
			Math.max(0, this.state.zoomIndex + step),
		)
		this.applyZoom()
		this.saveZoom()
	}

	private applyZoom(): void {
		const value = ZOOM_OPTIONS[this.state.zoomIndex] ?? 1
		const style = document.body.style as CSSStyleDeclaration & {
			zoom?: string
		}

		if (value === 1) {
			style.zoom = ''
		} else {
			style.zoom = String(value)
		}
	}

	private loadBindings(): Partial<Record<KeyAction, string>> {
		try {
			const raw = localStorage.getItem(KEYS_KEY)

			if (!raw) {
				return {}
			}

			const parsed = JSON.parse(raw) as Record<string, unknown>
			const bindings: Partial<Record<KeyAction, string>> = {}

			for (const action of BINDABLE_ACTIONS) {
				const value = parsed[action]

				if (typeof value === 'string' && value.length > 0) {
					bindings[action] = value
				}
			}

			return bindings
		} catch {
			return {}
		}
	}

	private saveBindings(): void {
		try {
			localStorage.setItem(KEYS_KEY, JSON.stringify(this.state.bindings))
		} catch {
			// storage unavailable, ignore
		}
	}

	private loadZoom(): number {
		try {
			const raw = localStorage.getItem(ZOOM_KEY)
			const index = raw === null ? 0 : Number.parseInt(raw, 10)

			if (
				Number.isFinite(index) &&
				index >= 0 &&
				index < ZOOM_OPTIONS.length
			) {
				return index
			}

			return 0
		} catch {
			return 0
		}
	}

	private saveZoom(): void {
		try {
			localStorage.setItem(ZOOM_KEY, String(this.state.zoomIndex))
		} catch {
			// storage unavailable, ignore
		}
	}

	private setPlayerCount(count: 1 | 2): void {
		this.state.playerCount = count

		try {
			localStorage.setItem(PLAYERS_KEY, String(count))
		} catch {
			// storage unavailable, ignore
		}
	}

	private loadPlayerCount(): 1 | 2 {
		try {
			return localStorage.getItem(PLAYERS_KEY) === '2' ? 2 : 1
		} catch {
			return 1
		}
	}

	private setPaused(paused: boolean): void {
		this.state.status = paused ? 'paused' : 'playing'

		if (paused) {
			this.audio.pauseMusic()
		} else {
			this.audio.resumeMusic()
		}
	}

	private toggleMute(): void {
		const muted = !this.audio.isMuted

		this.audio.setMuted(muted)
		this.state.muted = muted

		if (!muted && this.state.status === 'playing') {
			this.audio.resumeMusic()
		}

		try {
			localStorage.setItem(MUTED_KEY, muted ? '1' : '0')
		} catch {
			// storage unavailable, ignore
		}
	}

	private loadMuted(): boolean {
		try {
			return localStorage.getItem(MUTED_KEY) === '1'
		} catch {
			return false
		}
	}

	private cycleDifficulty(step: number): void {
		const index = DIFFICULTY_ORDER.indexOf(this.state.difficulty)
		const next =
			DIFFICULTY_ORDER[(index + step + DIFFICULTY_ORDER.length) % DIFFICULTY_ORDER.length]

		this.state.difficulty = next

		try {
			localStorage.setItem(DIFFICULTY_KEY, next)
		} catch {
			// storage unavailable, ignore
		}
	}

	private loadDifficulty(): Difficulty {
		try {
			const stored = localStorage.getItem(DIFFICULTY_KEY)

			return stored === 'easy' || stored === 'ranked' ? stored : 'normal'
		} catch {
			return 'normal'
		}
	}

	private saveStats(): void {
		try {
			localStorage.setItem(STATS_KEY, JSON.stringify(this.state.stats))
		} catch {
			// storage unavailable, ignore
		}
	}

	private loadStats(): PlayStats {
		try {
			const raw = localStorage.getItem(STATS_KEY)

			if (!raw) {
				return { ...EMPTY_STATS }
			}

			const parsed = JSON.parse(raw) as Partial<PlayStats>
			const stats = { ...EMPTY_STATS }

			for (const key of Object.keys(EMPTY_STATS) as Array<keyof PlayStats>) {
				const value = parsed[key]

				if (typeof value === 'number' && Number.isFinite(value) && value >= 0) {
					stats[key] = value
				}
			}

			return stats
		} catch {
			return { ...EMPTY_STATS }
		}
	}

	private saveUnlocked(): void {
		try {
			localStorage.setItem(ACHIEVEMENTS_KEY, JSON.stringify(this.state.unlocked))
		} catch {
			// storage unavailable, ignore
		}
	}

	private loadUnlocked(): string[] {
		try {
			const raw = localStorage.getItem(ACHIEVEMENTS_KEY)

			if (!raw) {
				return []
			}

			const parsed = JSON.parse(raw) as unknown

			if (!Array.isArray(parsed)) {
				return []
			}

			const valid = new Set(ALL_ACHIEVEMENTS.map((achievement) => achievement.id))

			return parsed.filter(
				(value): value is string =>
					typeof value === 'string' && valid.has(value),
			)
		} catch {
			return []
		}
	}

	private unlockAchievement(id: string): void {
		if (this.state.demo || this.state.unlocked.includes(id)) {
			return
		}

		const achievement = ALL_ACHIEVEMENTS.find((entry) => entry.id === id)

		if (!achievement) {
			return
		}

		this.state.unlocked.push(id)
		this.state.achieveToast = {
			title: achievement.name,
			life: ACHIEVE_TOAST_DURATION,
		}
		this.saveUnlocked()
	}

	private checkAchievements(): void {
		if (this.state.demo) {
			return
		}

		for (const achievement of ALL_ACHIEVEMENTS) {
			if (achievement.id === 'undying') {
				continue
			}

			if (achievement.condition(this.state.stats, this.state.session)) {
				this.unlockAchievement(achievement.id)
			}
		}
	}

	private handlePlayingKey(event: KeyboardEvent): void {
		if (!this.movementKeys.has(event.key)) {
			return
		}

		if (this.heldKeys.has(event.key)) {
			return
		}

		this.heldKeys.add(event.key)
		this.pressOrder.push(event.key)
	}

	private handleGameOverKey(event: KeyboardEvent): void {
		if (!this.state.hsEntry) {
			if (this.isAction(event.key)) {
				this.advanceFromGameOver()
			}
			return
		}

		this.handleInitialsKey(event)
	}

	private advanceFromGameOver(): void {
		if (this.state.playerCount === 2 && this.state.currentPlayer === 1) {
			this.state.playerScores[0] = this.state.score
			this.state.currentPlayer = 2
			this.newGame()
			return
		}

		this.state.status = 'title'
	}

	private handleInitialsKey(event: KeyboardEvent): void {
		const direction = this.movementKeys.get(event.key)

		if (direction) {
			if (direction.y === -1) {
				this.cycleInitial(-1)
			} else if (direction.y === 1) {
				this.cycleInitial(1)
			} else if (direction.x === -1) {
				this.state.hsIndex = Math.max(0, this.state.hsIndex - 1)
			} else if (direction.x === 1) {
				this.state.hsIndex = Math.min(2, this.state.hsIndex + 1)
			}
			return
		}

		if (this.isAction(event.key)) {
			this.submitScore()
		}
	}

	private cycleInitial(step: number): void {
		const letter = this.state.hsName[this.state.hsIndex]

		if (!letter) {
			return
		}

		const index = INITIALS.indexOf(letter)
		const next = (index + step + INITIALS.length) % INITIALS.length
		const updated = this.state.hsName.split('')
		updated[this.state.hsIndex] = INITIALS[next]
		this.state.hsName = updated.join('')
	}

	private handleKeyUp(event: KeyboardEvent): void {
		if (!this.started) {
			return
		}

		if (!this.heldKeys.delete(event.key)) {
			return
		}

		const index = this.pressOrder.lastIndexOf(event.key)

		if (index !== -1) {
			this.pressOrder.splice(index, 1)
		}
	}

	private movePlayer(direction: Point): void {
		const nextPosition = {
			x: this.player.position.x + direction.x,
			y: this.player.position.y + direction.y,
		}

		if (this.isBlocked(nextPosition)) {
			return
		}

		if (!this.player.move(direction)) {
			this.bounce(this.player.position, direction, '#66ff99')
			return
		}

		this.collectBit(this.player.position)
		this.collectPill(this.player.position)
		this.collectFreezeAt(this.player.position)
		this.collectExtraAt(this.player.position)
		this.applyTeleport()
	}

	private bounce(point: Point, direction: Point, color: string): void {
		const now = performance.now()

		if (now < this.nextBounceAt) {
			return
		}

		this.nextBounceAt = now + 170

		this.state.shake = Math.max(this.state.shake, 1.2)
		this.audio.bump()

		const count = 5

		for (let index = 0; index < count; index++) {
			if (this.state.particles.length >= MAX_PARTICLES) {
				break
			}

			const spread = Math.random() * Math.PI * 2
			const push = Math.random() * 1.8

			this.state.particles.push({
				x: point.x,
				y: point.y,
				vx: -direction.x * push + Math.cos(spread) * 0.4,
				vy: -direction.y * push + Math.sin(spread) * 0.4,
				life: 0.22 + Math.random() * 0.2,
				maxLife: 0.5,
				color,
				size: 1.4 + Math.random() * 0.7,
			})
		}
	}

	private collectBit(point: Point): void {
		if (!this.maze.collectDot(point)) {
			return
		}

		this.renderer.clearCell(point)

		if (this.state.comboTimer > 0) {
			this.state.combo = Math.min(COMBO_MAX, this.state.combo + 1)
		} else {
			this.state.combo = 1
		}

		this.state.comboTimer = COMBO_WINDOW

		const gained = POINTS_PER_BIT * this.state.combo

		this.state.score += gained
		this.audio.bit(this.state.combo)

		if (!this.state.demo) {
			const stats = this.state.stats
			stats.bits += 1

			if (this.state.combo > stats.maxCombo) {
				stats.maxCombo = this.state.combo
			}

			this.saveStats()
			this.checkAchievements()
		}

		if (this.state.combo === 3 || this.state.combo === COMBO_MAX) {
			this.addPopup(
				`x${this.state.combo} +${gained}`,
				point.x,
				point.y - 1,
				'#ffaa33',
			)
		}
	}

	private collectFreezeAt(point: Point): void {
		if (!this.maze.collectFreeze(point)) {
			return
		}

		this.renderer.clearCell(point)
		this.state.freeze = FREEZE_DURATION
		this.audio.freeze()
		this.addPopup('FROZEN', point.x, point.y, '#66ccff')
		this.spawnBurst(point.x, point.y, '#66ccff', 10, 2.4, 2.5)

		if (!this.state.demo) {
			this.state.stats.freezeUses += 1
			this.saveStats()
			this.checkAchievements()
		}
	}

	private collectExtraAt(point: Point): void {
		if (!this.maze.collectExtra(point)) {
			return
		}

		this.renderer.clearCell(point)
		this.state.lives = Math.min(EXTRA_LIFE_CAP, this.state.lives + 1)
		this.audio.life()
		this.addPopup('1UP', point.x, point.y, '#ffcc33')
		this.spawnBurst(point.x, point.y, '#ffcc33', 12, 2.4, 2.5)
	}

	private applyTeleport(): void {
		const partner = this.maze.getTeleportPartner(this.player.position)

		if (!partner) {
			return
		}

		this.player.teleport(partner)
		this.audio.warp()
		this.addPopup('WARP', partner.x, partner.y, '#cc66ff')
		this.spawnBurst(partner.x, partner.y, '#cc66ff', 10, 2.5, 2.5)

		if (!this.state.demo) {
			this.state.stats.teleportUses += 1
			this.saveStats()
			this.checkAchievements()
		}
	}

	private collectPill(point: Point): void {
		if (!this.maze.collectPill(point)) {
			return
		}

		this.renderer.clearCell(point)
		this.state.score += PILL_BONUS
		this.state.fright = FRIGHT_DURATION
		this.audio.power()
		this.addPopup('+50', point.x, point.y, '#00ffd0')
		this.spawnBurst(point.x, point.y, '#00ffd0', 8, 2, 2)

		for (const enemy of this.enemies) {
			enemy.scared = true
		}
		this.ghost.scared = true

		if (!this.state.demo) {
			this.state.stats.pills += 1
			this.saveStats()
			this.checkAchievements()
		}
	}

	private checkVictory(): boolean {
		if (this.player.isAtExit()) {
			this.state.status = 'won'

			if (this.state.demo) {
				this.state.demoTimer = DEMO_RESULT_DELAY
			}

			this.state.score += SESSION_BONUS
			this.addPopup(
				'+1000',
				this.maze.exitPosition.x,
				this.maze.exitPosition.y,
				'#00ff66',
			)
			this.updateHiScore()
			this.audio.victory()

			if (!this.state.lostLifeThisSession) {
				this.unlockAchievement('undying')
			}

			this.checkAchievements()
			return true
		}

		return false
	}

	private checkCollisions(): boolean {
		const vulnerable = this.state.invincible <= 0

		for (const enemy of this.enemies) {
			if (enemy.isTouchingPlayer() && !enemy.scared && vulnerable) {
				this.loseLife()
				return true
			}
		}

		if (
			vulnerable &&
			!this.ghost.removed &&
			this.ghost.isTouchingPlayer() &&
			!this.ghost.scared
		) {
			this.loseLife()
			return true
		}

		this.slayScaredDaemons()
		this.slayGhostIfScared()

		return false
	}

	private loseLife(): void {
		this.state.lives--
		this.state.lostLifeThisSession = true
		this.state.flash = FLASH_DURATION
		this.state.shake = SHAKE_MAX
		this.audio.death()
		this.buzz(120)
		this.spawnBurst(
			this.player.position.x,
			this.player.position.y,
			'#ff3333',
			18,
			3,
			3,
		)

		if (this.state.lives <= 0) {
			this.state.deathTimer = DEATH_DURATION
			return
		}

		this.resetEntities()
		this.state.invincible = INVINCIBLE_DURATION
	}

	private buzz(duration: number): void {
		try {
			;(navigator as { vibrate?: (ms: number) => boolean }).vibrate?.(
				duration,
			)
		} catch {
			// vibration unavailable, ignore
		}

		try {
			const pads = navigator.getGamepads ? navigator.getGamepads() : []

			for (let i = 0; i < (pads?.length ?? 0); i++) {
				const actuator = (
					pads[i] as {
						vibrationActuator?: {
							playEffect(
								type: string,
								params: {
									duration: number
									strongMagnitude: number
									weakMagnitude: number
								},
							): Promise<unknown>
						}
					}
				).vibrationActuator

				if (actuator) {
					actuator.playEffect('dual-rumble', {
						duration,
						strongMagnitude: 0.8,
						weakMagnitude: 0.4,
					})
				}
			}
		} catch {
			// haptics unavailable, ignore
		}
	}

	private gameOver(): void {
		this.state.status = 'gameover'

		if (this.state.demo) {
			this.state.demoTimer = DEMO_RESULT_DELAY
			this.updateHiScore()
			return
		}

		this.audio.stopMusic()
		this.audio.death()

		const lastPlayer =
			this.state.playerCount < 2 || this.state.currentPlayer === 2

		if (lastPlayer && this.qualifiesForScores(this.state.score)) {
			this.state.hsEntry = true
			this.state.hsName = 'AAA'
			this.state.hsIndex = 0
		} else if (this.state.playerCount === 2) {
			this.enterPlayerOneScore()
		}

		this.updateHiScore()
	}

	private enterPlayerOneScore(): void {
		if (!this.qualifiesForScores(this.state.score)) {
			return
		}

		const entry: ScoreEntry = {
			name: 'P1',
			score: this.state.score,
		}

		this.state.scores = [...this.state.scores, entry]
			.sort((a, b) => b.score - a.score)
			.slice(0, MAX_SCORES)

		try {
			localStorage.setItem(SCORES_KEY, JSON.stringify(this.state.scores))
		} catch {
			// storage unavailable, ignore
		}
	}

	private slayScaredDaemons(): void {
		const surviving: Enemy[] = []

		for (const enemy of this.enemies) {
			if (enemy.scared && enemy.isTouchingPlayer()) {
				const bonus = enemy.isHunter ? HUNTER_BONUS : SLAY_BONUS

				this.state.score += bonus
				this.state.shake = 3
				this.audio.slay()
				this.addPopup(
					`+${bonus}`,
					enemy.position.x,
					enemy.position.y,
					enemy.isHunter ? '#ff8833' : '#ffcc33',
				)
				this.spawnBurst(
					enemy.position.x,
					enemy.position.y,
					enemy.isHunter ? '#ff8833' : '#ffcc33',
					14,
					3,
					2.5,
				)

				if (!this.state.demo) {
					this.state.stats.daemons += 1
				}
				continue
			}

			surviving.push(enemy)
		}

		this.enemies.length = 0
		this.enemies.push(...surviving)

		if (!this.state.demo) {
			this.saveStats()
			this.checkAchievements()
		}
	}

	private slayGhostIfScared(): void {
		if (this.ghost.removed || !this.ghost.scared) {
			return
		}

		if (!this.ghost.isTouchingPlayer()) {
			return
		}

		this.ghost.removed = true
		this.state.score += SLAY_BONUS
		this.state.shake = 4
		this.audio.slay()
		this.addPopup(
			'+200',
			this.ghost.position.x,
			this.ghost.position.y,
			'#ffcc33',
		)
		this.spawnBurst(
			this.ghost.position.x,
			this.ghost.position.y,
			'#00ddff',
			18,
			3.2,
			3,
		)

		if (!this.state.demo) {
			this.state.stats.ghosts += 1
			this.saveStats()
			this.checkAchievements()
		}
	}

	private newGame(): void {
		this.state.session = 1
		this.state.score = 0
		this.createGame()
		this.createRenderer()
		this.state.introTimer = INTRO_DURATION
		this.audio.startMusic()
	}

	private startRun(): void {
		this.state.currentPlayer = 1
		this.state.playerScores = [0, 0]
		this.newGame()
	}

	private nextSession(): void {
		this.state.session += 1
		this.checkAchievements()
		this.createGame()
		this.createRenderer()
		this.state.introTimer = INTRO_DURATION
		this.audio.resumeMusic()
	}

	private updateHiScore(): void {
		if (this.state.demo) {
			return
		}

		if (this.state.score <= this.state.hiScore) {
			return
		}

		this.state.hiScore = this.state.score

		try {
			localStorage.setItem(HI_SCORE_KEY, String(this.state.hiScore))
		} catch {
			// storage unavailable, ignore
		}
	}

	private qualifiesForScores(score: number): boolean {
		if (score <= 0) {
			return false
		}

		const list = this.state.scores

		if (list.length < MAX_SCORES) {
			return true
		}

		return score > list[list.length - 1].score
	}

	private submitScore(): void {
		const entry: ScoreEntry = {
			name: this.state.hsName,
			score: this.state.score,
		}

		this.state.scores = [...this.state.scores, entry]
			.sort((a, b) => b.score - a.score)
			.slice(0, MAX_SCORES)
		this.state.hsEntry = false

		this.updateHiScore()

		try {
			localStorage.setItem(SCORES_KEY, JSON.stringify(this.state.scores))
		} catch {
			// storage unavailable, ignore
		}
	}

	private loadScores(): ScoreEntry[] {
		try {
			const raw = localStorage.getItem(SCORES_KEY)

			if (!raw) {
				return []
			}

			const parsed = JSON.parse(raw) as unknown

			if (!Array.isArray(parsed)) {
				return []
			}

			return parsed.filter(isScoreEntry)
		} catch {
			return []
		}
	}

	private loadHiScore(): number {
		try {
			const stored = Number(localStorage.getItem(HI_SCORE_KEY)) || 0
			const best = this.state?.scores[0]?.score ?? 0

			return Math.max(stored, best)
		} catch {
			return 0
		}
	}

	private get enemyCount(): number {
		return Math.min(1 + (this.state.session - 1), 5)
	}

	private get enemyInterval(): number {
		return Math.max(
			140,
			Math.floor((260 - (this.state.session - 1) * 20) * this.difficultyScale),
		)
	}

	private get hunterInterval(): number {
		return Math.max(90, Math.floor(this.enemyInterval * 0.7))
	}

	private get ghostInterval(): number {
		return Math.max(
			280,
			Math.floor((500 - (this.state.session - 1) * 40) * this.difficultyScale),
		)
	}

	private findEnemyStarts(count: number): Point[] {
		const starts: Point[] = []

		for (let i = 0; i < count; i++) {
			let position: Point | null = null

			for (let attempt = 0; attempt < 200; attempt++) {
				const candidate = this.maze.findRandomFloor()

				if (
					manhattanDistance(candidate, this.player.position) <
					this.enemyMinDistance
				) {
					continue
				}

				const spreadOut = starts.every(
					(start) => manhattanDistance(candidate, start) >= 6,
				)

				if (!spreadOut) {
					continue
				}

				position = candidate
				break
			}

			starts.push(position ?? this.maze.findRandomFloor())
		}

		return starts
	}

	private findGhostStart(): Point {
		for (let attempt = 0; attempt < 100; attempt++) {
			const position = this.maze.findRandomFloor()

			if (
				manhattanDistance(position, this.player.position) >=
				this.ghostMinDistance
			) {
				return position
			}
		}

		return this.maze.findRandomFloor()
	}

	private isBlocked(point: Point): boolean {
		const vulnerable = this.state.invincible <= 0

		for (const enemy of this.enemies) {
			if (!enemy.scared && vulnerable && this.isSameCell(enemy.position, point)) {
				return true
			}
		}

		if (
			this.ghost.removed ||
			this.ghost.scared ||
			!vulnerable ||
			!this.isSameCell(this.ghost.position, point)
		) {
			return false
		}

		return true
	}

	private isSameCell(pointA: Point, pointB: Point): boolean {
		return pointA.x === pointB.x && pointA.y === pointB.y
	}
}

function directionKey(direction: Point): string | null {
	if (direction.x === 0 && direction.y === -1) {
		return 'ArrowUp'
	}

	if (direction.x === 0 && direction.y === 1) {
		return 'ArrowDown'
	}

	if (direction.x === -1 && direction.y === 0) {
		return 'ArrowLeft'
	}

	if (direction.x === 1 && direction.y === 0) {
		return 'ArrowRight'
	}

	return null
}

function isScoreEntry(value: unknown): value is ScoreEntry {
	if (typeof value !== 'object' || value === null) {
		return false
	}

	const entry = value as Partial<ScoreEntry>

	return (
		typeof entry.name === 'string' &&
		typeof entry.score === 'number' &&
		entry.name.length > 0 &&
		entry.name.length <= 3
	)
}