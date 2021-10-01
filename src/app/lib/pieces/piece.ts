import { Position } from "../board/position";
import { PositionUtil } from "../board/position-util";
import { Tile } from "../board/tile";

export enum PieceType {
  PAWN = 'PAWN',
  KNIGHT = 'KNIGHT',
  BISHOP = 'BISHOP',
  ROOK = 'ROOK',
  QUEEN = 'QUEEN',
  KING = 'KING'
}

export enum PieceColor {
  WHITE = 'WHITE',
  BLACK = 'BLACK'
}

export abstract class Piece {

  protected type: PieceType;
  protected color: PieceColor;
  protected position: Position;

  constructor(type: PieceType, color: PieceColor) {
    this.type = type;
    this.color = color;
  }

  public getType(): PieceType
  {
    return this.type;
  }

  public getColor(): PieceColor
  {
    return this.color;
  }

  public isBlack(): boolean
  {
    return this.color == PieceColor.BLACK;
  }

  public isWhite(): boolean
  {
    return this.color == PieceColor.WHITE;
  }

  public setPosition(pos: Position) {
    this.position = pos;
  }

  public getAvailableMoves(boardPosition: Array<Tile>, boardFlipped: boolean): Array<Position> {
    return this.filterOutOccupiedTilesOfSameColor(
      boardPosition,
      this.availableMoves(boardPosition, boardFlipped),
      this.getColor()
    );
  }

  private filterOutOccupiedTilesOfSameColor(boardPosition: Array<Tile>, moves: Array<Position>, color: PieceColor): Array<Position>
  {
    const validMoves = new Array<Position>();

    for (const move of moves)
    {
      if (!PositionUtil.tileOccupiedBySameColor(boardPosition, color, move))
      {
        validMoves.push(move);
      }
    }

    return validMoves;
  }

  protected abstract availableMoves(boardPosition: Array<Tile>, boardFlipped: boolean): Array<Position>;

  public getPosition(): Position {
    return this.position;
  }
}

export const PieceImgMap = new Map<PieceType, string>([
  [ PieceType.PAWN, '-p.png'],
  [ PieceType.KNIGHT, '-n.png'],
  [ PieceType.BISHOP, '-b.png'],
  [ PieceType.ROOK, '-r.png'],
  [ PieceType.QUEEN, '-q.png'],
  [ PieceType.KING, '-k.png'],
]);
