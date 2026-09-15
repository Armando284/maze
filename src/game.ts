export class Game {
  private lastTime = 0
  private readonly context: CanvasRenderingContext2D;
  constructor(context: CanvasRenderingContext2D) {
    this.context = context;
  }

  start(): void {
    requestAnimationFrame((time) => this.loop(time));
  }

  private loop(time: number): void {
    const deltaTime = time - this.lastTime;
    this.lastTime = time;

    this.update(deltaTime);
    this.render();

    requestAnimationFrame((nextTime) => this.loop(nextTime));
  }

  private update(deltaTime: number): void {
    // TODO: Implement game update logic here
    void deltaTime; // Placeholder to avoid unused variable warning
  }

  private render(): void {
    this.context.fillStyle = '#000';
    this.context.fillRect(0, 0, this.context.canvas.width, this.context.canvas.height);

    this.context.fillStyle = '#fff';
    this.context.font = '16px monospace';
    this.context.fillText('TALLERWEB MAZE', 90, 100);

    const fps = Math.round(1000 / (this.lastTime || 1));

    this.context.fillText(`FPS: ${fps}`, 10, 20);
  }
}
