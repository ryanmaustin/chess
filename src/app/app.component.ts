import { ChangeDetectorRef, Component, HostListener, OnInit } from '@angular/core';
import { Position } from './lib/structs/position';
import { Piece, PieceColor, Tile } from './lib/structs/chess';
import { MatDialog } from '@angular/material/dialog';
import { CdkDragEnd, CdkDragMove, CdkDragStart } from '@angular/cdk/drag-drop';
import { ClientGameEngine } from './lib/services/client-game-engine.service';
import { GameOptionsService, Mode } from './lib/services/game-options.service';
import { $ } from 'protractor';
import { Move } from './lib/structs/board';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent implements OnInit
{
  public title = 'EveryMove';

  public pgn: string = '';

  private lastHoveredTile: Position;

  constructor(
    public dialog: MatDialog,
    private cd: ChangeDetectorRef,
    public engine: ClientGameEngine,
    public gameOptions: GameOptionsService
  )
  {
  }

  public ngOnInit()
  {
  }

  public selectPiece(piece: Piece)
  {
    this.engine.selectPiece(piece);
    this.cd.detectChanges();
    this.cd.markForCheck();
  }

  public isAvailableMove(tile: Tile): boolean
  {
    for (const availableMove of this.engine.currentGame.availableMoves)
    {
      if (availableMove.x == tile.getPosition().x && availableMove.y == tile.getPosition().y) return true;
    }
    return false;
  }

  public moveSelectedPiece(pos: Position)
  {
    this.engine.moveSelectedPiece(pos);
  }

  public startNewGame()
  {
    this.engine.requestNewGame();
    this.cd.detectChanges();
    this.cd.markForCheck();
  }

  public dragStart(event: CdkDragStart, piece: Piece)
  {
    event.source.element.nativeElement.style.zIndex = '1000002';
    this.selectPiece(piece);
  }

  public dragEnd(event: CdkDragEnd, piece: Piece)
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
    if (this.lastHoveredTile)
    {
      document.getElementById(this.lastHoveredTile.x + "-" + this.lastHoveredTile.y).style.filter = "";
    }
    this.lastHoveredTile = this.calculateTile(piece, event.distance);
    document.getElementById(this.lastHoveredTile.x + "-" + this.lastHoveredTile.y).style.filter = "brightness(90%)";
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


  public getBlackPieces(): Array<Piece>
  {
    return this.engine.currentGame.board.getPieces(PieceColor.BLACK);
  }

  public getWhitePieces(): Array<Piece>
  {
    return this.engine.currentGame.board.getPieces(PieceColor.WHITE);
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

  public setBoardFromPgn()
  {
    this.engine.setBoard(this.pgn);
  }

  public studyOptionSelected(): boolean
  {
    return this.gameOptions.currentMode == Mode.STUDY;
  }

  public playOptionSelected(): boolean
  {
    return this.gameOptions.currentMode == Mode.PLAY;
  }

  public chessBoardLengthPx()
  {
    if (window.screen.width > 1000)
    {
      return '500px !important';
    }
    return Math.floor(window.screen.width * .98) + 'px !important';
  }

  @HostListener('window:resize', ['$event'])
  public onWindowResize()
  {
    this.cd.markForCheck();
    this.cd.detectChanges();
  }

  public isCurrentMove(move: Move): boolean
  {
    return this.engine.currentGame.currentMove == this.engine.currentGame.pastMoves.indexOf(move);
  }

  public goToMove(move: Move)
  {
    this.engine.currentGame.goToMove(move);
  }
}
