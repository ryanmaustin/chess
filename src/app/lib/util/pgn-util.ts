import { Move } from "../structs/board";
import { PieceType, PieceColor, Tile, Piece, PositionUtil } from "../structs/chess";
import { King } from "../structs/pieces/king";
import { Position } from "../structs/position";


  /**
   *      SAMPLE PGN
   *

      1. d4 Nc6 2. e4 d6 3. d5 Nf6 4. dxc6 e5 5. cxb7 Bxb7 6. f3 d5 7. Bd3 Bd6 8. Ne2
    c5 9. Bb5+ Nd7 10. exd5 a6 11. Bc4 Qh4+ 12. g3 Qxc4 13. Nbc3 Qb4 14. a3 Qa5 15.
    Be3 O-O 16. Qd2 Nf6 17. O-O-O Rab8 18. f4 Bxd5 19. Nxd5 Qb5 20. Nxf6+ gxf6 21.
    Qxd6 Qxb2+ 22. Kd2 Rfd8 23. Bxc5 Rxd6+ 24. Bxd6 Rd8 25. Ke3 Qxc2 26. Rd2 Qb3+
    27. Rd3 Qb6+ 28. Kf3 Qc6+ 29. Ke3 Qxh1 30. fxe5 fxe5 31. Bxe5 Re8 32. Kf4 Qf1+
    0-1

   *
   */

const ChessNotationMap =
{
  a: 1,
  b: 2,
  c: 3,
  d: 4,
  e: 5,
  f: 6,
  g: 7,
  h: 8
}

export class PGNUtil
{

  public static convertPgnMoveToGridPosition(x: string, y: string): Position
  {
    return { x: Number(ChessNotationMap[x]), y: Number(y) };
  }

  public static toPGN(move: Move, tiles: Array<Tile>): string
  {
    let pgn = PGNMapper.get(
      move.movingPiece.getType(),
      move.movingPiece.getColor(),
      move.currentTile.getPosition(),
      move.destinationTile.getPosition(),
      move.capturedPiece != null
    );

    if (move.promotionPiece)
    {
      pgn += '=' + PGNPieceMap.get(move.promotionPiece);
    }
    else if (move.movingPiece.getType() == PieceType.KING)
    {
      let distance = move.destinationTile.getPosition().x - move.currentTile.getPosition().x;
      if (Math.abs(distance) > 1)
      {
        pgn = this.pgnForCastling(<King>(move.movingPiece), distance);
      }
    }
    pgn = this.resolveAmbiguities(move, pgn, tiles) +
      (move.checkmate ? '#' : this.kingInCheck(move, tiles) ? '+' : '');

    return pgn;
  }

  private static kingInCheck(move: Move, tiles: Array<Tile>): boolean
  {

    for (const tile of tiles)
    {
      if (tile.getPiece() == null) continue;
      if (tile.getPiece().getColor() != move.movingPiece.getColor()) continue;

      for (const availableMove of tile.getPiece().getAvailableMoves(tiles, false))
      {
        const availableTile = PositionUtil.getTileAt(tiles, availableMove);
        if (availableTile.getPiece() == null) continue;
        if (availableTile.getPiece().getType() == PieceType.KING && availableTile.getPiece().getColor() != move.movingPiece.getColor()) return true;
      }
    }
    return false;
  }

  private static pgnForCastling(king: King, distance: number): string
  {
    if (distance > 0)
    {
      return king.getColor() == PieceColor.BLACK ? 'O-O-O' : 'O-O';
    }
    else
    {
      return king.getColor() == PieceColor.BLACK ? 'O-O' : 'O-O-O';
    }
  }

  private static resolveAmbiguities(move: Move, currentPgn: string, tiles: Array<Tile>): string
  {
    // The King is the only piece that could never have an ambiguity
    if (move.movingPiece.getType() != PieceType.KING)
    {
      return this.resolvePotentialAmbiguities(move, currentPgn, tiles);
    }
    return currentPgn;
  }

  private static resolvePotentialAmbiguities(move: Move, currentPgn: string, tiles: Array<Tile>): string
  {
    // Are there pieces that can reach the same destination tile?
    const otherPieces = this.getOthersOfTypeThatCanReachPosition(
      tiles, move.movingPiece, move.capturedPiece, move.currentTile.getPosition(), move.destinationTile.getPosition()
    );

    if (otherPieces.length == 0) return currentPgn; // No ambiguity

    // Try to distinguish the piece...
    let distinguisher = this.distinguish(move.movingPiece, otherPieces, move.currentTile.getPosition());

    let pieceDesignator = PGNPieceMap.get(move.movingPiece.getType());
    let capturing = move.capturedPiece != null ? 'x' : '';
    let target = PGNMoveMap.get(move.destinationTile.getPosition(), move.movingPiece.getColor());

    return pieceDesignator + distinguisher + capturing + target;
  }

  private static distinguish(piece: Piece, otherPieces: Array<Piece>, originPosition: Position): string
  {
    let distinguisher =  this.distinquishByFile(piece, otherPieces, originPosition);
    if (!distinguisher) distinguisher = this.distinquishByRank(piece, otherPieces, originPosition);
    if (!distinguisher) distinguisher = PGNMoveMap.get(piece.getPosition(), piece.getColor());
    return distinguisher;
  }

  private static distinquishByFile(piece: Piece, otherPieces: Array<Piece>, originPosition: Position): string
  {
    let noneOnSameFile = true;
    for (const otherPiece of otherPieces)
    {
      if (this.onSameFile(originPosition, otherPiece))
      {
        noneOnSameFile = false;
        break;
      }
    }
    if (noneOnSameFile)
    {
      return PGNMoveMap.get(originPosition, piece.getColor()).substr(0, 1);
    }
    return null;
  }

