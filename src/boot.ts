const AUTO_START_DELAY = 1800

const BOOT_TEMPLATES = [
	[
		'MAZE.EXE - PHOSPHOR TERMINAL v2.0',
		'',
		'MEMORY CHECK .............. OK',
		'LOADING VAULT GENERATOR ... OK',
		'DAEMON SERVICES ........... 5 ACTIVE',
		'GLITCH ENTITY ............. WARN',
		'ACOUSTIC CHANNEL .......... STANDBY',
	],
	[
		'MAZE.EXE v2.0 // RIG-BIOS 2.5',
		'',
		'ROM CHECK ......... 64K OK',
		'VECTOR LOAD ....... CALIBRATED',
		'BITS .............. 65,536 SEEDED',
		'P4 THREAT .......... DETECTED',
		'KEYBOARD ........... UNLOCKED',
	],
	[
		'MAZE.EXE v2.0 // NETRUNNER',
		'',
		'UPLINK ............ 300 BAUD',
		'PASSWORD ............... OK',
		'DECRYPT VAULT ......... 98%',
		'POWER SURGE ......... WARN',
		'SCANNER .............. ACTIVE',
	],
]

function pickBootTemplate(): string[] {
	const index = Math.floor(Math.random() * BOOT_TEMPLATES.length)
	const template = BOOT_TEMPLATES[index] ?? []

	return [
		...template,
		'',
		'PRESS ANY KEY OR AUTO-BOOT',
	]
}

const BOOT_LINES = pickBootTemplate()

export class Boot {
	private readonly overlay: HTMLElement
	private readonly output: HTMLElement
	private onComplete: (() => void) | null = null
	private lineIndex = 0
	private charIndex = 0
	private timer = 0
	private done = false

	constructor() {
		const overlay = document.getElementById('boot')
		const output = document.getElementById('boot-text')

		if (!overlay || !output) {
			throw new Error('Boot overlay elements not found')
		}

		this.overlay = overlay
		this.output = output
	}

	start(onComplete: () => void): void {
		this.onComplete = onComplete
		window.addEventListener('keydown', this.handleKeyDown)
		this.overlay.addEventListener('pointerdown', this.handleKeyDown)
		this.typeNextChar()
	}

	private typeNextChar = (): void => {
		const line = BOOT_LINES[this.lineIndex]

		if (line && this.charIndex < line.length) {
			this.output.textContent += line[this.charIndex]
			this.charIndex++
			this.timer = window.setTimeout(this.typeNextChar, 14)
			return
		}

		this.output.textContent += '\n'
		this.lineIndex++
		this.charIndex = 0

		if (this.lineIndex < BOOT_LINES.length) {
			this.timer = window.setTimeout(this.typeNextChar, 120)
			return
		}

		this.timer = window.setTimeout(this.finish, AUTO_START_DELAY)
	}

	private finish = (): void => {
		if (this.done) {
			return
		}

		this.done = true
		window.removeEventListener('keydown', this.handleKeyDown)
		this.overlay.removeEventListener('pointerdown', this.handleKeyDown)
		window.clearTimeout(this.timer)

		this.overlay.classList.add('boot-hidden')

		window.setTimeout(() => {
			this.overlay.remove()
			this.onComplete?.()
		}, 320)
	}

	private handleKeyDown = (): void => {
		if (this.done) {
			return
		}

		this.finish()
	}
}