import { Position } from "../board/position";
import { Tile } from "../board/tile";
import { Piece, PieceColor, PieceType } from "./piece";

export class Knight extends Piece {

  constructor(color: PieceColor) {
    super(PieceType.KNIGHT, color);
  }

  protected availableMoves(boardPosition: Tile[], boardFlipped: boolean): Array<Position> {
    const moves = new Array<Position>();

    const potentialMoves = [
      [+2, -1],
      [+2, +1],
      [+1, -2],
      [+1, +2],
      [-2, -1],
      [-2, +1],
      [-1, +2],
      [-1, -2],
    ];

    for (const potentialMove of potentialMoves)
    {
      const moveX = potentialMove[0] + this.position.x;
      const moveY = potentialMove[1] + this.position.y;

      if (moveX < 1 || moveX > 8 || moveY < 1 || moveY > 8) continue;

      moves.push({x: moveX, y: moveY});
    }

    return moves;
  }
}
