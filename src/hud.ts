import type { GameState, GameStatus } from './game-state'

const STATUS_TEXT: Record<GameStatus, string> = {
	title: 'INSERT COIN',
	playing: 'RAIDING',
	paused: 'PAUSED',
	won: 'ACCESS',
	gameover: 'GAME OVER',
	help: 'HELP',
	achievements: 'ACHIEVE',
	keys: 'KEYS',
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
	private readonly session: HTMLElement
	private readonly fright: HTMLElement
	private readonly lives: HTMLElement
	private readonly mute: HTMLElement
	private readonly player: HTMLElement
	private readonly combo: HTMLElement
	private readonly status: HTMLElement

	constructor() {
		this.score = element('score')
		this.session = element('session')
		this.fright = element('fright')
		this.lives = element('lives')
		this.mute = element('mute')
		this.player = element('player')
		this.combo = element('combo')
		this.status = element('status')
	}

	update(state: GameState): void {
		this.score.textContent = pad(state.score)
		this.session.textContent = String(state.session).padStart(2, '0')
		this.fright.textContent =
			state.fright > 0
				? `ANTIVIRUS ${Math.ceil(state.fright)}`
				: state.freeze > 0
					? `FROZEN ${Math.ceil(state.freeze)}`
					: ''
		this.lives.textContent = '@'.repeat(Math.max(0, state.lives))
		this.lives.classList.toggle('last-life', state.lives === 1)
		this.mute.textContent = state.muted ? 'MUTE' : ''
		this.player.textContent =
			state.playerCount === 2 && state.status === 'playing'
				? `P${state.currentPlayer}`
				: ''
		this.combo.textContent = comboText(state)
		this.status.textContent =
			state.status === 'playing' && state.deathTimer > 0
				? 'SYSTEM FAILURE'
				: STATUS_TEXT[state.status]
	}
}

function pad(value: number): string {
	return String(value).padStart(6, '0')
}

const COMBO_WINDOW = 1200
const COMBO_BAR_CELLS = 8

function comboText(state: GameState): string {
	if (state.combo < 2 || state.comboTimer <= 0) {
		return ''
	}

	const fraction = Math.min(1, state.comboTimer / COMBO_WINDOW)
	const filled = Math.round(fraction * COMBO_BAR_CELLS)
	const bar = '\u2588'.repeat(filled) + '\u2591'.repeat(COMBO_BAR_CELLS - filled)

	return `x${state.combo} ${bar}`
}