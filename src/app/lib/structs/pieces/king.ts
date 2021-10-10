import { Position } from "../position";
import { Piece, PieceColor, PieceType, PositionUtil, Tile } from "../chess";

export class King extends Piece
{

  constructor(color: PieceColor)
  {
    super(PieceType.KING, color);
  }

  protected availableMoves(tiles: Array<Tile>): Array<Position>
  {
    const moves = new Array<Position>();

    // NW
    for (const move of PositionUtil.directionalMoves(tiles, this, -1, 1, true)) moves.push(move);
    // NE
    for (const move of PositionUtil.directionalMoves(tiles, this, 1, 1, true)) moves.push(move);
    // SE
    for (const move of PositionUtil.directionalMoves(tiles, this, 1, -1, true)) moves.push(move);
    // SW
    for (const move of PositionUtil.directionalMoves(tiles, this, -1, -1, true)) moves.push(move);
    // N
    for (const move of PositionUtil.directionalMoves(tiles, this, 0, 1, true)) moves.push(move);
    // E
    for (const move of PositionUtil.directionalMoves(tiles, this, 1, 0, true)) moves.push(move);
    // S
    for (const move of PositionUtil.directionalMoves(tiles, this, 0, -1, true)) moves.push(move);
    // W
    for (const move of PositionUtil.directionalMoves(tiles, this, -1, 0, true)) moves.push(move);

    // Castle Left Side
    if (this.canCastle(tiles, { x: 1, y: 1 })) {
      moves.push({ x: this.position.x - 2, y: 1 });
    }

    // Castle Right Side
    if (this.canCastle(tiles, { x: 8, y: 1 })) {
      moves.push({ x: this.position.x + 2, y: 1 });
    }

    return moves;
  }

  private canCastle(tiles: Array<Tile>, rookPosition: Position): boolean
  {
    if (this.moves > 0) return false;

    let sign = this.position.x > rookPosition.x ? -1 : 1;

    // Ensure that no tiles between rook and king are occupied or reachable by an enemy piece
    for (let i = 1; i < Math.abs(this.position.x - rookPosition.x); i++)
    {
      const tile = PositionUtil.getTileAt(tiles, { x: (sign * i) + this.position.x, y: 1 });
      if (tile == null) return false;
      if (tile.getPiece() != null) return false;
      if (this.enemyPieceCanReach(tile, tiles)) return false;
    }

    const rooksTile = PositionUtil.getTileAt(tiles, rookPosition);
    if (rooksTile.getPiece() != null && rooksTile.getPiece().getType() == PieceType.ROOK && rooksTile.getPiece().getMoves() == 0)
    {
      return true;
    }
    return false;
  }

  private enemyPieceCanReach(tile: Tile, tiles: Array<Tile>): boolean
  {
    const enemyPosition = PositionUtil.cloneBoard(tiles);

    let enemyCanReach = false;

    for (const t of enemyPosition)
    {
      if (t.getPiece() == null) continue;
      if (t.getPiece().getColor() == this.color) continue; // only want enemy pieces
      if (t.getPiece().getType() == PieceType.KING) continue;
      for (const move of t.getPiece().getAvailableMoves(tiles, false))
      {
        if (PositionUtil.matches(tile.getPosition(), move))
        {
          enemyCanReach = true;
        }
      }
    }

    return enemyCanReach;
  }


  public getClone(): Piece {
    const clone = new King(this.color);
    clone.setPosition(this.getPosition());
    clone.moves = this.moves;
    clone._captured = this._captured
    return clone;
  }
}