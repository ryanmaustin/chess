import { CdkDragStart, CdkDragEnd, CdkDragMove } from "@angular/cdk/drag-drop";
import { ChangeDetectorRef, Component, NgZone } from "@angular/core";
import { ClientGameEngine } from "../services/client-game-engine.service";
import { ClipboardService } from "../services/clipboard.service";
import { Move } from "../structs/board";
import { Piece, PieceColor, Tile } from "../structs/chess";
import { Position } from "../structs/position";


@Component({
  selector: 'chess-board',
  templateUrl: './chess-board.component.html',
  styleUrls: [ './chess-board.component.css' ]
})
export class ChessBoardComponent
{
  public copied: boolean = false;

  private lastHoveredTile: Position;

  constructor(
    public engine: ClientGameEngine,
    public cb: ClipboardService,
    private cd: ChangeDetectorRef,
    private zone: NgZone
  ) {}


  public chessBoardLengthPx(): string
  {
    return this.chessBoardLength() + 'px !important';
  }

  private chessBoardLength(): number
  {
    if (window.screen.width > 1000)
    {
      return 500;
    }
    return Math.floor(window.screen.width * .98);
  }

  public isAvailableMove(tile: Tile): boolean
  {
    for (const availableMove of this.engine.currentGame.availableMoves)
    {
      if (availableMove.x == tile.getPosition().x && availableMove.y == tile.getPosition().y) return true;
    }
    return false;
  }

  public selectPiece(piece: Piece)
  {
    this.engine.selectPiece(piece);
    this.cd.detectChanges();
  }

  public moveSelectedPiece(pos: Position)
  {
    this.engine.moveSelectedPiece(pos);
  }

  public dragStart(event: CdkDragStart, piece: Piece)
  {
    event.source.element.nativeElement.style.zIndex = '1000002';
    this.selectPiece(piece);
  }

  public dragEnd(event: CdkDragEnd, piece: Piece)
  {
    this.zone.runOutsideAngular(() =>
    {
      event.source.element.nativeElement.style.zIndex = '10000';

      const tile = this.calculateTile(piece, event.distance);
      for (const availableMove of this.engine.currentGame.availableMoves)
      {
        if (availableMove.x == tile.x && availableMove.y == tile.y)
        {
          this.moveSelectedPiece(availableMove);
        }
      }
      event.source._dragRef.reset();
    });
  }

  private calculateTile(piece: Piece, distance: { x: number, y: number }): Position
  {
    const deltaX = Math.round(Math.abs(distance.x / this.getTileWidth()));
    let signX = distance.x > 0 ? 1 : distance.x == 0 ? 0 : -1;
    signX = this.engine.currentGame.board.isFlipped() ? -1 * signX : signX;

    const deltaY = Math.round(Math.abs(distance.y / this.getTileHeight()));
    let signY = distance.y > 0 ? -1 : distance.y == 0 ? 0 : 1;
    signY = this.engine.currentGame.board.isFlipped() ? -1 * signY : signY;

    return <Position> { x: piece.getPosition().x + (signX * deltaX), y: piece.getPosition().y + (signY * deltaY) };
  }

  public drag(event: CdkDragMove, piece: Piece)
  {
    try
    {
      if (this.lastHoveredTile)
      {
        document.getElementById(this.lastHoveredTile.x + "-" + this.lastHoveredTile.y).style.filter = "";
      }
      this.lastHoveredTile = this.calculateTile(piece, event.distance);
      document.getElementById(this.lastHoveredTile.x + "-" + this.lastHoveredTile.y).style.filter = "brightness(90%)";
    }
    catch (e) {}
  }

  public getPosX(position: Position): number
  {
    this.engine.currentGame.scrollHistoryAllTheWayToTheRight();
    const tile = document.getElementById(position.x + '-' + position.y);
    const x = tile.offsetLeft;
    return x;
  }

  public getPosY(position: Position): number
  {
    const tile = document.getElementById(position.x + '-' + position.y);
    const y = tile.offsetTop;
    return y;
  }

  public getTileHeight()
  {
    let firstTile = document.getElementById('1-1');
    if (!firstTile) return 0;
    return firstTile.getBoundingClientRect().height;
  }

  public getTileWidth()
  {
    let firstTile = document.getElementById('1-1');
    if (!firstTile) return 0;
    return firstTile.getBoundingClientRect().width;
  }

  public goToPreviousMove()
  {
    let prevMove = this.engine.currentGame.currentMove - 1;
    if (prevMove > 0) this.goToMove(prevMove);
  }

  public goToNextMove()
  {
    let nextMove = this.engine.currentGame.currentMove + 1;
    if (nextMove < this.engine.currentGame.pastMoves.length) this.goToMove(nextMove);
  }

  public goToBeginning()
  {
    this.goToMove(0);
  }

  public goToEnd()
  {
    this.goToMove(this.engine.currentGame.pastMoves.length - 1);
  }

  public goToMove(move: number | Move)
  {
    this.zone.runOutsideAngular(() =>
    {
      this.engine.currentGame.goToMove(move);
    });
    this.cd.detectChanges();
  }

  public isCurrentMove(move: Move): boolean
  {
    return this.engine.currentGame.currentMove == this.engine.currentGame.pastMoves.indexOf(move);
  }

  public getBlackPieces(): Array<Piece>
  {
    return this.engine.currentGame.board.getPieces(PieceColor.BLACK);
  }

  public getWhitePieces(): Array<Piece>
  {
    return this.engine.currentGame.board.getPieces(PieceColor.WHITE);
  }

  public copyPGNToClipboard()
  {
    this.copied = true;
    this.cb.copy(this.engine.currentGame.getPGN());

    setTimeout(() => { this.copied = false; }, 3000);
  }

  public getNumberOfMovesToShowForCurrentBoard(): number
  {
    let desiredNumberOfMoves = this.chessBoardLength() / 60;
    return desiredNumberOfMoves > 9 ? 9 : Math.ceil(desiredNumberOfMoves);
  }
}
