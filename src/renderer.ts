import {
  CELL_SIZE,
  GRID_HEIGHT,
  GRID_WIDTH,
  toPixel,
} from './grid'
import { MAZE } from './maze'
import { Player } from './player'

export class Renderer {
  private readonly context: CanvasRenderingContext2D
  private readonly player: Player

  constructor(
    context: CanvasRenderingContext2D,
    player: Player
  ) {
    this.context = context
    this.player = player
  }

  render(): void {
    this.clear()
    this.renderMaze()
    this.renderPlayer()
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

  renderPlayer() {
    const position = toPixel(this.player.position)

    this.context.fillStyle = '#00ff66'
    this.context.fillRect(
      position.x + 2,
      position.y + 2,
      CELL_SIZE - 4,
      CELL_SIZE - 4
    )
  }
}