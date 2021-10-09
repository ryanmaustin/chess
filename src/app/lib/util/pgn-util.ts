import { PieceType, PieceColor } from "../structs/chess";
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

  public static convertPgnMoveToGridPosition(x: string, y: string, color: 'w' | 'b'): Position
  {
    if (color == 'w')
    {
      return { x: Number(ChessNotationMap[x]), y: Number(y) };
    }
    else
    {
      return { x: Math.abs(ChessNotationMap[x] - 9), y: Math.abs(Number(y) - 9) };
    }
  }

}

export interface PGN {
  header: any,
  history: PGNHistory
}

export interface PGNHistory {
  moves: Array<PGNMove>
}

export interface PGNMove {
 color: 'w' | 'b',
 from: string,
 to: string,
 flags: string,
 promotion: string;
}

/**
 * Maps Pieces to their PGN equivalent
 */
export class PGNPieceMap {

  readonly pieceMap = new Map<PieceType, string>();

  constructor() {
    this.pieceMap.set(PieceType.BISHOP, "B");
    this.pieceMap.set(PieceType.KING, "K");
    this.pieceMap.set(PieceType.ROOK, "R");
    this.pieceMap.set(PieceType.PAWN, "");
    this.pieceMap.set(PieceType.QUEEN, "Q");
    this.pieceMap.set(PieceType.KNIGHT, "N");
  }

  public static get(type: PieceType) {
    return new PGNPieceMap().pieceMap.get(type);
  }

  public static toPieceType(pgnPiece: string): PieceType {
    for (const p of new PGNPieceMap().pieceMap.entries()) {
      if (p[1] == pgnPiece.toUpperCase()) {
        return p[0];
      }
    }
    throw Error("No Piece Type Mapped for " + pgnPiece);
  }

}

/**
 * Maps moves on this Chess board to a PGN style notation
 */
export class PGNMoveMap {

  static xMap = [ '', 'a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];

  public static get(position: Position, color: PieceColor): string {
    let move = '';
    if (color == PieceColor.WHITE) {
      move = String(this.xMap[position.x]) + String(position.y.toFixed(0));
    }
    else { // invert both x and y
      move = String(this.xMap[ Math.abs(position.x - 9) ]) + String( Math.abs(position.y - 9).toFixed(0) );
    }
    return move;
  }
}

/**
 * Maps this Chess structure to the PGN standard
 */
export class PGNMapper {

  public static get(type: PieceType, color: PieceColor, current: Position, target: Position, capture: boolean): string {
    let pgn =
      (capture && type ==  PieceType.PAWN ? PGNMoveMap.get(current, color)[0] : '') +
      PGNPieceMap.get(type) +
      (capture ? 'x' : '') +
      PGNMoveMap.get(target, color);
    return pgn;
  }

}
