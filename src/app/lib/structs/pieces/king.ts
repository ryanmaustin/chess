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
    const moves = this.directionalMoves(tiles);

    const rank = this.color == PieceColor.BLACK ? 8 : 1;

    // Castle Left Side
    if (this.canCastle(tiles, { x: 1, y: rank })) {
      moves.push({ x: this.position.x - 2, y: rank });
    }

    // Castle Right Side
    if (this.canCastle(tiles, { x: 8, y: rank })) {
      moves.push({ x: this.position.x + 2, y: rank });
    }

    return this.keepKingsTwoSquaresAway(tiles, moves);
  }

  /**
   * When evaluating the enemy King's moves, we might only want to retrieve that King's
   * directional moves to keep both Kings two squares away.
   */
  private directionalMoves(tiles: Array<Tile>): Array<Position>
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

    return moves;
  }

  /**
   * Determines if a King can castle within the given position depending on the position of the Rook
   * provided.
   */
  private canCastle(tiles: Array<Tile>, rookPosition: Position): boolean
  {
    if (this.moves > 0) return false;

    let sign = this.position.x > rookPosition.x ? -1 : 1;

    // Ensure that the two tiles next to the king are not reachable by an enemy piece and that
    // there are no occupied tiles between the rook and king
    for (let i = 1; i < Math.abs(this.position.x - rookPosition.x); i++)
    {
      const tile = PositionUtil.getTileAt(tiles, { x: (sign * i) + this.position.x, y: this.color == PieceColor.BLACK ? 8 : 1 });
      if (tile == null) return false;
      if (tile.getPiece() != null) return false;
      if (i < 3 && this.enemyPieceCanReach(tile, tiles)) return false;
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

  /**
   * If the enemy King can reach any of the positions defined by the given moves, those moves will
   * be removed in order to keep the Kings two squares apart.
   */
  private keepKingsTwoSquaresAway(tiles: Array<Tile>, moves: Array<Position>)
  {
    const enemyColor = this.color == PieceColor.WHITE ? PieceColor.BLACK : PieceColor.WHITE;
    const enemyKing = PositionUtil.getKing(enemyColor, tiles);
    const enemyKingVision = enemyKing.directionalMoves(tiles);
    const legalMoves = new Array<Position>();
    for (const move of moves)
    {
      let matchFound = false;
      for (const enemyKingMove of enemyKingVision)
      {
        if (PositionUtil.matches(move, enemyKingMove))
        {
          matchFound = true;
          break;
        }
      }
      if (!matchFound) legalMoves.push(move); // Enemy king can't reach this position
    }
    return legalMoves;
  }

  public getClone(): Piece {
    const clone = new King(this.color);
    clone.setPosition(this.getPosition());
    clone.moves = this.moves;
    clone._captured = this._captured
    return clone;
  }
}
