import type { GameState, GameStatus } from './game-state'

const STATUS_TEXT: Record<GameStatus, string> = {
	title: 'INSERT COIN',
	playing: 'RAIDING THE VAULT',
	paused: 'PAUSED',
	won: 'ACCESS GRANTED',
	gameover: 'GAME OVER',
}

function element(id: string): HTMLElement {
	const node = document.getElementById(id)

	if (!node) {
		throw new Error(`HUD element #${id} not found`)
	}

	return node
}

export class Hud {
	private readonly score: HTMLElement
	private readonly hiScore: HTMLElement
	private readonly session: HTMLElement
	private readonly bits: HTMLElement
	private readonly fright: HTMLElement
	private readonly lives: HTMLElement
	private readonly mute: HTMLElement
	private readonly status: HTMLElement

	constructor() {
		this.score = element('score')
		this.hiScore = element('hi-score')
		this.session = element('session')
		this.bits = element('bits')
		this.fright = element('fright')
		this.lives = element('lives')
		this.mute = element('mute')
		this.status = element('status')
	}

	update(state: GameState): void {
		this.score.textContent = pad(state.score)
		this.hiScore.textContent = pad(state.hiScore)
		this.session.textContent = String(state.session).padStart(2, '0')
		this.bits.textContent = String(state.dots).padStart(3, '0')
		this.fright.textContent =
			state.fright > 0 ? `ANTIVIRUS ${Math.ceil(state.fright)}` : ''
		this.lives.textContent = '@'.repeat(Math.max(0, state.lives))
		this.mute.textContent = state.muted ? 'MUTE' : ''
		this.status.textContent =
			state.status === 'playing' && state.deathTimer > 0
				? 'SYSTEM FAILURE'
				: STATUS_TEXT[state.status]
	}
}

function pad(value: number): string {
	return String(value).padStart(6, '0')
}