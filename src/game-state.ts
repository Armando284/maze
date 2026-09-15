export type GameStatus = 'playing' | 'won' | 'lost'

export interface GameState {
	status: GameStatus
	score: number
	hiScore: number
	session: number
	dots: number
}