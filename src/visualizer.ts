import type { Audio } from './audio'

const WIDTH = 90
const HEIGHT = 22
const PIXEL_SCALE = 2
const SAMPLE_COUNT = 256
const VOLUME_SCALE = 16
const SIGNAL_THRESHOLD = 0.015
const SIGNAL_TIMEOUT = 0.6

export class Visualizer {
	private readonly context: CanvasRenderingContext2D
	private readonly data = new Uint8Array(SAMPLE_COUNT)
	private level = 0
	private lastSignal = 0
	private running = false

	constructor(private readonly audio: Audio) {
		const canvas = document.querySelector<HTMLCanvasElement>('#visualizer')

		if (!canvas) {
			throw new Error('Visualizer element not found')
		}

		const context = canvas.getContext('2d')

		if (!context) {
			throw new Error('Failed to get visualizer context')
		}

		canvas.width = WIDTH * PIXEL_SCALE
		canvas.height = HEIGHT * PIXEL_SCALE

		this.context = context
		this.context.scale(PIXEL_SCALE, PIXEL_SCALE)
	}

	start(): void {
		if (this.running) {
			return
		}

		this.running = true
		requestAnimationFrame(() => this.loop())
	}

	private loop = (): void => {
		if (!this.running) {
			return
		}

		this.draw()
		requestAnimationFrame(() => this.loop())
	}

	private draw(): void {
		const context = this.context
		const data = this.data

		this.audio.waveform(data)

		let peak = 0

		for (let i = 0; i < data.length; i++) {
			const deviation = Math.abs(((data[i] ?? 128) - 128) / 128)

			if (deviation > peak) {
				peak = deviation
			}
		}

		const now = performance.now() / 1000

		if (peak >= SIGNAL_THRESHOLD) {
			this.lastSignal = now
		}

		const audible = !this.audio.isMuted && now - this.lastSignal < SIGNAL_TIMEOUT
		this.level += (peak - this.level) * (peak >= this.level ? 0.5 : 0.1)

		context.clearRect(0, 0, WIDTH, HEIGHT)

		const hue = (now * 26 + this.level * 520) % 360

		context.strokeStyle = 'rgba(51, 255, 102, 0.12)'
		context.lineWidth = 1
		context.beginPath()
		context.moveTo(0, HEIGHT / 2)
		context.lineTo(WIDTH, HEIGHT / 2)
		context.stroke()

		context.beginPath()

		if (audible && peak > 0.004) {
			const scale = VOLUME_SCALE

			for (let x = 0; x < WIDTH; x++) {
				const index = Math.floor((x / (WIDTH - 1)) * (data.length - 1))
				const value = (((data[index] ?? 128) - 128) / 128) * scale
				const y = HEIGHT / 2 - value * (HEIGHT / 2 - 3)

				if (x === 0) {
					context.moveTo(0, y)
				} else {
					context.lineTo(x, y)
				}
			}
		} else {
			const amplitude =
				(HEIGHT / 2 - 3) *
				(0.42 + 0.1 * Math.sin(now * 1.7)) *
				(this.audio.isMuted ? 0.35 : 1)

			for (let x = 0; x < WIDTH; x++) {
				const y =
					HEIGHT / 2 - amplitude * Math.sin(x * 0.32 + now * 3.2)

				if (x === 0) {
					context.moveTo(0, y)
				} else {
					context.lineTo(x, y)
				}
			}
		}

		if (this.audio.isMuted || !audible) {
			context.strokeStyle = 'rgba(51, 255, 102, 0.4)'
			context.lineWidth = 1
			context.stroke()
			return
		}

		context.lineTo(WIDTH, HEIGHT)
		context.lineTo(0, HEIGHT)
		context.closePath()
		context.fillStyle = `hsla(${hue}, 85%, 55%, 0.2)`
		context.fill()

		context.beginPath()

		const scale = VOLUME_SCALE

		for (let x = 0; x < WIDTH; x++) {
			const index = Math.floor((x / (WIDTH - 1)) * (data.length - 1))
			const value = (((data[index] ?? 128) - 128) / 128) * scale
			const y = HEIGHT / 2 - value * (HEIGHT / 2 - 3)

			if (x === 0) {
				context.moveTo(0, y)
			} else {
				context.lineTo(x, y)
			}
		}

		context.strokeStyle = `hsl(${hue}, 100%, 62%)`
		context.lineWidth = 1.5
		context.shadowColor = `hsl(${hue}, 100%, 70%)`
		context.shadowBlur = 6
		context.stroke()
		context.shadowBlur = 0
	}
}