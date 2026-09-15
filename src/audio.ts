export class Audio {
	private context: AudioContext | null = null
	private output: GainNode | null = null

	unlock(): void {
		this.ensure()
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
		if (!context || !this.output) {
			return
		}

		const start = context.currentTime + delay
		const oscillator = context.createOscillator()
		const gain = context.createGain()

		oscillator.type = 'square'
		oscillator.frequency.setValueAtTime(frequency, start)

		gain.gain.setValueAtTime(1, start)
		gain.gain.exponentialRampToValueAtTime(0.001, start + duration)

		oscillator.connect(gain)
		gain.connect(this.output)

		oscillator.start(start)
		oscillator.stop(start + duration + 0.02)
	}

	coin(): void {
		this.tone(660, 0.05)
		this.tone(990, 0.07, 0.05)
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