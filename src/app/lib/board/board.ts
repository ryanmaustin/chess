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
import { BehaviorSubject } from "rxjs";

export class Board {

  private tiles: Array<Tile>;

  private flipped: boolean = false;

  private turn = PieceColor.WHITE;

  private enPassantAvailable = new BehaviorSubject<boolean>(false);

  constructor()
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
    return PositionUtil.getAvailableMoves(this.getTiles(), piece, this.isFlipped());
  }

  public movePiece(piece: Piece, tile: Tile) {
    this.disallowEnPassant();

    const currentTile = PositionUtil.getTileAt(this.tiles, piece.getPosition());
    const origPos = { x: piece.getPosition().x, y: piece.getPosition().y };

    if (piece.getType() == PieceType.PAWN) {
      const pawn = <Pawn> piece;
      pawn.pawnMoved(origPos, tile.getPosition(), this.enPassantAvailable);
      this.handleEnPassant(pawn, tile);
    }

    currentTile.setPiece(null);
    tile.setPiece(piece);

    this.switchTurn(piece.getColor());
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
    this.flipBoard();
  }

  public flipBoard()
  {
    for (let i = 32; i >= 1; i--)
    {
      const top = this.tiles[Math.abs(i-32)];
      const bottom = this.tiles[i+32-1];

      const topPiece = top.getPiece();
      const bottomPiece = bottom.getPiece();

      top.setPiece(bottomPiece);
      bottom.setPiece(topPiece);
    }
    console.log("Board flipped", this.tiles);
  }

}
