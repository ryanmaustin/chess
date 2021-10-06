import { Position } from "../board/position";
import { Piece, PieceColor, PieceType, PositionUtil, Tile } from "../board/chess";

export class Bishop extends Piece {

  constructor(color: PieceColor) {
    super(PieceType.BISHOP, color);
  }

  protected availableMoves(boardPosition: Tile[]): Array<Position> {
    const moves = new Array<Position>();

    // NW
    for (const move of PositionUtil.directionalMoves(boardPosition, this, -1, 1)) moves.push(move);
    // NE
    for (const move of PositionUtil.directionalMoves(boardPosition, this, 1, 1)) moves.push(move);
    // SE
    for (const move of PositionUtil.directionalMoves(boardPosition, this, 1, -1)) moves.push(move);
    // SW
    for (const move of PositionUtil.directionalMoves(boardPosition, this, -1, -1)) moves.push(move);

    return moves;
  }

  public getClone(): Piece {
    const clone = new Bishop(this.color);
    clone.setPosition(this.getPosition());
    clone.moves = this.moves;
    clone._captured = this._captured
    return clone;
  }

}
