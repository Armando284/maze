import { Player } from './player'
import { Renderer } from './renderer'

export class Game {
  private lastTime = 0
  private readonly player: Player
  private readonly renderer: Renderer;

  constructor(context: CanvasRenderingContext2D) {
    this.player = new Player();
    this.renderer = new Renderer(context, this.player);

    window.addEventListener('keydown', (event) => {
      this.handleInput(event);
    });
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

  private handleInput(event: KeyboardEvent): void {
    switch (event.key) {
      case 'ArrowUp':
      case 'w':
      case 'W':
        this.player.move({ x: 0, y: -1 })
        break

      case 'ArrowDown':
      case 's':
      case 'S':
        this.player.move({ x: 0, y: 1 })
        break

      case 'ArrowLeft':
      case 'a':
      case 'A':
        this.player.move({ x: -1, y: 0 })
        break

      case 'ArrowRight':
      case 'd':
      case 'D':
        this.player.move({ x: 1, y: 0 })
        break
    }
  }
}
