import './style.css';
import { Game } from './game';

const canvas = document.querySelector<HTMLCanvasElement>('#game');
if (!canvas) {
  throw new Error('Canvas element not found');
}

const context = canvas.getContext('2d');
if (!context) {
  throw new Error('Failed to get 2D context');
}

canvas.width = 320
canvas.height = 200

const game = new Game(context);

game.start();