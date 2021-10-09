import { BehaviorSubject } from "rxjs";
import { Position } from "../board/position";
import { Piece, PieceColor, PieceType, PositionUtil, Tile } from "../board/chess";

export class Pawn extends Piece {

  private _firstMoveTaken: boolean;
  private _enPassantAllowed: boolean = false;

  constructor(color: PieceColor) {
    super(PieceType.PAWN, color);
  }

  public firstMoveTaken(): boolean {
    return !this._firstMoveTaken;
  }

  public pawnMoved(origPos: Position, movedTo: Position, enPassantAvailable: BehaviorSubject<boolean>) {
    this._firstMoveTaken = true;

    if ((movedTo.y - origPos.y) == 2) {
      this.enPassantNowAllowed();
      enPassantAvailable.next(true);
    }
  }

  protected availableMoves(boardPosition: Tile[]): Array<Position> {
    const moves = new Array<Position>();

    const forward1 = { x: this.position.x, y: this.position.y + 1 }
    if (this.firstMoveTaken())
    {
      const forward2 = { x: this.position.x, y: this.position.y + 2 };
      if (PositionUtil.getTileAt(boardPosition, forward1).getPiece() == null && PositionUtil.getTileAt(boardPosition, forward2).getPiece() == null)
      {
        moves.push(forward2);
      }
    }
    if (PositionUtil.getTileAt(boardPosition, forward1).getPiece() == null) {
      moves.push(forward1);
    }

    for (const capture of this.getCaptures(boardPosition)) moves.push(capture);

    return moves;
  }

  protected getCaptures(boardPosition: Tile []): Array<Position> {
    const captures = new Array<Position>();

    const diagL = PositionUtil.getTileAt(boardPosition, { x: this.position.x - 1, y: this.position.y + 1 });
    const diagR = PositionUtil.getTileAt(boardPosition, { x: this.position.x + 1, y: this.position.y + 1 });
    const enPassantL = PositionUtil.getTileAt(boardPosition, { x: this.position.x - 1, y: this.position.y });
    const enPassantR = PositionUtil.getTileAt(boardPosition, { x: this.position.x + 1, y: this.position.y });

    if (diagL != null && diagL.getPiece() != null)
    {
      captures.push(diagL.getPosition());
    }
    if (diagR != null && diagR.getPiece() != null)
    {
      captures.push(diagR.getPosition());
    }
    if (this.capturableByEnPassant(enPassantL))
    {
      captures.push(diagL.getPosition());
    }
    if (this.capturableByEnPassant(enPassantR))
    {
      captures.push(diagR.getPosition());
    }
    return captures;
  }

  private capturableByEnPassant(tile: Tile): boolean
  {
    if (tile == null) return false;
    return tile.getPiece() != null &&
      tile.getPiece().getType() == PieceType.PAWN &&
      (<Pawn>(tile.getPiece())).enPassantAllowed();
  }

  protected enPassantAllowed(): boolean {
    return this._enPassantAllowed;
  }

  public enPassantNoLongerAllowed() {
    this._enPassantAllowed = false;
  }

  protected enPassantNowAllowed() {
    this._enPassantAllowed = true;
  }

  public getClone(): Piece {
    const clone = new Pawn(this.color);
    clone.setPosition(this.getPosition());
    clone._firstMoveTaken = this._firstMoveTaken;
    this._enPassantAllowed = this._enPassantAllowed;
    clone.moves = this.moves;
    clone._captured = this._captured
    return clone;
  }
}
