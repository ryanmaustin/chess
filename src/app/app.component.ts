import { Component, Inject, OnInit } from '@angular/core';
import { Board } from './lib/board/board';
import { Position } from './lib/board/position';
import { Tile } from './lib/board/tile';
import { Piece, PieceColor } from './lib/pieces/piece';
import { PositionUtil } from './lib/board/position-util';
import { BehaviorSubject, Subject } from 'rxjs';
import { MatDialog, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';

export interface Checkmate {
  winner: PieceColor
}

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

  public checkmate$: BehaviorSubject<Checkmate>;

  public gameOn: boolean = false;

  constructor(public dialog: MatDialog)
  {
    this.checkmate$ = new BehaviorSubject<Checkmate>(null);
    this.board = new Board(this.checkmate$);
    this.availableMoves = [];
  }

  public ngOnInit()
  {
    this.checkmate$.subscribe(
      (checkmate) => {
        if (checkmate) {
          this.gameOn = false;
          this.dialog.open(CheckmateDialog, { width: '250px', data: checkmate });
        }
      }
    );
  }

  public selectPiece(piece: Piece)
  {
    if (!this.gameOn) return;
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
}


@Component({
  selector: 'checkmate-dialog',
  template: `

    <div>Checkmate! {{ this.data.winner }} Wins!</div>

  `,
})
export class CheckmateDialog {

  constructor(
    public dialogRef: MatDialogRef<CheckmateDialog>,
    @Inject(MAT_DIALOG_DATA) public data: Checkmate) {}

  onNoClick(): void {
    this.dialogRef.close();
  }

}
