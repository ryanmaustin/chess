import { Piece } from "../pieces/piece";
import { PieceImgMap } from "../pieces/piece";
import { Position } from "./position";

export class Tile {

  private piece: Piece;

  private pos: Position;

  constructor(pos: Position)
  {
    this.pos = pos;
  }

  public setPosition(pos: Position)
  {
    this.pos = pos;
  }

  public getPosition()
  {
    return this.pos;
  }

  public isBlack()
  {
    // Is black if y is odd and x is even OR y is even and x is odd
    return (this.pos.y % 2 == 1 && this.pos.x % 2 == 1) || (this.pos.y % 2 == 0 && this.pos.x % 2 == 0);
  }

  public isWhite()
  {
    return !this.isBlack();
  }

  public setPiece(piece: Piece)
  {
    this.piece = piece;
    if (this.piece) this.piece.setPosition(this.pos);
  }

  public getPiece()
  {
    return this.piece;
  }

  public getPieceImageUrl(): string
  {
    return `assets/${this.piece.isBlack() ? 'b' : 'w'}${PieceImgMap.get(this.piece.getType())}`;
  }
}
