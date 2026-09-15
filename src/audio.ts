const MELODY = [
	0, 440, 0, 523.25, 0, 440, 0, 392, 0, 349.23, 0, 392, 0, 440, 0, 220,
]
const BASS = [
	110, 110, 110, 110, 110, 110, 110, 110, 87.31, 87.31, 87.31, 87.31, 98, 98,
	110, 110,
]

const MUSIC_STEP = 0.16
const TICK_INTERVAL = 25

export class Audio {
	private context: AudioContext | null = null
	private output: GainNode | null = null
	private muted = false
	private musicPlaying = false
	private musicStep = 0
	private nextNoteTime = 0
	private ticker = 0

	get isMuted(): boolean {
		return this.muted
	}

	setMuted(muted: boolean): void {
		this.muted = muted
	}

	unlock(): void {
		this.ensure()
	}

	startMusic(): void {
		this.ensure()

		if (!this.context) {
			return
		}

		this.musicPlaying = true
		this.musicStep = 0
		this.nextNoteTime = this.context.currentTime + 0.05

		if (this.ticker === 0) {
			this.ticker = window.setInterval(() => this.tick(), TICK_INTERVAL)
		}
	}

	pauseMusic(): void {
		this.musicPlaying = false
	}

	stopMusic(): void {
		this.musicPlaying = false
	}

	resumeMusic(): void {
		this.musicPlaying = true
	}

	private tick(): void {
		const context = this.context

		if (!context || !this.musicPlaying) {
			return
		}

		if (this.nextNoteTime < context.currentTime - 0.1) {
			this.nextNoteTime = context.currentTime + 0.05
		}

		while (this.nextNoteTime < context.currentTime + 0.12) {
			this.playStep(this.musicStep, this.nextNoteTime)
			this.musicStep = (this.musicStep + 1) % MELODY.length
			this.nextNoteTime += MUSIC_STEP
		}
	}

	private playStep(step: number, startTime: number): void {
		const melody = MELODY[step] ?? 0
		const bass = BASS[step] ?? 0

		if (melody) {
			this.emit(melody, startTime, 0.13)
		}

		if (bass) {
			this.emit(bass, startTime, 0.15)
		}
	}

	private ensure(): AudioContext | null {
		if (typeof window === 'undefined') {
			return null
		}

		if (!this.context) {
			const AudioContextCtor =
				window.AudioContext ??
				(
					window as unknown as {
						webkitAudioContext?: typeof AudioContext
					}
				).webkitAudioContext

			if (!AudioContextCtor) {
				return null
			}

			this.context = new AudioContextCtor()
			this.output = this.context.createGain()
			this.output.gain.value = 0.06
			this.output.connect(this.context.destination)
		}

		if (this.context.state === 'suspended') {
			this.context.resume()
		}

		return this.context
	}

	private tone(frequency: number, duration: number, delay = 0): void {
		const context = this.ensure()

		if (!context) {
			return
		}

		this.emit(frequency, context.currentTime + delay, duration)
	}

	private emit(frequency: number, startTime: number, duration: number): void {
		if (this.muted) {
			return
		}

		const context = this.context

		if (!context || !this.output) {
			return
		}

		const oscillator = context.createOscillator()
		const gain = context.createGain()

		oscillator.type = 'square'
		oscillator.frequency.setValueAtTime(frequency, startTime)

		gain.gain.setValueAtTime(1, startTime)
		gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration)

		oscillator.connect(gain)
		gain.connect(this.output)

		oscillator.start(startTime)
		oscillator.stop(startTime + duration + 0.02)
	}

	coin(): void {
		this.tone(660, 0.05)
		this.tone(990, 0.07, 0.05)
	}

	power(): void {
		this.tone(440, 0.08)
		this.tone(554, 0.08, 0.08)
		this.tone(659, 0.14, 0.16)
	}

	slay(): void {
		this.tone(880, 0.07)
		this.tone(660, 0.09, 0.07)
		this.tone(440, 0.18, 0.14)
	}

	freeze(): void {
		this.tone(660, 0.1)
		this.tone(440, 0.1, 0.1)
		this.tone(220, 0.22, 0.2)
	}

	life(): void {
		this.tone(440, 0.08)
		this.tone(554, 0.08, 0.08)
		this.tone(659, 0.08, 0.16)
		this.tone(880, 0.16, 0.24)
	}

	warp(): void {
		this.tone(880, 0.1)
		this.tone(660, 0.1, 0.08)
		this.tone(440, 0.12, 0.16)
		this.tone(880, 0.14, 0.28)
	}

	victory(): void {
		const notes = [523.25, 659.25, 783.99, 1046.5]

		notes.forEach((note, index) => {
			this.tone(note, 0.14, index * 0.12)
		})
	}

	death(): void {
		this.tone(320, 0.18)
		this.tone(200, 0.22, 0.16)
		this.tone(110, 0.4, 0.36)
	}
}