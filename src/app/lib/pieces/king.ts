import { Position } from "../board/position";
import { PositionUtil } from "../board/position-util";
import { Tile } from "../board/tile";
import { Piece, PieceColor, PieceType } from "./piece";

export class King extends Piece {

  constructor(color: PieceColor) {
    super(PieceType.KING, color);
  }

  protected availableMoves(boardPosition: Tile[]): Array<Position> {
    const moves = new Array<Position>();

    // NW
    for (const move of PositionUtil.directionalMoves(boardPosition, this, -1, 1, true)) moves.push(move);
    // NE
    for (const move of PositionUtil.directionalMoves(boardPosition, this, 1, 1, true)) moves.push(move);
    // SE
    for (const move of PositionUtil.directionalMoves(boardPosition, this, 1, -1, true)) moves.push(move);
    // SW
    for (const move of PositionUtil.directionalMoves(boardPosition, this, -1, -1, true)) moves.push(move);
    // N
    for (const move of PositionUtil.directionalMoves(boardPosition, this, 0, 1, true)) moves.push(move);
    // E
    for (const move of PositionUtil.directionalMoves(boardPosition, this, 1, 0, true)) moves.push(move);
    // S
    for (const move of PositionUtil.directionalMoves(boardPosition, this, 0, -1, true)) moves.push(move);
    // W
    for (const move of PositionUtil.directionalMoves(boardPosition, this, -1, 0, true)) moves.push(move);

    // Castle Left Side
    if (this.canCastle(boardPosition, { x: 1, y: 1 })) {
      moves.push({ x: this.position.x - 2, y: 1 });
    }

    // Castle Right Side
    if (this.canCastle(boardPosition, { x: 8, y: 1 })) {
      moves.push({ x: this.position.x + 2, y: 1 });
    }

    return moves;
  }

  private canCastle(boardPosition: Tile[], rookPosition: Position): boolean {
    if (this.moves > 0) return false;

    let sign = this.position.x > rookPosition.x ? -1 : 1;

    for (let i = 1; i < Math.abs(this.position.x - rookPosition.x); i++) {
      const tile = PositionUtil.getTileAt(boardPosition, { x: (sign * i) + this.position.x, y: 1 });
      if (tile == null) return false;
      if (tile.getPiece() != null) return false;
    }

    const rooksTile = PositionUtil.getTileAt(boardPosition, rookPosition);
    if (rooksTile.getPiece() != null && rooksTile.getPiece().getType() == PieceType.ROOK && rooksTile.getPiece().getMoves() == 0) {
      return true;
    }
    return false;
  }

  public getClone(): Piece {
    const clone = new King(this.color);
    clone.setPosition(this.getPosition());
    clone.moves = this.moves;
    clone._captured = this._captured
    return clone;
  }
}
