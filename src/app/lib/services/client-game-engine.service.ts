import { Injectable } from "@angular/core";
import { MatDialog } from "@angular/material/dialog";
import { Subject, Subscription } from "rxjs";
import { GameRequest, SAN } from "../structs/api";
import { Board } from "../structs/board";
import { PieceColor, PieceType, Piece, PositionUtil } from "../structs/chess";
import { Game } from "../structs/game";
import { Position } from "../structs/position";
import { PGNMoveMap } from "../util/pgn-util";
import { CheckmateDialog } from "./checkmate-dialog.component";
import { GameOptionsService } from "./game-options.service";
import { GameService } from "./game.service";
import { PromotionChoicePrompt } from "./promotion-choice-prompt.component";

@Injectable({ providedIn: 'root' })
export class ClientGameEngine
{
  public games = new Array<Game>();
  public gameOn: boolean = false;
  public currentGame: Game;

  private mateSubscription$: Subscription;
  private promotionSubscription: Subscription;
  private promotionChoiceNeeded$: Subject<Function>;

  constructor(
    public dialog: MatDialog,
    private gameService: GameService,
    private gameOptions: GameOptionsService
  )
  {
    this.promotionChoiceNeeded$ = new Subject<Function>();
    this.games = new Array<Game>();
    this.initBlankBoard();
    this.subscribeToGameServiceMoves();
  }

  private initBlankBoard()
  {
    this.currentGame = new Game();
    this.currentGame.startGame();
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
  }

  private subscribeToGameServiceMoves()
  {
    this.gameService.moves$.subscribe(
      (move) =>
      {
        for (const game of this.games)
        {
          if (game.gameId == move.gameId)
          {
            console.warn("Recieved Move From Opponent! Updating board...", move);
            let promotionChoice = null;
            if (move.promotionChoice != null)
            {
              promotionChoice = <PieceType> (move.promotionChoice.split("_")[1]);
            }
            game.selected = PositionUtil.getTileAt(game.board.tiles, PGNMoveMap.map(move.from)).getPiece();
            game.moveSelectedPiece(PGNMoveMap.map(move.to), promotionChoice);
          }
        }
      }
    );
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
    return this.promotionChoiceNeeded$.subscribe(
      (makeMove) =>
      {
        let choice$ = new Subject<PieceType>();
        choice$.subscribe(
          (promotionPiece) =>
          {
            makeMove(Board.create(promotionPiece, this.currentGame.selected.getColor()));
          }
        );

        this.dialog.open(
          PromotionChoicePrompt,
          { width: '250px', data: { color: this.currentGame.getPlayerColor(), promotionChoice$: choice$ } }
        );
      }
    );
  }

  public selectPiece(piece: Piece)
  {
    if (!this.currentGame || this.currentGame.isFinished()) return;
    if (piece.getColor() != this.currentGame.board.getTurn()) return;

    this.currentGame.selectPiece(piece);
  }

  public requestNewGame()
  {
    const options = this.gameOptions.getOptions();
    const playerColor = options.playerColor;
    this.gameService.requestGame(options.againstComputer, playerColor, null, options.rating).subscribe(
      (challenge) =>
      {
        this.newGame(this.getPlayerColor(challenge));
        this.currentGame.gameId = challenge.gameId;

        if (this.currentGame.getPlayerColor() == PieceColor.BLACK)
        {
          this.currentGame.board.flip();
        }

        console.warn("Game Started", this.currentGame);
      }
    );
  }

  private getPlayerColor(gameRequest: GameRequest): PieceColor
  {
    const challengerColor = <PieceColor> (gameRequest.challengerPlaysAs);

    // If I am the challenger
    if (this.gameService.getPlayerId() == gameRequest.challengerPlayerId) // player chooses
    {
      console.warn("I am the challenger and my color is ", challengerColor);
      return challengerColor;
    }
    console.warn("I accepted the challenge and my color is not ", challengerColor);
    // I am not the challenger
    return challengerColor == PieceColor.BLACK ? PieceColor.WHITE : PieceColor.BLACK;
  }

  public setBoard(pgn: string)
  {
    this.newGame(PieceColor.WHITE);
    this.currentGame.setBoard(pgn);
  }

  private newGame(playerColor: PieceColor)
  {
    this.currentGame = new Game();
    this.games.push(this.currentGame);
    this.currentGame.startGame();
    this.changeGame(this.games.length - 1);
    this.currentGame.setPlayerColor(playerColor);
    this.gameOptions.hideOptions();
  }

  public moveSelectedPiece(pos: Position)
  {
    const movePiece = (promotionChoice: Piece) =>
    {
      const from = this.currentGame.selected.getPosition();
      const to = pos;
      this.currentGame.moveSelectedPiece(pos, promotionChoice ? promotionChoice.getType() : null);
      this.gameService.makeMove(this.currentGame.gameId, new SAN(from), new SAN(to), promotionChoice);
    }

    // first, determine if a promotion choice is needed
    if (this.promotionChoiceNeeded(this.currentGame.selected, pos))
    {
      this.promotionChoiceNeeded$.next(movePiece);
    }
    else
    {
      movePiece(null); // no choice needed
    }
  }

  private promotionChoiceNeeded(piece: Piece, to: Position): boolean
  {
    return piece.getType() == PieceType.PAWN && (to.y == 8 || to.y == 1);
  }
}
