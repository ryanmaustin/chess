import { BehaviorSubject, Subject } from "rxjs";
import { Board, Mate, Move } from "./board";
import { Pgn } from 'cm-pgn';
import { Piece, PieceColor, PieceType, PositionUtil, Tile } from "./chess";
import { PGN, PGNPieceMap, PGNUtil } from "../util/pgn-util";
import { Position } from "./position";

export class Game
{

  public board: Board;

  public selected: Piece;
  public pastMoves: Array<Move>;
  public availableMoves: Array<Position>;
  public computerOn: Boolean = false;
  public promotionChoiceNeeded$: Subject<Function>;

  private mate$: BehaviorSubject<Mate>;
  private playerColor: PieceColor = PieceColor.WHITE;
  private opponentColor: PieceColor = PieceColor.BLACK;
  private ready: boolean = false;
  private finished: boolean = false;

  constructor()
  {
    this.mate$ = new BehaviorSubject<Mate>(null);
    this.promotionChoiceNeeded$ = new Subject<Function>();
    this.pastMoves = new Array<Move>();
    this.board = new Board(this.mate$);
    this.availableMoves = [];

    this.mate$.subscribe(
      (mate) => { if(mate != null) this.finished = true; }
    );

  }

  public getPlayerColor(): PieceColor
  {
    return this.playerColor;
  }

  public asWhite(): Game
  {
    this.playerColor = PieceColor.WHITE;
    this.opponentColor = PieceColor.BLACK;
    return this;
  }

  public asBlack(): Game
  {
    this.opponentColor = PieceColor.WHITE;
    this.playerColor = PieceColor.BLACK;
    return this;
  }

  public againstComputer(): Game
  {
    this.computerOn = true;
    return this;
  }

  public setBoard(pgn: string) {

    const parsedPgn = <PGN> new Pgn(pgn);

    try
    {
      this.computerOn = false;
      this.startGame();

      for (const move of parsedPgn.history.moves)
      {
        const currentTile = PositionUtil.getTileAt(
          this.board.getTiles(),
          PGNUtil.convertPgnMoveToGridPosition(move.from[0], move.from[1], move.color)
        );

        const moveFinished$ = new Subject<Move>();
        moveFinished$.subscribe(
          (move) =>
          {
            this.pastMoves.push(move);
          }
        );

        let promotion = null;
        if (move.flags.includes('p'))
        {
          promotion =  PGNPieceMap.toPieceType(move.promotion);
        }
        this.board.movePiece(
          currentTile.getPiece(),
          PositionUtil.getTileAt(
            this.board.getTiles(),
            PGNUtil.convertPgnMoveToGridPosition(move.to[0], move.to[1], move.color)
          ),
          moveFinished$,
          promotion
        );
      }
    }
    catch (error)
    {
      console.error("Unable to parse game", error);
    }
  }

  public startGame()
  {
    this.board.setup();
    this.availableMoves = [];
    this.selected = null;

    if (this.computerOn && this.playerColor == PieceColor.BLACK)
    {
      this.makeComputerMove();
    }
    else
    {
      this.ready = true;
    }
  }

  public makeComputerMove()
  {
    const availableComputerMoves = new Map<Piece, Array<Position>>();
    const availablePieces = new Array<Piece>();

    for (const piece of this.board.getPieces(this.opponentColor))
    {
      const moves = new Array<Position>();
      for (const move of piece.getAvailableMoves(this.board.getTiles())) moves.push(move);
      if (moves.length == 0) continue;

      availableComputerMoves.set(piece, moves);
      availablePieces.push(piece);
    }

    const randomPiece = Game.getRandom(0, availablePieces.length - 1);
    const pieceToMove = availablePieces[randomPiece];
    const randomMove  = Game.getRandom(0, availableComputerMoves.get(pieceToMove).length - 1);

    const moveToMake = availableComputerMoves.get(pieceToMove)[randomMove];

    const computerMove$ = new Subject<Move>();
    computerMove$.subscribe(
      (move) => {
        this.pastMoves.push(move);
        if (!this.ready) this.ready = true;
      }
    );

    this.board.movePiece(pieceToMove, PositionUtil.getTileAt(this.board.getTiles(), moveToMake), computerMove$, PieceType.QUEEN);
    console.log(`Computer moved ${pieceToMove.getType()} to [${moveToMake.x},${moveToMake.y}]`);
  }

  private static getRandom(min: number, max: number) {
    min = Math.ceil(min);
    max = Math.floor(max);
    return Math.floor(Math.random() * (max - min) + min); //The maximum is exclusive and the minimum is inclusive
  }

  public mated(): BehaviorSubject<Mate>
  {
    return this.mate$;
  }

  /**
   * When a Piece is selected, check the board for available moves
   */
  public selectPiece(piece: Piece)
  {
    this.selected = piece;
    this.availableMoves = this.board.getAvailableMoves(piece);
    console.warn("Piece selected:", piece);
  }

  public makeMove(pos: Position)
  {
    this.finished = false; // in case game starts up again
    const currentTurn = this.board.getTurn();
    const tile = PositionUtil.getTileAt(this.board.getTiles(), pos);

    const moveFinished$ = new Subject<Move>();
    moveFinished$.subscribe(
      (move) =>
      {
        this.pastMoves.push(move);

        if (this.computerOn && this.isComputerTurn() && !move.gameover)
        {
          this.makeComputerMove();
        }
      }
    );

    let movePiece = (promotionChoice) =>
    {
      console.log("Prior to move", this.selected, tile, moveFinished$, promotionChoice);
      this.board.movePiece(this.selected, tile, moveFinished$, promotionChoice);
      this.availableMoves = new Array<Position>();
      this.selected = null;
    }

    this.handlePromotionBeforeMove(tile, movePiece, currentTurn);
  }

  private handlePromotionBeforeMove(tile: Tile, movePiece: Function, currentTurn: PieceColor)
  {
    // Determine if a promotion choice is needed
    if (this.selected.getType() == PieceType.PAWN && tile.getPosition().y == 8)
    {
      if (this.computerOn && currentTurn == this.opponentColor)
      {
        movePiece(PieceType.QUEEN);
      }
      else
      {
        this.promotionChoiceNeeded$.next(movePiece);
      }
      return;
    }
    else
    {
      movePiece(null); // Move piece without promotion choice since it's not needed
    }
  }

  private isComputerTurn(): boolean
  {
    return this.board.getTurn() == this.opponentColor;
  }

  public isReady(): boolean
  {
    return this.ready;
  }

  public isFinished(): boolean
  {
    return this.finished;
  }
}
