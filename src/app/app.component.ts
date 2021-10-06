import { Component, Inject, OnInit } from '@angular/core';
import { Board, Mate } from './lib/board/board';
import { Position } from './lib/board/position';
import { Piece, PieceColor, PositionUtil, Tile } from './lib/board/chess';
import { BehaviorSubject, Subject } from 'rxjs';
import { MatDialog, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { CdkDragEnd, CdkDragStart } from '@angular/cdk/drag-drop';
import { startCase } from 'lodash';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent implements OnInit {
  title = 'Chess';

  public selected: Piece;

  protected availableMoves: Array<Position>;

  public board: Board;

  public playAsWhite: boolean = true;

  public computerOn: boolean = true;

  public mate$: BehaviorSubject<Mate>;

  public gameOn: boolean = false;

  private lastMove: Date = new Date();

  constructor(public dialog: MatDialog)
  {
    this.mate$ = new BehaviorSubject<Mate>(null);
    this.board = new Board(this.mate$);
    this.availableMoves = [];
  }

  public ngOnInit()
  {
    this.mate$.subscribe(
      (mate) => {
        if (mate) {
          this.gameOn = false;
          this.dialog.open(CheckmateDialog, { width: '250px', data: mate });
        }
      }
    );
  }

  public selectPiece(piece: Piece)
  {
    if (new Date().getTime() - this.lastMove.getTime() < 500) return;
    if (!this.gameOn) return;
    if (piece.getColor() != this.board.getTurn()) return;
    this.selected = piece;
    this.availableMoves = this.board.prepareToMovePiece(this.selected);
    console.log("Avail", this.availableMoves);
  }

  public isAvailableMove(tile: Tile): boolean
  {
    for (const availableMove of this.availableMoves)
    {
      if (availableMove.x == tile.getPosition().x && availableMove.y == tile.getPosition().y) return true;
    }
    return false;
  }

  public makeMove(tile: Tile) {
    this.lastMove = new Date();

    const moveFinished$ = new Subject<boolean>();
    moveFinished$.subscribe(
      () => {
        if (this.computerOn && this.gameOn && this.isComputerTurn()) {
          this.makeComputerMove();
        }
      }
    );

    this.board.movePiece(this.selected, tile, moveFinished$);
    this.availableMoves = new Array<Position>();
    this.selected = null;

    console.log(moveFinished$);
  }

  private isComputerTurn(): boolean {
    const computerColor = this.playAsWhite ? PieceColor.BLACK : PieceColor.WHITE;
    return this.board.getTurn() == computerColor;
  }


  public makeComputerMove() {
    console.log("Computer is thinking...");
    const availableComputerMoves = new Map<Piece, Array<Position>>();
    const availablePieces = new Array<Piece>();

    const computerColor = this.playAsWhite ? PieceColor.BLACK : PieceColor.WHITE;

    for (const piece of this.board.getPieces(computerColor))
    {
      const moves = new Array<Position>();
      for (const move of piece.getAvailableMoves(this.board.getTiles())) moves.push(move);
      if (moves.length == 0) continue;

      availableComputerMoves.set(piece, moves);
      availablePieces.push(piece);
    }

    const randomPiece = this.getRandom(0, availablePieces.length - 1);
    const pieceToMove = availablePieces[randomPiece];
    const randomMove  = this.getRandom(0, availableComputerMoves.get(pieceToMove).length - 1);

    const moveToMake = availableComputerMoves.get(pieceToMove)[randomMove];
    this.board.movePiece(pieceToMove, PositionUtil.getTileAt(this.board.getTiles(), moveToMake));
    console.log(`Computer moved ${pieceToMove.getType()} to [${moveToMake.x},${moveToMake.y}]`);
  }

  private getRandom(min: number, max: number) {
    min = Math.ceil(min);
    max = Math.floor(max);
    return Math.floor(Math.random() * (max - min) + min); //The maximum is exclusive and the minimum is inclusive
  }

  public changePlayAsColor() {
    this.playAsWhite = !this.playAsWhite;
  }

  public startGame() {
    this.gameOn = true;
    this.board.setup();

    if (this.computerOn && !this.playAsWhite) {
      this.makeComputerMove();
    }
  }

  public dragStart(event: CdkDragStart, piece: Piece) {
    piece.dragging = true;
    event.source.element.nativeElement.style.zIndex = '10002';
    this.selectPiece(piece);
  }

  public dragEnd(event: CdkDragEnd, piece: Piece) {
    event.source.element.nativeElement.style.zIndex = '10000';
    piece.dragging = false;

    const deltaX = Math.round(Math.abs(event.distance.x / this.getTileWidth()));
    const signX = event.distance.x > 0 ? 1 : event.distance.x == 0 ? 0 : -1;
    const deltaY = Math.round(Math.abs(event.distance.y / this.getTileHeight()));
    const signY = event.distance.y > 0 ? -1 : event.distance.y == 0 ? 0 : 1;

    const tile = <Position> { x: piece.getPosition().x + (signX * deltaX), y: piece.getPosition().y + (signY * deltaY) };

    for (const availableMove of this.availableMoves) {
      if (availableMove.x == tile.x && availableMove.y == tile.y) {
        this.makeMove(PositionUtil.getTileAt(this.board.getTiles(), availableMove));
      }
    }

    event.source._dragRef.reset();
  }

  private getTileHeight() {
    return document.getElementById('1-1').getBoundingClientRect().height;
  }

  private getTileWidth() {
    return document.getElementById('1-1').getBoundingClientRect().width;
  }


  public getBlackPieces(): Array<Piece> {
    return this.board.getPieces(PieceColor.BLACK);
  }

  public getWhitePieces(): Array<Piece> {
    return this.board.getPieces(PieceColor.WHITE);
  }

  public getPosX(position: Position): number {
    const board = document.getElementById('board');
    const tile = document.getElementById(position.x + '-' + position.y);
    const x = tile.offsetLeft;
    return x;
  }

  public getPosY(position: Position): number {
    const tile = document.getElementById(position.x + '-' + position.y);
    const y = tile.offsetTop;
    return y;
  }

}

@Component({
  selector: 'mate-dialog',
  template: `

    <div >{{ this.data.checkmate ? "Checkmate! " + this.format(this.data.winner) + " Wins!" : "Stalemate!" }} </div>

  `,
})
export class CheckmateDialog {

  constructor(
    public dialogRef: MatDialogRef<CheckmateDialog>,
    @Inject(MAT_DIALOG_DATA) public data: Mate) {}

  onNoClick(): void {
    this.dialogRef.close();
  }

  public format(str: string): string {
    return startCase(str.toLowerCase());
  }

}
