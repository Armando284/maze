export type GameStatus =
	| 'title'
	| 'playing'
	| 'paused'
	| 'won'
	| 'gameover'
	| 'help'
	| 'achievements'
	| 'keys'

export type Difficulty = 'easy' | 'normal' | 'ranked'

export const BINDABLE_ACTIONS = [
	'up',
	'down',
	'left',
	'right',
	'action',
	'pause',
	'help',
	'mute',
] as const

export type KeyAction = (typeof BINDABLE_ACTIONS)[number]

export interface PlayStats {
	bits: number
	daemons: number
	ghosts: number
	freezeUses: number
	teleportUses: number
	pills: number
	maxCombo: number
}

export interface AchievementToast {
	title: string
	life: number
}

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

export interface Particle {
	x: number
	y: number
	vx: number
	vy: number
	life: number
	maxLife: number
	color: string
	size: number
}

export interface GameState {
	status: GameStatus
	playerCount: 1 | 2
	currentPlayer: 1 | 2
	playerScores: [number, number]
	score: number
	hiScore: number
	session: number
	fright: number
	freeze: number
	lives: number
	invincible: number
	flash: number
	muted: boolean
	difficulty: Difficulty
	gamepadConnected: boolean
	stats: PlayStats
	unlocked: string[]
	lostLifeThisSession: boolean
	achieveToast: AchievementToast | null
	bindings: Partial<Record<KeyAction, string>>
	keysIndex: number
	keysAwaiting: boolean
	zoomIndex: number
	introTimer: number
	deathTimer: number
	shake: number
	combo: number
	comboTimer: number
	scoreDisplay: number
	demo: boolean
	demoTimer: number
	popups: Popup[]
	particles: Particle[]
	scores: ScoreEntry[]
	hsName: string
	hsIndex: number
	hsEntry: boolean
}