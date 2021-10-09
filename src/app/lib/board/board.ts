import { Pawn } from "../pieces/pawn";
import { Rank } from "./rank";
import { Piece, PieceColor, PieceType, PositionUtil, Tile } from "./chess";
import { Rook } from "../pieces/rook";
import { Knight } from "../pieces/knight";
import { Bishop } from "../pieces/bishop";
import { Queen } from "../pieces/queen";
import { King } from "../pieces/king";
import { Position } from "./position";
import { BehaviorSubject, Subject } from "rxjs";

export interface Move {
  pgnMove: string
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

export class Board {

  public ranks: Array<Rank>;

  private tiles: Array<Tile>;

  private flipped: boolean = false;

  private turn = PieceColor.WHITE;

  private whitePieces: Array<Piece>;
  private blackPieces: Array<Piece>;

  private enPassantAvailable = new BehaviorSubject<boolean>(false);


  constructor(private checkmate$: BehaviorSubject<Mate>)
  {
    this.initTiles();

    this.enPassantAvailable.subscribe(
      (avail) => {
        if (!avail) {
          for (const tile of this.tiles) {
            const piece = tile.getPiece();
            if (piece != null && piece.getType() == PieceType.PAWN) {
              (<Pawn>piece).enPassantNoLongerAllowed();
            }
          }
        }
      }
    );

    this.initRanks();
  }

  public initTiles()
  {
    this.tiles = new Array<Tile>();
    for (let y = 8; y >= 1; y--)
    {
      for (let x = 1; x <= 8; x++)
      {
        this.tiles.push(new Tile(<Position>{ x: x, y: y }));
      }
    }
  }

  public setup()
  {
    this.initTiles();

    this.whitePieces = new Array<Piece>();
    this.blackPieces = new Array<Piece>();

    // Top player pawns
    for (let i = 8; i < 16; i++)
    {
      this.tiles[i].setPiece(new Pawn(PieceColor.BLACK));

    }
    this.tiles[0].setPiece(new Rook(PieceColor.BLACK));
    this.tiles[1].setPiece(new Knight(PieceColor.BLACK));
    this.tiles[2].setPiece(new Bishop(PieceColor.BLACK));
    this.tiles[3].setPiece(new Queen(PieceColor.BLACK));
    this.tiles[4].setPiece(new King(PieceColor.BLACK));
    this.tiles[5].setPiece(new Bishop(PieceColor.BLACK));
    this.tiles[6].setPiece(new Knight(PieceColor.BLACK));
    this.tiles[7].setPiece(new Rook(PieceColor.BLACK));
    for (let i = 0; i < 16; i++) this.blackPieces.push(this.tiles[i].getPiece());

    // Bottom player pawns
    for (let i = 48; i < 56; i++)
    {
      this.tiles[i].setPiece(new Pawn(PieceColor.WHITE));
    }
    this.tiles[56].setPiece(new Rook(PieceColor.WHITE));
    this.tiles[57].setPiece(new Knight(PieceColor.WHITE));
    this.tiles[58].setPiece(new Bishop(PieceColor.WHITE));
    this.tiles[59].setPiece(new Queen(PieceColor.WHITE));
    this.tiles[60].setPiece(new King(PieceColor.WHITE));
    this.tiles[61].setPiece(new Bishop(PieceColor.WHITE));
    this.tiles[62].setPiece(new Knight(PieceColor.WHITE));
    this.tiles[63].setPiece(new Rook(PieceColor.WHITE));
    for (let i = 63; i >= 48; i--) this.whitePieces.push(this.tiles[i].getPiece());

    this.turn = PieceColor.WHITE;
  }

  public initRanks()
  {
    this.ranks = new Array<Rank>();
    for (let i = 0; i < 8; i++)
    {
      this.ranks[i] = this.tiles.slice(i*8, (i*8)+8);
    }
  }

  public getTiles(): Array<Tile> {
    return this.tiles;
  }

  public isFlipped(): boolean {
    return this.flipped;
  }

  public prepareToMovePiece(piece: Piece): Array<Position>
  {
    if (piece.getColor() != this.turn) return []; // not this color's turn

    return PositionUtil.getAvailableMoves(this.getTiles(), piece);
  }

  /**
   * Returns the PGN move notation
   */
  public movePiece(piece: Piece, tile: Tile, moveFinished$ ?: Subject<Move>, promotionChoice ?: PieceType) {
    let p = piece;
    this.disallowEnPassant();

    const currentTile = PositionUtil.getTileAt(this.tiles, p.getPosition());
    const origPos = p.getPosition();
    const capturingPiece = tile.getPiece() != null;

    let pgnMove = PGNMapper.get(piece.getType(), piece.getColor(), origPos, tile.getPosition(), capturingPiece);

    if (p.getType() == PieceType.PAWN) {
      const pawn = <Pawn> p;
      pawn.pawnMoved(origPos, tile.getPosition(), this.enPassantAvailable);
      p = this.handlePawnPromotion(pawn, tile, promotionChoice);

      // Add promotion notation to PGN move
      if (p.getType() != PieceType.PAWN) {
        pgnMove += '=' + PGNPieceMap.get(p.getType());
      }
      this.handleEnPassant(pawn, tile);
    }
    else if (p.getType() == PieceType.KING) {
      const king = <King> p;
      let pgnCastle = this.handleCastle(king, currentTile, tile);
      if (pgnCastle) {
        pgnMove = pgnCastle;
      }
    }
    // Piece is no longer here
    currentTile.setPiece(null);

    // Capture piece if any, then set tile
    if (capturingPiece) {
      console.error(`${tile.getPiece().getColor()} ${tile.getPiece().getType()} was captured by ${piece.getColor()} ${piece.getType()} on [${tile.getPosition().x}, ${tile.getPosition().y}]`)
      tile.getPiece().captured();
    }
    tile.setPiece(p);

    p.moved();

    this.switchTurn(p.getColor());

    if (this.lookForCheckmate()) {
      pgnMove += "#";
    }
    if (moveFinished$) {
      moveFinished$.next( { pgnMove: pgnMove } );
    }
  }

