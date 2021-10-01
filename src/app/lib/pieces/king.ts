import { Position } from "../board/position";
import { Tile } from "../board/tile";
import { Piece, PieceColor, PieceType } from "./piece";

export class King extends Piece {

  constructor(color: PieceColor) {
    super(PieceType.KING, color);
  }

  protected availableMoves(boardPosition: Tile[], boardFlipped: boolean): Array<Position> {
    throw new Error("Method not implemented.");
  }
}
