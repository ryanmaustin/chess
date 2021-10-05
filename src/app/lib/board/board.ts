import { Pawn } from "../pieces/pawn";
import { Tile } from "./tile";
import { Rank } from "./rank";
import { Piece, PieceColor, PieceType } from "../pieces/piece";
import { Rook } from "../pieces/rook";
import { Knight } from "../pieces/knight";
import { Bishop } from "../pieces/bishop";
import { Queen } from "../pieces/queen";
import { King } from "../pieces/king";
import { Position } from "./position";
import { PositionUtil } from "./position-util";
import { BehaviorSubject, Subject } from "rxjs";
import { Checkmate } from "src/app/app.component";

export class Board {
  private tiles: Array<Tile>;

  private flipped: boolean = false;

  private turn = PieceColor.WHITE;

  private whitePieces: Array<Piece>;
  private blackPieces: Array<Piece>;

  private enPassantAvailable = new BehaviorSubject<boolean>(false);


  constructor(private checkmate$: BehaviorSubject<Checkmate>)
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

  public ranks(): Array<Rank>
  {
    const ranks = new Array<Rank>();
    for (let i = 0; i < 8; i++)
    {
      ranks[i] = this.tiles.slice(i*8, (i*8)+8);
    }
    return ranks;
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

    const position = PositionUtil.getPosition(this.getTiles(), piece);
    console.log("Selected " + piece.getColor() + " " + piece.getType() + " [" + position.x + "," + position.y + "]");
    return PositionUtil.getAvailableMoves(this.getTiles(), piece);
  }

  public movePiece(piece: Piece, tile: Tile, moveFinished$ ?: Subject<boolean>) {
    let p = piece;
    this.disallowEnPassant();

    const currentTile = PositionUtil.getTileAt(this.tiles, p.getPosition());
    const origPos = { x: piece.getPosition().x, y: p.getPosition().y };

    if (p.getType() == PieceType.PAWN) {
      const pawn = <Pawn> p;
      pawn.pawnMoved(origPos, tile.getPosition(), this.enPassantAvailable);
      p = this.handlePawnPromotion(pawn, tile);
      this.handleEnPassant(pawn, tile);
    }
    else if (p.getType() == PieceType.KING) {
      const king = <King> p;
      this.handleCastle(king, currentTile, tile);
    }
    // Piece is no longer here
    currentTile.setPiece(null);

    // Capture piece if any, then set tile
    if (tile.getPiece() != null) {
      tile.getPiece().captured();
    }
    tile.setPiece(p);

    p.moved();

    this.switchTurn(p.getColor());

    this.lookForCheckmate();
    if (moveFinished$) {
      moveFinished$.next(true);
    }
  }

  private lookForCheckmate() {
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
      this.checkmate$.next({ winner: winner });
    }
  }

  private handleCastle(king: King, currentTile: Tile, destinationTile: Tile) {
    if (king.getMoves() != 0) return;
    let distance = destinationTile.getPosition().x - currentTile.getPosition().x;

    if (Math.abs(distance) > 1) {

      // King moved right, so move right rook to the left of the king
      if (distance > 0) {
        const rookTile = PositionUtil.getTileAt(this.tiles, { x: 8, y: 1 });
        const destTile = PositionUtil.getTileAt(this.tiles, { x: destinationTile.getPosition().x - 1, y: 1 });
        destTile.setPiece(rookTile.getPiece());
        rookTile.setPiece(null);
      } else {
        const rookTile = PositionUtil.getTileAt(this.tiles, { x: 1, y: 1 });
        const destTile = PositionUtil.getTileAt(this.tiles, { x: destinationTile.getPosition().x + 1, y: 1 });
        destTile.setPiece(rookTile.getPiece());
        rookTile.setPiece(null);
      }
    }
  }

  private handlePawnPromotion(pawn: Pawn, tile: Tile): Piece {
    if (tile.getPosition().y == 8) {
      return new Queen(pawn.getColor());
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
          console.warn("Handling En Passant!");
          PositionUtil.getTileAt(this.tiles, { x: pawn.getPosition().x - 1, y: pawn.getPosition().y }).setPiece(null);
          return true;
        }
        // Remove pawn on the right
        else if ((tile.getPosition().x - pawn.getPosition().x) == 1) {
          console.warn("Handling En Passant!");
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

}