  private lookForCheckmate(): boolean {
    let nextTurnPieces = new Array<Piece>();
    let winner = PieceColor.WHITE;

    if (this.turn == PieceColor.WHITE) {
      nextTurnPieces = this.whitePieces;
      winner = PieceColor.BLACK;
    }
    else { // Black's turn
      nextTurnPieces = this.blackPieces;
    }

    const availMoves = new Array<Position>();
    for (const nextTurnPiece of nextTurnPieces) {
      for (const move of nextTurnPiece.getAvailableMoves(this.tiles)) availMoves.push(move);
    }

    if (availMoves.length == 0) {
      PositionUtil.flipBoard(this.tiles);
      const checkmate = this.kingIsCapturableBy(winner);
      this.checkmate$.next(
        { winner: checkmate ? winner : null, checkmate: checkmate }
      );
      return checkmate;
    }
    return false;
  }

  private kingIsCapturableBy(color: PieceColor): boolean {
    const attackersPieces = this.getPieces(color);
    for (const attackersPiece of attackersPieces) {
      for (const move of attackersPiece.getAvailableMoves(this.tiles)) {
        const tile = PositionUtil.getTileAt(this.tiles, move);
        if (tile != null && tile.getPiece() != null && tile.getPiece().getType() == PieceType.KING) {
          return true;
        }
      }
    }
    return false;
  }

  private handleCastle(king: King, currentTile: Tile, destinationTile: Tile): string{
    if (king.getMoves() != 0) return;
    let distance = destinationTile.getPosition().x - currentTile.getPosition().x;

    if (Math.abs(distance) > 1) {

      // King moved right, so move right rook to the left of the king
      if (distance > 0) {
        const rookTile = PositionUtil.getTileAt(this.tiles, { x: 8, y: 1 });
        const destTile = PositionUtil.getTileAt(this.tiles, { x: destinationTile.getPosition().x - 1, y: 1 });
        destTile.setPiece(rookTile.getPiece());
        rookTile.setPiece(null);

        return king.getColor() == PieceColor.BLACK ? 'O-O-O' : 'O-O';
      } else {
        const rookTile = PositionUtil.getTileAt(this.tiles, { x: 1, y: 1 });
        const destTile = PositionUtil.getTileAt(this.tiles, { x: destinationTile.getPosition().x + 1, y: 1 });
        destTile.setPiece(rookTile.getPiece());
        rookTile.setPiece(null);
        return king.getColor() == PieceColor.BLACK ? 'O-O' : 'O-O-O';
      }
    }
    return '';
  }

  private handlePawnPromotion(pawn: Pawn, tile: Tile, promotionChoice: PieceType): Piece {
    if (tile.getPosition().y == 8) {
      pawn.captured();
      const promotedPiece = Board.create(promotionChoice, pawn.getColor());

      if (pawn.getColor() == PieceColor.BLACK) {
        this.blackPieces.push(promotedPiece);
      }
      else {
        this.whitePieces.push(promotedPiece);
      }
      return promotedPiece;
    }
    return pawn;
  }

  private handleEnPassant(pawn: Pawn, tile: Tile): boolean {
    // We know that we are capturing by en passant if the pawn is moving diagonally to
    // a tile with no piece

    if (tile.getPiece() == null)
    {
      if ((tile.getPosition().y - pawn.getPosition().y) == 1) {
        // Remove pawn on the left
        if ((tile.getPosition().x - pawn.getPosition().x) == -1) {
          PositionUtil.getTileAt(this.tiles, { x: pawn.getPosition().x - 1, y: pawn.getPosition().y }).setPiece(null);
          return true;
        }
        // Remove pawn on the right
        else if ((tile.getPosition().x - pawn.getPosition().x) == 1) {
          PositionUtil.getTileAt(this.tiles, { x: pawn.getPosition().x + 1, y: pawn.getPosition().y }).setPiece(null);
          return true;
        }
      }
    }
    return false;
  }

  private disallowEnPassant() {
    if (this.enPassantAvailable.getValue()) {
      this.enPassantAvailable.next(false);
    }
  }

  private switchTurn(currentTurn: PieceColor)
  {
    if (currentTurn == PieceColor.BLACK) {
      this.turn = PieceColor.WHITE;
    }
    else {
      this.turn = PieceColor.BLACK
    }
    PositionUtil.flipBoard(this.tiles);
  }

  public getPieces(computerColor: PieceColor)
  {
    if (computerColor == PieceColor.BLACK) {
      return this.blackPieces;
    }
    else {
      return this.whitePieces;
    }
  }

  public getTurn(): PieceColor {
    return this.turn;
  }

  public static create(type: PieceType, color: PieceColor): Piece {
    switch (type) {
      case PieceType.PAWN:
        return new Pawn(color);

      case PieceType.BISHOP:
        return new Bishop(color);

      case PieceType.KING:
        return new King(color);

      case PieceType.QUEEN:
        return new Queen(color);

      case PieceType.ROOK:
        return new Rook(color);

      case PieceType.KNIGHT:
        return new Knight(color);
    }
  }

}

export interface Mate {
  winner: PieceColor,
  checkmate: boolean
}
