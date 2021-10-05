import { Position } from "../board/position";
import { PositionUtil } from "../board/position-util";
import { Tile } from "../board/tile";
import { Piece, PieceColor, PieceType } from "./piece";

export class Rook extends Piece {

  constructor(color: PieceColor) {
    super(PieceType.ROOK, color);
  }

  protected availableMoves(boardPosition: Tile[]): Array<Position> {
    const moves = new Array<Position>();

    // N
    for (const move of PositionUtil.directionalMoves(boardPosition, this, 0, 1)) moves.push(move);
    // E
    for (const move of PositionUtil.directionalMoves(boardPosition, this, 1, 0)) moves.push(move);
    // S
    for (const move of PositionUtil.directionalMoves(boardPosition, this, 0, -1)) moves.push(move);
    // W
    for (const move of PositionUtil.directionalMoves(boardPosition, this, -1, 0)) moves.push(move);

    return moves;
  }

  public getClone(): Piece {
    const clone = new Rook(this.color);
    clone.setPosition(this.getPosition());
    clone.moves = this.moves;
    clone._captured = this._captured
    return clone;
  }
}
