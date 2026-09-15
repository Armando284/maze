export type GameStatus = 'title' | 'playing' | 'won' | 'gameover'

export interface ScoreEntry {
	name: string
	score: number
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
	scores: ScoreEntry[]
	hsName: string
	hsIndex: number
	hsEntry: boolean
}