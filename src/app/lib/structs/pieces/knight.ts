import { Position } from "../position";
import { Piece, PieceColor, PieceType, PositionUtil, Tile } from "../chess";

export class Knight extends Piece {

  constructor(color: PieceColor) {
    super(PieceType.KNIGHT, color);
  }

  protected availableMoves(tiles: Array<Tile>): Array<Position>
  {
    return PositionUtil.knightMoves(this.position);
  }

  public getClone(): Piece {
    const clone = new Knight(this.color);
    clone.setPosition(this.getPosition());
    clone.moves = this.moves;
    clone._captured = this._captured
    return clone;
  }
}
