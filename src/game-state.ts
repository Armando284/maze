export type GameStatus = 'title' | 'playing' | 'paused' | 'won' | 'gameover'

export interface ScoreEntry {
	name: string
	score: number
}

export interface Popup {
	text: string
	x: number
	y: number
	life: number
	color: string
}

export interface GameState {
	status: GameStatus
	score: number
	hiScore: number
	session: number
	dots: number
	fright: number
	lives: number
	invincible: number
	flash: number
	muted: boolean
	introTimer: number
	popups: Popup[]
	scores: ScoreEntry[]
	hsName: string
	hsIndex: number
	hsEntry: boolean
}