import './style.css'
import { Game } from './game'
import { Boot } from './boot'
import { Visualizer } from './visualizer'
import { CELL_SIZE } from './grid'
import { MAZE_HEIGHT, MAZE_WIDTH } from './maze'
import { TouchControls } from './touch-controls'

const canvas = document.querySelector<HTMLCanvasElement>('#game')
if (!canvas) {
	throw new Error('Canvas element not found')
}

const context = canvas.getContext('2d')
if (!context) {
	throw new Error('Failed to get 2D context')
}

export const CANVAS_WIDTH = MAZE_WIDTH * CELL_SIZE
export const CANVAS_HEIGHT = MAZE_HEIGHT * CELL_SIZE

canvas.width = CANVAS_WIDTH
canvas.height = CANVAS_HEIGHT

const game = new Game(context)
const boot = new Boot()

boot.start(() => {
	game.unlockAudio()
	game.playBootJingle()
	game.start()

	new Visualizer(game.getAudio()).start()
})

const touchRoot = document.getElementById('touch-controls')

if (touchRoot) {
	new TouchControls(touchRoot)
}