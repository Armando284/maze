const BOOT_LINES = [
	'MAZE.EXE - PHOSPHOR TERMINAL v1.0',
	'',
	'MEMORY CHECK .............. OK',
	'LOADING VAULT GENERATOR ... OK',
	'DAEMON SERVICES ........... 5 ACTIVE',
	'GLITCH ENTITY ............. WARN',
	'ACOUSTIC CHANNEL .......... STANDBY',
	'',
	'PRESS ANY KEY TO RAID',
]

export class Boot {
	private readonly overlay: HTMLElement
	private readonly output: HTMLElement
	private onComplete: (() => void) | null = null
	private lineIndex = 0
	private charIndex = 0
	private timer = 0
	private ready = false

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

		this.ready = true
	}

	private handleKeyDown = (event: KeyboardEvent): void => {
		if (!this.ready) {
			return
		}

		window.removeEventListener('keydown', this.handleKeyDown)
		window.clearTimeout(this.timer)

		this.overlay.classList.add('boot-hidden')

		window.setTimeout(() => {
			this.overlay.remove()
			this.onComplete?.()
		}, 320)
	}
}