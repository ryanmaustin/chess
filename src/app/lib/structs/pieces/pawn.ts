import { BehaviorSubject } from "rxjs";
import { Position } from "../position";
import { Piece, PieceColor, PieceType, PositionUtil, Tile } from "../chess";
import { EnPassant } from "../board";

export class Pawn extends Piece
{

  private _firstMoveTaken: boolean = false;
  private _enPassantAllowed: boolean = false;

  constructor(color: PieceColor) {
    super(PieceType.PAWN, color);
  }

  public firstMoveTaken(): boolean
  {
    return this._firstMoveTaken;
  }

  public pawnMoved(origPos: Position, movedTo: Position, enPassantAvailable: BehaviorSubject<EnPassant>)
  {
    this._firstMoveTaken = true;

    if (Math.abs(movedTo.y - origPos.y) == 2)
    {
      this.enPassantNowAllowed();
      enPassantAvailable.next( { available: true, color: this.color == PieceColor.BLACK ? PieceColor.WHITE : PieceColor.BLACK, turns: 0} );
    }
  }

  protected availableMoves(tiles: Array<Tile>): Array<Position>
  {
    const moves = new Array<Position>();
    let direction = this.color == PieceColor.BLACK ? -1 : 1;

    if (this.position.y == 8 || this.position.y == 1) return [];

    const forward1 = { x: this.position.x, y: this.position.y + (direction * 1) }
    if (!this.firstMoveTaken())
    {
      const forward2 = { x: this.position.x, y: this.position.y + (direction * 2) };
      if (PositionUtil.getTileAt(tiles, forward1).getPiece() == null && PositionUtil.getTileAt(tiles, forward2).getPiece() == null)
      {
        moves.push(forward2);
      }
    }

    if (PositionUtil.getTileAt(tiles, forward1).getPiece() == null)
    {
      moves.push(forward1);
    }

    for (const capture of this.getCaptures(tiles, direction)) moves.push(capture);

    return moves;
  }

  protected getCaptures(tiles: Tile [], direction: number): Array<Position>
  {
    const captures = new Array<Position>();

    const diagL = PositionUtil.getTileAt(tiles, { x: this.position.x - 1, y: this.position.y + (direction * 1) });
    const diagR = PositionUtil.getTileAt(tiles, { x: this.position.x + 1, y: this.position.y + (direction * 1) });
    const enPassantL = PositionUtil.getTileAt(tiles, { x: this.position.x - 1, y: this.position.y });
    const enPassantR = PositionUtil.getTileAt(tiles, { x: this.position.x + 1, y: this.position.y });

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

  protected enPassantAllowed(): boolean
  {
    return this._enPassantAllowed;
  }

  public enPassantNoLongerAllowed()
  {
    this._enPassantAllowed = false;
  }

  public enPassantNowAllowed()
  {
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
