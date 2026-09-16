const DEAD_ZONE = 0.35

const DIRECTION_KEYS = {
	up: 'ArrowUp',
	down: 'ArrowDown',
	left: 'ArrowLeft',
	right: 'ArrowRight',
} as const

const BUTTON_MAP: ReadonlyArray<[number, string]> = [
	[0, 'Enter'],
	[9, 'Enter'],
	[1, 'Escape'],
	[3, '?'],
	[8, 'm'],
]

const DPAD = {
	up: 12,
	down: 13,
	left: 14,
	right: 15,
} as const

export class GamepadInput {
	private readonly pressedButtons = new Set<number>()
	private lastDirection: [number, number] = [0, 0]
	private lastTimestamp = 0
	private connected = false

	get isConnected(): boolean {
		return this.connected
	}

	constructor(
		private readonly onDown: (key: string) => void,
		private readonly onUp: (key: string) => void,
	) {}

	update(): void {
		const gamepad = this.findGamepad()
		this.connected = gamepad !== null

		if (!gamepad || gamepad.timestamp === this.lastTimestamp) {
			return
		}

		this.lastTimestamp = gamepad.timestamp

		this.pollButtons(gamepad)
		this.pollDirections(gamepad)
	}

	private findGamepad(): Gamepad | null {
		if (typeof navigator.getGamepads !== 'function') {
			return null
		}

		for (const gamepad of navigator.getGamepads()) {
			if (gamepad) {
				return gamepad
			}
		}

		return null
	}

	private pollButtons(gamepad: Gamepad): void {
		for (const [index, key] of BUTTON_MAP) {
			const pressed = gamepad.buttons[index]?.pressed ?? false

			if (pressed && !this.pressedButtons.has(index)) {
				this.onDown(key)
			} else if (!pressed && this.pressedButtons.has(index)) {
				this.onUp(key)
			}

			if (pressed) {
				this.pressedButtons.add(index)
			} else {
				this.pressedButtons.delete(index)
			}
		}
	}

	private pollDirections(gamepad: Gamepad): void {
		const dx = this.axis(gamepad, 0, DPAD.left, DPAD.right)
		const dy = this.axis(gamepad, 1, DPAD.up, DPAD.down)

		const current = this.resolveDirection(dx, dy)

		if (
			current[0] === this.lastDirection[0] &&
			current[1] === this.lastDirection[1]
		) {
			return
		}

		const previous = this.directionKeys(
			this.lastDirection[0],
			this.lastDirection[1],
		)
		const next = this.directionKeys(current[0], current[1])

		for (const key of previous) {
			if (!next.includes(key)) {
				this.onUp(key)
			}
		}

		for (const key of next) {
			if (!previous.includes(key)) {
				this.onDown(key)
			}
		}

		this.lastDirection = current
	}

	private axis(
		gamepad: Gamepad,
		axisIndex: number,
		negativeButton: number,
		positiveButton: number,
	): number {
		const value = gamepad.axes[axisIndex] ?? 0

		if (Math.abs(value) > DEAD_ZONE) {
			return value < 0 ? -1 : 1
		}

		if (gamepad.buttons[negativeButton]?.pressed) {
			return -1
		}

		if (gamepad.buttons[positiveButton]?.pressed) {
			return 1
		}

		return 0
	}

	private resolveDirection(dx: number, dy: number): [number, number] {
		return dx !== 0 && dy !== 0 ? [dx, 0] : [dx, dy]
	}

	private directionKeys(dx: number, dy: number): string[] {
		const keys: string[] = []

		if (dy === -1) {
			keys.push(DIRECTION_KEYS.up)
		}

		if (dy === 1) {
			keys.push(DIRECTION_KEYS.down)
		}

		if (dx === -1) {
			keys.push(DIRECTION_KEYS.left)
		}

		if (dx === 1) {
			keys.push(DIRECTION_KEYS.right)
		}

		return keys
	}
}