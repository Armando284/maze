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
const SESSION_BONUS = 1000
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
	}
	private readonly enemyMinDistance = 12
	private readonly ghostMinDistance = 18

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
			this.handleKeyDown(event)
		})
		window.addEventListener('keyup', (event) => {
			this.handleKeyUp(event)
		})
	}

	private createGame(): void {
		this.maze = new Maze()

		this.player = new Player(this.maze)

		this.enemy = new Enemy(this.maze, this.player, this.findEnemyStart())

		this.ghost = new Ghost(this.player, this.findGhostStart())

		this.heldKeys.clear()
		this.pressOrder.length = 0
		this.playerMoveTimer = 0

		this.state.status = 'playing'
		this.state.score = 0
		this.state.dots = this.maze.dotsRemaining
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
		}

		this.enemy.update(deltaTime)
		this.ghost.update(deltaTime)

		if (this.state.status !== 'playing') {
			this.updateHiScore()
			return
		}

		if (this.checkVictory()) {
			return
		}

		if (this.checkDefeat()) {
			return
		}

		this.updateHiScore()
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

		if (this.isOccupied(nextPosition)) {
			return
		}

		if (!this.player.move(direction)) {
			return
		}

		this.collectBit(this.player.position)
	}

	private collectBit(point: Point): void {
		if (!this.maze.collectDot(point)) {
			return
		}

		this.state.score += POINTS_PER_BIT
		this.state.dots = this.maze.dotsRemaining
		this.audio.coin()
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

	private checkDefeat(): boolean {
		if (this.enemy.isTouchingPlayer() || this.ghost.isTouchingPlayer()) {
			this.state.status = 'lost'
			this.updateHiScore()
			this.audio.death()
			return true
		}

		return false
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

	private findEnemyStart(): Point {
		for (let attempt = 0; attempt < 100; attempt++) {
			const position = this.maze.findRandomFloor()

			if (
				manhattanDistance(position, this.player.position) >=
				this.enemyMinDistance
			) {
				return position
			}
		}

		return this.maze.findRandomFloor()
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

	private isOccupied(point: Point): boolean {
		return (
			(point.x === this.enemy.position.x &&
				point.y === this.enemy.position.y) ||
			(point.x === this.ghost.position.x &&
				point.y === this.ghost.position.y)
		)
	}
}