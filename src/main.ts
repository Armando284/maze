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

context.fillStyle = '#000';
context.fillRect(0, 0, canvas.width, canvas.height);

context.fillStyle = '#fff';
context.font = '16px monospace';
context.fillText('TALLERWEB MAZE', 90, 100);