  private static distinquishByRank(piece: Piece, otherPieces: Array<Piece>, originPosition: Position): string
  {
    let noneOnSameRank = true;
    for (const otherPiece of otherPieces)
    {
      if (this.onSameRank(originPosition, otherPiece))
      {
        noneOnSameRank = false;
        break;
      }
    }
    if (noneOnSameRank)
    {
      return PGNMoveMap.get(originPosition, piece.getColor()).substr(1, 1);
    }
    return null;
  }

  private static canReachTargetPosition(originPosition: Position, targetPosition: Position, p: Piece, capturedPiece: Piece, tiles: Array<Tile>): boolean
  {
    // Temporarily put current piece back at its starting position so that the
    // piece we are checking can accurately get its available moves
    const targetTile = PositionUtil.getTileAt(tiles, targetPosition);
    const originTile = PositionUtil.getTileAt(tiles, originPosition);
    const currentPiece = targetTile.getPiece();
    targetTile.setPiece(capturedPiece); // put the captured piece back
    originTile.setPiece(currentPiece);
    let matchFound = false;

    for (const move of p.getAvailableMoves(tiles))
    {
      if (PositionUtil.matches(move, targetPosition)) matchFound = true;
    }

    // Put piece back
    targetTile.setPiece(currentPiece);
    originTile.setPiece(null);
    return matchFound;
  }

  private static onSameFile(originPosition: Position, b: Piece): boolean
  {
    return originPosition.x == b.getPosition().x;
  }

  private static onSameRank(originPosition: Position, b: Piece): boolean
  {
    return originPosition.y == b.getPosition().y;
  }

  private static getOthersOfTypeThatCanReachPosition(tiles: Array<Tile>, piece: Piece, capturedPiece: Piece, originPosition: Position, targetPosition: Position): Array<Piece>
  {
    const others = new Array<Piece>();
    for (const tile of tiles)
    {
      if (PositionUtil.matches(tile, piece.getPosition())) continue; // this piece, so skip
      if (tile.getPiece() == null) continue; // no piece here
      if (tile.getPiece().getType() != piece.getType() || tile.getPiece().getColor() != piece.getColor()) continue; // not same type or not same color
      if (this.canReachTargetPosition(originPosition, targetPosition, tile.getPiece(), capturedPiece, tiles)) others.push(tile.getPiece());
    }
    return others;
  }
}

export interface PGN
{
  header: any,
  history: PGNHistory
}

export interface PGNHistory
{
  moves: Array<PGNMove>
}

export interface PGNMove
{
 color: 'w' | 'b',
 from: string,
 to: string,
 flags: string,
 promotion: string;
}

/**
 * Maps Pieces to their PGN equivalent
 */
export class PGNPieceMap
{

  readonly pieceMap = new Map<PieceType, string>();

  constructor()
  {
    this.pieceMap.set(PieceType.BISHOP, "B");
    this.pieceMap.set(PieceType.KING, "K");
    this.pieceMap.set(PieceType.ROOK, "R");
    this.pieceMap.set(PieceType.PAWN, "");
    this.pieceMap.set(PieceType.QUEEN, "Q");
    this.pieceMap.set(PieceType.KNIGHT, "N");
  }

  public static get(type: PieceType)
  {
    return new PGNPieceMap().pieceMap.get(type);
  }

  public static toPieceType(pgnPiece: string): PieceType
  {
    for (const p of new PGNPieceMap().pieceMap.entries())
    {
      if (p[1] == pgnPiece.toUpperCase())
      {
        return p[0];
      }
    }
    throw Error("No Piece Type Mapped for " + pgnPiece);
  }

}

//

/**
 * Maps moves on this Chess board to a PGN style notation
 */
export class PGNMoveMap
{

  static xMap = [ '', 'a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];

  public static get(position: Position, color: PieceColor): string
  {
    return String(this.xMap[position.x]) + String(position.y.toFixed(0));
  }
}

//   d4  e5  dxe5  b5  e6  b4  exd7+  Qxd7  Qxd7+  Nxd7  Be3  Bd6  Nc3  b3  O-O-O  Rb8  axb3  Ke7  Bg5+  Ke6  Nf3  Nb6  Nd4+  Kd7  g3  Rb7  Bh3+  Ke8  Bxc8  Nd7  Bxb7  c5  Bc6  f5  Bb5  c4  bxc4  Ne7  c5  Kf7  cxd6  g6  dxe7  f4  e8=Q+  Kxe8  Ne6  a5  Bf6  a4  Bxh8  f3  exf3  a3  Rhe1  Kf7  bxa3  Kg8  Nc5  Nxc5  Re8+  Kf7  Rde1  g5  Bc4+  Kg6  Rg8+  Kh5  Bf7+  Kh6  Re6+  Nxe6  Bxe6  Kh5  a4  Kh6  a5  Kh5  a6  Kh6  a7  Kh5  a8=Q  Kh6  Qf8+  Kh5



/**
 * Maps this Chess structure to the PGN standard
 */
export class PGNMapper
{

  public static get(type: PieceType, color: PieceColor, current: Position, target: Position, capture: boolean): string {
    let pgn =
      (capture && type ==  PieceType.PAWN ? PGNMoveMap.get(current, color)[0] : '') +
      PGNPieceMap.get(type) +
      (capture ? 'x' : '') +
      PGNMoveMap.get(target, color);
    return pgn;
  }

}
