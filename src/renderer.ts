import type { GameState } from './game-state'
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
  private readonly state: GameState

  constructor(
    context: CanvasRenderingContext2D,
    player: Player,
    state: GameState
  ) {
    this.context = context
    this.player = player
    this.state = state
  }

  render(): void {
    this.clear()

    if (this.state.status === 'won') {
      this.renderVictory()
      return
    }

    this.renderMaze()
    this.renderPlayer()
    this.renderExit()
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

  private renderPlayer() {
    const position = toPixel(this.player.position)

    this.context.fillStyle = '#00ff66'
    this.context.fillRect(
      position.x + 2,
      position.y + 2,
      CELL_SIZE - 4,
      CELL_SIZE - 4
    )
  }

  private renderExit() {
    const y = MAZE.findIndex((row) => row.includes('E'))
    if (y === -1) {
      return
    }

    const x = MAZE[y].indexOf('E')
    const position = toPixel({ x, y })

    this.context.fillStyle = '#ffff00'
    this.context.fillRect(
      position.x + 2,
      position.y + 2,
      CELL_SIZE - 4,
      CELL_SIZE - 4
    )
  }

  private renderVictory(): void {
    this.context.fillStyle = '#00ff66'
    this.context.font = '20px monospace'
    this.context.textAlign = 'center'

    this.context.fillText(
      'YOU ESCAPED',
      160,
      90,
    )

    this.context.font = '10px monospace'

    this.context.fillText(
      'PRESS ENTER TO PLAY AGAIN',
      160,
      115,
    )

    this.context.textAlign = 'left'
  }
}