import {
  CELL_SIZE,
  GRID_HEIGHT,
  GRID_WIDTH,
  toPixel,
} from './grid'
import { MAZE } from './maze'

export class Renderer {
  private readonly context: CanvasRenderingContext2D
  constructor(
    context: CanvasRenderingContext2D
  ) {
    this.context = context
  }

  render(): void {
    this.clear()
    this.renderMaze()
  }

  private clear(): void {
    this.context.fillStyle = '#000'
    this.context.fillRect(0, 0, 320, 200)
  }

  private renderMaze(): void {
    this.context.fillStyle = '#00ff66'

    for (let y = 0; y < GRID_HEIGHT; y++) {
      for (let x = 0; x < GRID_WIDTH; x++) {
        if (MAZE[y][x] !== '#') {
          continue
        }

        const position = toPixel({ x, y })

        this.context.fillRect(
          position.x,
          position.y,
          CELL_SIZE,
          CELL_SIZE,
        )
      }
    }
  }
}