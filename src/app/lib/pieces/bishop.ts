import { Position } from "../board/position";
import { Tile } from "../board/tile";
import { Piece, PieceColor, PieceType } from "./piece";

export class Bishop extends Piece {

  constructor(color: PieceColor) {
    super(PieceType.BISHOP, color);
  }

  protected availableMoves(boardPosition: Tile[], boardFlipped: boolean): Array<Position> {
    throw new Error("Method not implemented.");
  }

}
