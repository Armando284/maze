import { type Point } from './grid'
import { Maze } from './maze'

export class Player {
  private readonly startPosition: Point = {
    x: 2,
    y: 2,
  }
  position: Point = { ...this.startPosition }
  private readonly maze: Maze

  constructor(maze: Maze) {
    this.maze = maze
  }

  move(direction: Point): void {
    const newPosition: Point = {
      x: this.position.x + direction.x,
      y: this.position.y + direction.y,
    }

    if (!this.maze.isWalkable(newPosition)) {
      return
    }

    this.position = newPosition
  }

  isAtExit(): boolean {
    return this.maze.isExit(this.position)
  }

  reset(): void {
    this.position = { ...this.startPosition }
  }
}