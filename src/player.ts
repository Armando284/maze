import { type Point, isInsideGrid } from './grid'
import { MAZE } from './maze'

export class Player {
  private readonly startPosition: Point = {
    x: 2,
    y: 2,
  }

  position: Point = { ...this.startPosition }

  move(direction: Point): void {
    const newPosition: Point = {
      x: this.position.x + direction.x,
      y: this.position.y + direction.y,
    }

    if (!this.canMoveTo(newPosition)) {
      return
    }

    this.position = newPosition
  }

  private canMoveTo(position: Point): boolean {
    if (!isInsideGrid(position)) {
      return false
    }

    return MAZE[position.y][position.x] !== '#'
  }

  isAtExit(): boolean {
    return MAZE[this.position.y][this.position.x] === 'E'
  }

  reset(): void {
    this.position = { ...this.startPosition }
  }
}