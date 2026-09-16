interface HeldPointer {
	key: string
	button: HTMLButtonElement
}

function dispatch(type: 'keydown' | 'keyup', key: string): void {
	window.dispatchEvent(new KeyboardEvent(type, { key }))
}

export class TouchControls {
	private readonly pointers = new Map<number, HeldPointer>()
	private readonly counts = new Map<string, number>()

	constructor(root: HTMLElement) {
		for (const button of root.querySelectorAll<HTMLButtonElement>('button[data-key]')) {
			const key = button.dataset.key ?? ''

			button.addEventListener('pointerdown', (event) => {
				event.preventDefault()
				this.press(event.pointerId, key, button)
			})
			button.addEventListener('pointerup', (event) => {
				this.release(event.pointerId, key)
			})
			button.addEventListener('pointercancel', (event) => {
				this.release(event.pointerId, key)
			})
			button.addEventListener('pointerleave', (event) => {
				this.release(event.pointerId, key)
			})
			button.addEventListener('contextmenu', (event) => event.preventDefault())
		}

		window.addEventListener('blur', () => this.releaseAll())
		window.addEventListener('visibilitychange', () => {
			if (document.visibilityState === 'hidden') {
				this.releaseAll()
			}
		})
	}

	private press(pointerId: number, key: string, button: HTMLButtonElement): void {
		this.pointers.set(pointerId, { key, button })
		const count = (this.counts.get(key) ?? 0) + 1
		this.counts.set(key, count)
		button.classList.add('pressed')

		if (count === 1) {
			dispatch('keydown', key)
		}
	}

	private release(pointerId: number, key: string): void {
		const held = this.pointers.get(pointerId)

		if (!held) {
			return
		}

		this.pointers.delete(pointerId)
		held.button.classList.remove('pressed')
		const count = (this.counts.get(key) ?? 0) - 1

		if (count <= 0) {
			this.counts.delete(key)
			dispatch('keyup', key)
		} else {
			this.counts.set(key, count)
		}
	}

	private releaseAll(): void {
		for (const pointerId of this.pointers.keys()) {
			const held = this.pointers.get(pointerId)

			if (held) {
				held.button.classList.remove('pressed')
			}

			this.pointers.delete(pointerId)
		}

		for (const key of this.counts.keys()) {
			this.counts.delete(key)
			dispatch('keyup', key)
		}
	}
}