import { ChangeDetectorRef, Component, Inject, OnInit } from '@angular/core';
import { Mate, Move } from './lib/structs/board';
import { Position } from './lib/structs/position';
import { Piece, PieceColor, PieceType, PositionUtil, Tile } from './lib/structs/chess';
import { Subject, Subscription } from 'rxjs';
import { MatDialog, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { CdkDragEnd, CdkDragMove, CdkDragStart } from '@angular/cdk/drag-drop';
import { startCase } from 'lodash';
import { Game } from './lib/structs/game';

const GameOption_PGN = "PGN";
const GameOption_New_Game = "New Game"

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent implements OnInit {
  title = 'Chess';

  public gameOn: boolean = false;
  public pgn: string = '';
  public games = new Array<Game>();
  public currentGame: Game;
  public playerIsWhite: boolean = true;
  public computerOn: boolean = true;
  public gameStartOption: string = GameOption_New_Game;
  public gameStartOptions = [ GameOption_PGN, GameOption_New_Game ];

  private lastHoveredTile: Position;
  private mateSubscription$: Subscription;
  private promotionSubscription: Subscription;

  constructor(public dialog: MatDialog, private cd: ChangeDetectorRef)
  {
    this.games = new Array<Game>();
  }

  public changeGame(index: number)
  {
    this.currentGame = this.games[index];

    if (this.mateSubscription$)
    {
      this.mateSubscription$.unsubscribe();
    }
    this.mateSubscription$ = this.subscribeToCurrentGameMated();

    if (this.promotionSubscription)
    {
      this.promotionSubscription.unsubscribe();
    }
    this.promotionSubscription = this.subscribeToPromotionChoiceNeeded();

    this.playerIsWhite = this.currentGame.getPlayerColor() == PieceColor.WHITE;
  }

  private subscribeToCurrentGameMated(): Subscription
  {
    return this.currentGame.mated().subscribe(
      (mate) => {
        if (mate) {
          this.gameOn = false;
          this.dialog.open(CheckmateDialog, { width: '250px', data: mate });
        }
      }
    );
  }

  private subscribeToPromotionChoiceNeeded(): Subscription
  {
    return this.currentGame.promotionChoiceNeeded$.subscribe(
      (makeMove) =>
      {
        let choice$ = new Subject<PieceType>();
        choice$.subscribe(
          (promotionPiece) =>
          {
            makeMove(promotionPiece);
          }
        );

        this.dialog.open(
          PromotionChoicePrompt,
          { width: '250px', data: { color: this.currentGame.getPlayerColor(), promotionChoice$: choice$ } }
        );
      }
    );
  }

  public ngOnInit()
  {
  }

  public selectPiece(piece: Piece)
  {
    if (!this.currentGame || this.currentGame.isFinished()) return;
    if (piece.getColor() != this.currentGame.board.getTurn()) return;

    this.currentGame.selectPiece(piece);
  }

  public isAvailableMove(tile: Tile): boolean
  {
    for (const availableMove of this.currentGame.availableMoves)
    {
      if (availableMove.x == tile.getPosition().x && availableMove.y == tile.getPosition().y) return true;
    }
    return false;
  }

  public moveSelectedPiece(pos: Position)
  {
    this.currentGame.moveSelectedPiece(pos);
  }

  public changePlayerColor()
  {
    this.playerIsWhite = !this.playerIsWhite;
  }

  public startNewGame()
  {
    this.currentGame = new Game();
    if (this.playerIsWhite) { this.currentGame.asWhite(); }
    else { this.currentGame.asBlack(); }

    this.currentGame.computerOn = this.computerOn;
    this.games.push(this.currentGame);
    this.currentGame.startGame();
    this.changeGame(this.games.length - 1);
    console.warn("Game Started", this.currentGame, this.playerIsWhite);
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
    for (const availableMove of this.currentGame.availableMoves)
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
    const signX = distance.x > 0 ? 1 : distance.x == 0 ? 0 : -1;
    const deltaY = Math.round(Math.abs(distance.y / this.getTileHeight()));
    const signY = distance.y > 0 ? -1 : distance.y == 0 ? 0 : 1;

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
    return this.currentGame.board.getPieces(PieceColor.BLACK);
  }

  public getWhitePieces(): Array<Piece>
  {
    return this.currentGame.board.getPieces(PieceColor.WHITE);
  }

  public getPosX(position: Position): number
  {
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
    this.computerOn = false;
    this.startNewGame();
    this.currentGame.setBoard(this.pgn);
  }

  public pgnGameOptionSelected(): boolean
  {
    return this.gameStartOption == GameOption_PGN;
  }

  public newGameOptionSelected(): boolean
  {
    return this.gameStartOption == GameOption_New_Game;
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
