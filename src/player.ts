import { type Point, isInsideGrid } from './grid'
import { MAZE } from './maze'

export class Player {
  position: Point = { x: 2, y: 2 }

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
}