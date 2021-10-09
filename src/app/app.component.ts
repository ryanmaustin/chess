import { Component, Inject, OnInit } from '@angular/core';
import { Board, Mate, Move, PGN, PGNPieceMap } from './lib/board/board';
import { Position } from './lib/board/position';
import { Piece, PieceColor, PieceType, PositionUtil, Tile } from './lib/board/chess';
import { BehaviorSubject, Subject } from 'rxjs';
import { MatDialog, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { CdkDragEnd, CdkDragMove, CdkDragStart } from '@angular/cdk/drag-drop';
import { startCase } from 'lodash';
import { Pgn } from 'cm-pgn';

const ChessNotationMap = {
  a: 1,
  b: 2,
  c: 3,
  d: 4,
  e: 5,
  f: 6,
  g: 7,
  h: 8
}

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent implements OnInit {
  title = 'Chess';

  public selected: Piece;

  public board: Board;

  public playAsWhite: boolean = true;

  public computerOn: boolean = true;

  public mate$: BehaviorSubject<Mate>;

  public gameOn: boolean = false;

  public pgn: string = '';

  public games = new Array<Array<Move>>();

  public currentGame: number = -1;

  private availableMoves: Array<Position>;

  private lastHoveredTile: Position;

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
    if (!this.gameOn) return;
    if (piece.getColor() != this.board.getTurn()) return;
    this.selected = piece;
    this.availableMoves = this.board.prepareToMovePiece(this.selected);
  }

  public isAvailableMove(tile: Tile): boolean
  {
    for (const availableMove of this.availableMoves)
    {
      if (availableMove.x == tile.getPosition().x && availableMove.y == tile.getPosition().y) return true;
    }
    return false;
  }

  public makeMove(pos: Position) {
    const tile = PositionUtil.getTileAt(this.board.getTiles(), pos);

    const moveFinished$ = new Subject<Move>();
    moveFinished$.subscribe(
      (move) => {
        this.games[this.currentGame].push(move);

        if (this.computerOn && this.gameOn && this.isComputerTurn()) {
          this.makeComputerMove();
        }
      }
    );

    const promotionChoice$ = new Subject<PieceType>();
    promotionChoice$.subscribe(
      (choice) => {
        this.board.movePiece(this.selected, tile, moveFinished$, choice);
        this.availableMoves = new Array<Position>();
        this.selected = null;
      }
    );
    this.handlePromotionBeforeMove(tile, promotionChoice$);
  }

  private handlePromotionBeforeMove(tile: Tile, promotionChoice$: Subject<PieceType>) {

    if (this.selected.getType() == PieceType.PAWN && tile.getPosition().y == 8) {
      this.dialog.open(PromotionChoicePrompt, { width: '250px', data: { color: this.selected.getColor(), promotionChoice$: promotionChoice$ } });
      return;
    }
    promotionChoice$.next(null);
  }

  private isComputerTurn(): boolean {
    const computerColor = this.playAsWhite ? PieceColor.BLACK : PieceColor.WHITE;
    return this.board.getTurn() == computerColor;
  }


  public makeComputerMove() {
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

    const computerMove$ = new Subject<Move>();
    computerMove$.subscribe(
      (move) => { this.games[this.currentGame].push(move); }
    );

    this.board.movePiece(pieceToMove, PositionUtil.getTileAt(this.board.getTiles(), moveToMake), computerMove$, PieceType.QUEEN);
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
    this.games.push(new Array<Move>());
    this.currentGame++;
    this.gameOn = true;
    this.board.setup();
    this.availableMoves = [];
    this.selected = null;

    if (this.computerOn && !this.playAsWhite) {
      this.makeComputerMove();
    }
  }

  public dragStart(event: CdkDragStart, piece: Piece) {
    console.warn("Drag started for", piece.getColor(), piece.getType())
    event.source.element.nativeElement.style.zIndex = '10002';
    this.selectPiece(piece);
  }

  public dragEnd(event: CdkDragEnd, piece: Piece) {
    event.source.element.nativeElement.style.zIndex = '10000';

    const tile = this.calculateTile(piece, event.distance);
    for (const availableMove of this.availableMoves) {
      if (availableMove.x == tile.x && availableMove.y == tile.y) {
        this.makeMove(availableMove);
      }
    }
    event.source._dragRef.reset();
  }

  private calculateTile(piece: Piece, distance: { x: number, y: number }): Position {
    const deltaX = Math.round(Math.abs(distance.x / this.getTileWidth()));
    const signX = distance.x > 0 ? 1 : distance.x == 0 ? 0 : -1;
    const deltaY = Math.round(Math.abs(distance.y / this.getTileHeight()));
    const signY = distance.y > 0 ? -1 : distance.y == 0 ? 0 : 1;

    return <Position> { x: piece.getPosition().x + (signX * deltaX), y: piece.getPosition().y + (signY * deltaY) };
  }

  public drag(event: CdkDragMove, piece: Piece) {
    if (this.lastHoveredTile) {
      document.getElementById(this.lastHoveredTile.x + "-" + this.lastHoveredTile.y).style.filter = "";
    }
    this.lastHoveredTile = this.calculateTile(piece, event.distance);
    document.getElementById(this.lastHoveredTile.x + "-" + this.lastHoveredTile.y).style.filter = "brightness(90%)";
  }

  public getTileHeight() {
    return document.getElementById('1-1').getBoundingClientRect().height;
  }

  public getTileWidth() {
    return document.getElementById('1-1').getBoundingClientRect().width;
  }


  public getBlackPieces(): Array<Piece> {
    return this.board.getPieces(PieceColor.BLACK);
  }

  public getWhitePieces(): Array<Piece> {
    return this.board.getPieces(PieceColor.WHITE);
  }

  public getPosX(position: Position): number {
    const tile = document.getElementById(position.x + '-' + position.y);
    const x = tile.offsetLeft;
    return x;
  }

  public getPosY(position: Position): number {
    const tile = document.getElementById(position.x + '-' + position.y);
    const y = tile.offsetTop;
    return y;
  }

  /**
   *
   * 1. d4 Nc6 2. e4 d6 3. d5 Nf6 4. dxc6 e5 5. cxb7 Bxb7 6. f3 d5 7. Bd3 Bd6 8. Ne2
c5 9. Bb5+ Nd7 10. exd5 a6 11. Bc4 Qh4+ 12. g3 Qxc4 13. Nbc3 Qb4 14. a3 Qa5 15.
Be3 O-O 16. Qd2 Nf6 17. O-O-O Rab8 18. f4 Bxd5 19. Nxd5 Qb5 20. Nxf6+ gxf6 21.
Qxd6 Qxb2+ 22. Kd2 Rfd8 23. Bxc5 Rxd6+ 24. Bxd6 Rd8 25. Ke3 Qxc2 26. Rd2 Qb3+
27. Rd3 Qb6+ 28. Kf3 Qc6+ 29. Ke3 Qxh1 30. fxe5 fxe5 31. Bxe5 Re8 32. Kf4 Qf1+
0-1
   *
   *
   */

  public setBoardFromInsertedMoves() {

    const parsedPgn = <PGN> new Pgn(this.pgn);
    this.games.push(new Array<Move>());
    this.currentGame = this.games.length - 1;

    try
    {
      this.computerOn = false;
      this.startGame();

      for (const move of parsedPgn.history.moves) {

        const currentTile = PositionUtil.getTileAt(
          this.board.getTiles(),
          this.convertPgnMoveToGridPosition(move.from[0], move.from[1], move.color)
        );

        const moveFinished$ = new Subject<Move>();
        moveFinished$.subscribe(
          (move) => {
            this.getCurrentGame().push(move);
          }
        );

        let promotion = null;
        if (move.flags.includes('p')) {
          promotion =  PGNPieceMap.toPieceType(move.promotion);
        }
        this.board.movePiece(
          currentTile.getPiece(),
          PositionUtil.getTileAt(
            this.board.getTiles(),
            this.convertPgnMoveToGridPosition(move.to[0], move.to[1], move.color)
          ),
          moveFinished$,
          promotion
        );
      }
    }
    catch (error) {
      console.error("Unable to parse game", error);
    }
  }

  private convertPgnMoveToGridPosition(x: string, y: string, color: 'w' | 'b'): Position {

    if (color == 'w') {
      return { x: Number(ChessNotationMap[x]), y: Number(y) };
    }
    else {
      return { x: Math.abs(ChessNotationMap[x] - 9), y: Math.abs(Number(y) - 9) };
    }
  }

  public getCurrentGame(): Array<Move> {

    if (this.games && this.games.length > this.currentGame) {
      return this.games[this.currentGame];
    }
    return [];
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

@Component({
  selector: 'mate-dialog',
  template: `

    <div class="d-flex flex-row justify-content">
      <div (click)="this.choosePromotionPiece('QUEEN')"><img class="promotion-choice flex-grow-1" [src]="'assets/' + this.colorSymbol() + '-q.png'"></div>
      <div (click)="this.choosePromotionPiece('KNIGHT')"><img class="promotion-choice flex-grow-1" [src]="'assets/' + this.colorSymbol() + '-n.png'"></div>
      <div (click)="this.choosePromotionPiece('ROOK')"><img class="promotion-choice flex-grow-1" [src]="'assets/' + this.colorSymbol() + '-r.png'"></div>
      <div (click)="this.choosePromotionPiece('BISHOP')"><img class="promotion-choice flex-grow-1" [src]="'assets/' + this.colorSymbol() + '-b.png'"></div>
    </div>

  `,
  styles: [`

    .promotion-choice {
      max-height: 3rem;
      cursor: pointer;
    }

    .promotion-choice:hover {
      filter: drop-shadow(1px 1px 1px rgb(53, 53, 53, 0.8));
    }

  `]
})
export class PromotionChoicePrompt {

  public color: PieceColor;
  public promotionChoice$: Subject<PieceType>;

  constructor(
    public dialogRef: MatDialogRef<PromotionChoicePrompt>,
    @Inject(MAT_DIALOG_DATA) public data: { color: PieceColor, promotionChoice$: Subject<PieceType> }
  ) {
    this.color = data.color;
    this.promotionChoice$ = data.promotionChoice$;
  }

  public choosePromotionPiece(type: string | PieceType) {
    this.promotionChoice$.next(<PieceType>type);
    this.dialogRef.close();
  }

  public colorSymbol(): string {
    return this.color.toLowerCase().charAt(0);
  }
}
