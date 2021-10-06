import { Position } from "../board/position";
import { Piece, PieceColor, PieceType, Tile } from "../board/chess";

export class Knight extends Piece {

  constructor(color: PieceColor) {
    super(PieceType.KNIGHT, color);
  }

  protected availableMoves(boardPosition: Tile[]): Array<Position> {
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

  public getClone(): Piece {
    const clone = new Knight(this.color);
    clone.setPosition(this.getPosition());
    clone.moves = this.moves;
    clone._captured = this._captured
    return clone;
  }
}
