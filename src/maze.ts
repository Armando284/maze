import type { Point } from './grid'

export type Cell = 'wall' | 'floor' | 'exit'

export const MAP = [
  '################################',
  '#                              #',
  '#  #######  #######  #######  #',
  '#  #                        #  #',
  '#  #  ####################  #  #',
  '#  #  #                  #  #  #',
  '#  #  #  ##############  #  #  #',
  '#  #  #  #            #  #  #  #',
  '#     #  #     ##     #  #     #',
  '##### #  #     ##     #  #######',
  '#     #  #            #        #',
  '#  ####  ##############  ####  #',
  '#                             E#',
  '#  ##########################  #',
  '#                              #',
  '#  #######  #######  #######   #',
  '#  #                        #  #',
  '#  #  ####################  #  #',
  '#                              #',
  '################################',
] as const

export const MAZE_WIDTH = MAP[0].length
export const MAZE_HEIGHT = MAP.length

export function getCell(x: number, y: number): Cell {
  const value = MAP[y][x]

  if (value === '#') {
    return 'wall'
  }

  if (value === 'E') {
    return 'exit'
  }

  return 'floor'
}

export class Maze {
  isInside(point: Point): boolean {
    return (
      point.x >= 0 &&
      point.x < MAZE_WIDTH &&
      point.y >= 0 &&
      point.y < MAZE_HEIGHT
    )
  }

  isWalkable(point: Point): boolean {
    if (!this.isInside(point)) {
      return false
    }

    return getCell(point.x, point.y) !== 'wall'
  }

  isExit(point: Point): boolean {
    if (!this.isInside(point)) {
      return false
    }

    return getCell(point.x, point.y) === 'exit'
  }
}