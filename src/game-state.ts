export type GameStatus =
	| 'title'
	| 'playing'
	| 'paused'
	| 'won'
	| 'gameover'
	| 'help'
	| 'achievements'

export type Difficulty = 'easy' | 'normal' | 'ranked'

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
	score: number
	hiScore: number
	session: number
	dots: number
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
	introTimer: number
	deathTimer: number
	shake: number
	demo: boolean
	demoTimer: number
	popups: Popup[]
	particles: Particle[]
	scores: ScoreEntry[]
	hsName: string
	hsIndex: number
	hsEntry: boolean
}