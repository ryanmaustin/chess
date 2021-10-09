import { Position } from "../position";
import { Piece, PieceColor, PieceType, PositionUtil, Tile } from "../chess";

export class Queen extends Piece {

  constructor(color: PieceColor) {
    super(PieceType.QUEEN, color);
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
    const clone = new Queen(this.color);
    clone.setPosition(this.getPosition());
    clone.moves = this.moves;
    clone._captured = this._captured
    return clone;
  }
}
