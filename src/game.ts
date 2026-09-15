import { Renderer } from './renderer'

export class Game {
  private lastTime = 0
  private readonly renderer: Renderer;

  constructor(context: CanvasRenderingContext2D) {
    this.renderer = new Renderer(context);
  }

  start(): void {
    requestAnimationFrame((time) => this.loop(time));
  }

  private loop(time: number): void {
    const deltaTime = time - this.lastTime;
    this.lastTime = time;

    this.update(deltaTime);
    this.renderer.render();

    requestAnimationFrame((nextTime) => this.loop(nextTime));
  }

  private update(deltaTime: number): void {
    // TODO: Implement game update logic here
    void deltaTime; // Placeholder to avoid unused variable warning
  }
}
