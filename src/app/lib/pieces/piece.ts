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

  public dragging: boolean = false;

  protected _captured: boolean = false;
  protected moves: number = 0;
  protected type: PieceType;
  protected color: PieceColor;
  protected position: Position;

  constructor(type: PieceType, color: PieceColor) {
    this.type = type;
    this.color = color;
  }

  public abstract getClone(): Piece;

  public moved() {
    this.moves++;
  }

  public captured() {
    this._captured = true;
  }

  public getMoves(): number {
    return this.moves;
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

  public getAvailableMoves(boardPosition: Array<Tile>): Array<Position> {
    if (this._captured) return [];

    return this.removeIllegalMoves(
      boardPosition,
      this.availableMoves(boardPosition)
    );
  }

  private removeIllegalMoves(boardPosition: Array<Tile>, moves: Array<Position>): Array<Position> {

    moves = this.filterOutOccupiedTilesOfSameColor(
      boardPosition,
      moves
    );

    // Remove moves that would put the king in check
    moves = this.filterOutMovesThatPutKingInCheck(
      boardPosition,
      moves
    );

    return moves;
  }

  private filterOutOccupiedTilesOfSameColor(boardPosition: Array<Tile>, moves: Array<Position>): Array<Position>
  {
    const validMoves = new Array<Position>();

    for (const move of moves)
    {
      if (!PositionUtil.tileOccupiedBySameColor(boardPosition, this.getColor(), move))
      {
        validMoves.push(move);
      }
    }

    return validMoves;
  }

  private filterOutMovesThatPutKingInCheck(boardPosition: Array<Tile>, moves: Array<Position>) {
    const legalMoves = new Array<Position>();
    for (const move of moves) {
      let legalMove = true;

      // a move puts the king in check when on the opponent's next turn they could capture it
      const opponentsPosition = PositionUtil.cloneBoard(boardPosition);

      // make the move to achieve opponents pos
      PositionUtil.getTileAt(opponentsPosition, this.position).setPiece(null);
      PositionUtil.getTileAt(opponentsPosition, move).setPiece(this.getClone());

      for (let i = 32; i >= 1; i--)
      {
        const top = opponentsPosition[Math.abs(i-32)];
        const bottom = opponentsPosition[i+32-1];

        const topPiece = top.getPiece();
        const bottomPiece = bottom.getPiece();

        top.setPiece(bottomPiece);
        bottom.setPiece(topPiece);
      }

      // Now check if any of the available moves of any of the oppenents pieces could potentially capture
      // the king

      for (const tile of opponentsPosition) {
        if (tile.getPiece() == null || tile.getPiece().getColor() == this.color) continue;

        const piece = tile.getPiece();

        const availableMovesForOpponent = piece.availableMoves(opponentsPosition);
        for (const availableMoveForOppponent of availableMovesForOpponent) {
          const capturablePiece = PositionUtil.getTileAt(opponentsPosition, availableMoveForOppponent).getPiece();

          if (capturablePiece != null && capturablePiece.getType() == PieceType.KING && capturablePiece.getColor() == this.color) {

            // This move is considered illegal because it would put the king in check
            legalMove = false;
            break;
          }
        }
        if (!legalMove) break;
      }
      // Move passed all checks and is legal
      if (legalMove) legalMoves.push(move);
    }
    return legalMoves;
  }

  protected abstract availableMoves(boardPosition: Array<Tile>): Array<Position>;

  public getPosition(): Position {
    return this.position;
  }

  public getImageUrl(): string
  {
    return `assets/${this.isBlack() ? 'b' : 'w'}${PieceImgMap.get(this.getType())}`;
  }

  public getId(): string {
    return this.type + "-" + this.position.x + "-" + this.position.y;
  }

  public isCaptured(): boolean {
    return this._captured;
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
