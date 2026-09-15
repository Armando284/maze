export type GameStatus = 'playing' | 'won' | 'lost'

export interface GameState {
  status: GameStatus
}