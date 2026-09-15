import { Player } from './player'
import { Renderer } from './renderer'
import {
	type GameState,
	type ScoreEntry,
} from './game-state'
import { Maze } from './maze'
import { Enemy } from './enemy'
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
const SESSION_BONUS = 1000
const FRIGHT_DURATION = 8
const MAX_LIVES = 3
const INVINCIBLE_DURATION = 2
const FLASH_DURATION = 0.3
const INTRO_DURATION = 1.4
const POPUP_LIFE = 0.9
const DEATH_DURATION = 0.9
const SHAKE_MAX = 10
const DEMO_DELAY = 12
const DEMO_RESULT_DELAY = 4
const MAX_SCORES = 5
const SCORES_KEY = 'maze-scores'
const HI_SCORE_KEY = 'maze-hi-score'
const MUTED_KEY = 'maze-muted'
const INITIALS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
const PAUSE_KEYS = new Set(['p', 'P', 'Escape'])

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
	private animationFrame = 0
	private playerMoveTimer = 0
	private started = false
	private readonly heldKeys = new Set<string>()
	private readonly pressOrder: string[] = []
	private readonly audio = new Audio()
	private readonly hud = new Hud()
	private readonly gamepad: GamepadInput
	private readonly state: GameState = {
		status: 'title',
		score: 0,
		hiScore: 0,
		session: 1,
		dots: 0,
		fright: 0,
		lives: MAX_LIVES,
		invincible: 0,
		flash: 0,
		muted: false,
		introTimer: 0,
		deathTimer: 0,
		shake: 0,
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
	private readonly ghostMinDistance = 18

	private maze!: Maze
	private player!: Player
	private enemies: Enemy[] = []
	private ghost!: Ghost
	private renderer!: Renderer
	private botPathfinder: Pathfinder | null = null

	constructor(context: CanvasRenderingContext2D) {
		this.context = context
		this.state.muted = this.loadMuted()
		this.audio.setMuted(this.state.muted)
		this.state.hiScore = this.loadHiScore()
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
	}

	private simulateKey(type: 'keydown' | 'keyup', key: string): void {
		window.dispatchEvent(new KeyboardEvent(type, { key }))
	}

	unlockAudio(): void {
		this.audio.unlock()
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
		this.state.dots = this.maze.dotsRemaining
		this.state.fright = 0
		this.state.invincible = 0
		this.state.flash = 0
		this.state.deathTimer = 0
		this.state.shake = 0
		this.state.hsEntry = false
		this.state.popups.length = 0
		this.state.particles.length = 0
	}

	private spawnEnemies(): void {
		const starts = this.findEnemyStarts(this.enemyCount)

		this.enemies.length = 0
		this.enemies.push(
			...starts.map(
				(start) =>
					new Enemy(this.maze, this.player, start, this.enemyInterval),
			),
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
		this.animationFrame = requestAnimationFrame((time) => this.loop(time))
	}

	private loop(time: number): void {
		const deltaTime = time - this.lastTime
		this.lastTime = time

		this.gamepad.update()
		this.update(deltaTime)
		this.renderer.render()
		this.hud.update(this.state)

		this.animationFrame = requestAnimationFrame((nextTime) =>
			this.loop(nextTime),
		)
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
			this.agePopups(deltaTime)
			this.ageParticles(deltaTime)
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
		this.updatePlayer(deltaTime)
		this.updateFrightState(deltaTime)
		this.updateTimers(deltaTime)
		this.agePopups(deltaTime)
		this.ageParticles(deltaTime)

		for (const enemy of this.enemies) {
			enemy.update(deltaTime)
		}
		this.ghost.update(deltaTime)

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
		this.state.lives = MAX_LIVES
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
		for (const popup of this.state.popups) {
			popup.life -= deltaTime / 1000
		}

		if (this.state.popups.length > 0) {
			this.state.popups = this.state.popups.filter(
				(popup) => popup.life > 0,
			)
		}
	}

	private addPopup(text: string, x: number, y: number, color: string): void {
		this.state.popups.push({ text, x, y, life: POPUP_LIFE, color })
	}

	private ageParticles(deltaTime: number): void {
		for (const particle of this.state.particles) {
			particle.life -= deltaTime / 1000
			particle.x += particle.vx * (deltaTime / 1000)
			particle.y += particle.vy * (deltaTime / 1000)
		}

		if (this.state.particles.length > 0) {
			this.state.particles = this.state.particles.filter(
				(particle) => particle.life > 0,
			)
		}
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

		return DIRECTION_BY_KEY[key] ?? null
	}

	private handleKeyDown(event: KeyboardEvent): void {
		this.audio.unlock()

		if (!this.started) {
			return
		}

		if (event.key === 'm' || event.key === 'M') {
			this.toggleMute()
			return
		}

		if (this.state.demo) {
			this.endDemo()

			if (isActionKey(event.key)) {
				this.newGame()
			}
			return
		}

		switch (this.state.status) {
			case 'title':
				if (isActionKey(event.key)) {
					this.newGame()
				}
				return

			case 'gameover':
				this.handleGameOverKey(event)
				return

			case 'won':
				if (isActionKey(event.key)) {
					this.nextSession()
				}
				return

			case 'playing':
				if (PAUSE_KEYS.has(event.key)) {
					this.setPaused(true)
					return
				}
				this.handlePlayingKey(event)
				return

			case 'paused':
				if (PAUSE_KEYS.has(event.key)) {
					this.setPaused(false)
				}
				return
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

	private handlePlayingKey(event: KeyboardEvent): void {
		if (!DIRECTION_BY_KEY[event.key]) {
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
			if (isActionKey(event.key)) {
				this.state.status = 'title'
			}
			return
		}

		this.handleInitialsKey(event)
	}

	private handleInitialsKey(event: KeyboardEvent): void {
		const key = event.key

		switch (key) {
			case 'ArrowUp':
			case 'w':
			case 'W':
				this.cycleInitial(-1)
				break

			case 'ArrowDown':
			case 's':
			case 'S':
				this.cycleInitial(1)
				break

			case 'ArrowLeft':
			case 'a':
			case 'A':
				this.state.hsIndex = Math.max(0, this.state.hsIndex - 1)
				break

			case 'ArrowRight':
			case 'd':
			case 'D':
				this.state.hsIndex = Math.min(2, this.state.hsIndex + 1)
				break

			case 'Enter':
				this.submitScore()
				break
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
			return
		}

		this.collectBit(this.player.position)
		this.collectPill(this.player.position)
	}

	private collectBit(point: Point): void {
		if (!this.maze.collectDot(point)) {
			return
		}

		this.state.score += POINTS_PER_BIT
		this.state.dots = this.maze.dotsRemaining
		this.audio.coin()
	}

	private collectPill(point: Point): void {
		if (!this.maze.collectPill(point)) {
			return
		}

		this.state.score += PILL_BONUS
		this.state.fright = FRIGHT_DURATION
		this.audio.power()
		this.addPopup('+50', point.x, point.y, '#00ffd0')
		this.spawnBurst(point.x, point.y, '#00ffd0', 8, 2, 2)

		for (const enemy of this.enemies) {
			enemy.scared = true
		}
		this.ghost.scared = true
	}

	private checkVictory(): boolean {
		const allBitsCollected = this.state.dots === 0

		if (this.player.isAtExit() || allBitsCollected) {
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
		this.state.flash = FLASH_DURATION
		this.state.shake = SHAKE_MAX
		this.audio.death()
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

	private gameOver(): void {
		this.state.status = 'gameover'

		if (this.state.demo) {
			this.state.demoTimer = DEMO_RESULT_DELAY
			this.updateHiScore()
			return
		}

		this.audio.stopMusic()
		this.audio.death()

		if (this.qualifiesForScores(this.state.score)) {
			this.state.hsEntry = true
			this.state.hsName = 'AAA'
			this.state.hsIndex = 0
		}

		this.updateHiScore()
	}

	private slayScaredDaemons(): void {
		const surviving: Enemy[] = []

		for (const enemy of this.enemies) {
			if (enemy.scared && enemy.isTouchingPlayer()) {
				this.state.score += SLAY_BONUS
				this.state.shake = 3
				this.audio.slay()
				this.addPopup(
					'+200',
					enemy.position.x,
					enemy.position.y,
					'#ffcc33',
				)
				this.spawnBurst(
					enemy.position.x,
					enemy.position.y,
					'#ffcc33',
					14,
					3,
					2.5,
				)
				continue
			}

			surviving.push(enemy)
		}

		this.enemies.length = 0
		this.enemies.push(...surviving)
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
	}

	private newGame(): void {
		this.state.session = 1
		this.state.score = 0
		this.state.lives = MAX_LIVES
		this.createGame()
		this.createRenderer()
		this.state.introTimer = INTRO_DURATION
		this.audio.startMusic()
	}

	private nextSession(): void {
		this.state.session += 1
		this.state.lives = MAX_LIVES
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
		return Math.max(140, 260 - (this.state.session - 1) * 20)
	}

	private get ghostInterval(): number {
		return Math.max(280, 500 - (this.state.session - 1) * 40)
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

function isActionKey(key: string): boolean {
	return key === 'Enter' || key === ' '
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