import './style.css'
import { Game } from './game'
import { CELL_SIZE } from './grid'
import { MAZE_HEIGHT, MAZE_WIDTH } from './maze'

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

game.start()
