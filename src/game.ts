import { Player } from './player'
import { Renderer } from './renderer'
import { type GameState } from './game-state'
import { Maze } from './maze'
import { Enemy } from './enemy'
import { Ghost } from './ghost'
import { Audio } from './audio'
import { Hud } from './hud'
import { type Point, manhattanDistance } from './grid'

const PLAYER_MOVE_INTERVAL = 110
const POINTS_PER_BIT = 10
const PILL_BONUS = 50
const SLAY_BONUS = 200
const SESSION_BONUS = 1000
const FRIGHT_DURATION = 8
const HI_SCORE_KEY = 'maze-hi-score'

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
	private readonly heldKeys = new Set<string>()
	private readonly pressOrder: string[] = []
	private readonly audio = new Audio()
	private readonly hud = new Hud()
	private readonly state: GameState = {
		status: 'playing',
		score: 0,
		hiScore: this.loadHiScore(),
		session: 1,
		dots: 0,
		fright: 0,
	}
	private readonly enemyMinDistance = 12
	private readonly ghostMinDistance = 18

	private maze!: Maze
	private player!: Player
	private enemies: Enemy[] = []
	private ghost!: Ghost
	private renderer!: Renderer

	constructor(context: CanvasRenderingContext2D) {
		this.context = context
		this.createGame()
		this.createRenderer()

		window.addEventListener('keydown', (event) => {
			this.handleKeyDown(event)
		})
		window.addEventListener('keyup', (event) => {
			this.handleKeyUp(event)
		})
	}

	unlockAudio(): void {
		this.audio.unlock()
	}

	private createGame(): void {
		this.maze = new Maze()

		this.player = new Player(this.maze)

		const starts = this.findEnemyStarts(this.enemyCount)

		this.enemies = starts.map(
			(start) =>
				new Enemy(this.maze, this.player, start, this.enemyInterval),
		)

		this.ghost = new Ghost(
			this.player,
			this.findGhostStart(),
			this.ghostInterval,
		)

		this.heldKeys.clear()
		this.pressOrder.length = 0
		this.playerMoveTimer = 0

		this.state.status = 'playing'
		this.state.score = 0
		this.state.dots = this.maze.dotsRemaining
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
		this.animationFrame = requestAnimationFrame((time) => this.loop(time))
	}

	private loop(time: number): void {
		const deltaTime = time - this.lastTime
		this.lastTime = time

		this.update(deltaTime)
		this.renderer.render()
		this.hud.update(this.state)

		this.animationFrame = requestAnimationFrame((nextTime) =>
			this.loop(nextTime),
		)
	}

	private update(deltaTime: number): void {
		if (this.state.status === 'playing') {
			this.updatePlayer(deltaTime)
			this.updateFrightState(deltaTime)
		}

		for (const enemy of this.enemies) {
			enemy.update(deltaTime)
		}
		this.ghost.update(deltaTime)

		if (this.state.status !== 'playing') {
			this.updateHiScore()
			return
		}

		if (this.checkVictory()) {
			return
		}

		if (this.checkCollisions()) {
			return
		}

		this.updateHiScore()
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

		if (event.key === 'Enter' && this.state.status !== 'playing') {
			this.restart()
			return
		}

		if (this.state.status !== 'playing') {
			return
		}

		if (!DIRECTION_BY_KEY[event.key]) {
			return
		}

		if (this.heldKeys.has(event.key)) {
			return
		}

		this.heldKeys.add(event.key)
		this.pressOrder.push(event.key)
	}

	private handleKeyUp(event: KeyboardEvent): void {
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

		for (const enemy of this.enemies) {
			enemy.scared = true
		}
		this.ghost.scared = true
	}

	private checkVictory(): boolean {
		const allBitsCollected = this.state.dots === 0

		if (this.player.isAtExit() || allBitsCollected) {
			this.state.status = 'won'
			this.state.session += 1
			this.state.score += SESSION_BONUS
			this.updateHiScore()
			this.audio.victory()
			return true
		}

		return false
	}

	private checkCollisions(): boolean {
		for (const enemy of this.enemies) {
			if (enemy.isTouchingPlayer() && !enemy.scared) {
				this.lose()
				return true
			}
		}

		if (
			!this.ghost.removed &&
			this.ghost.isTouchingPlayer() &&
			!this.ghost.scared
		) {
			this.lose()
			return true
		}

		this.slayScaredDaemons()
		this.slayGhostIfScared()

		return false
	}

	private slayScaredDaemons(): void {
		const surviving: Enemy[] = []

		for (const enemy of this.enemies) {
			if (enemy.scared && enemy.isTouchingPlayer()) {
				this.state.score += SLAY_BONUS
				this.audio.slay()
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
		this.audio.slay()
	}

	private lose(): void {
		this.state.status = 'lost'
		this.updateHiScore()
		this.audio.death()
	}

	private updateHiScore(): void {
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

	private loadHiScore(): number {
		try {
			return Number(localStorage.getItem(HI_SCORE_KEY)) || 0
		} catch {
			return 0
		}
	}

	private restart(): void {
		this.createGame()
		this.createRenderer()
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
		for (const enemy of this.enemies) {
			if (!enemy.scared && this.isSameCell(enemy.position, point)) {
				return true
			}
		}

		if (
			!this.ghost.removed &&
			!this.ghost.scared &&
			this.isSameCell(this.ghost.position, point)
		) {
			return true
		}

		return false
	}

	private isSameCell(pointA: Point, pointB: Point): boolean {
		return pointA.x === pointB.x && pointA.y === pointB.y
	}
}