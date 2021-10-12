import { BehaviorSubject, Subject } from "rxjs";
import { Board, Mate, Move } from "./board";
import { Pgn } from 'cm-pgn';
import { Piece, PieceColor, PieceType, PositionUtil, Tile } from "./chess";
import { PGN, PGNPieceMap, PGNUtil } from "../util/pgn-util";
import { Position } from "./position";
import { Pawn } from "./pieces/pawn";

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
          PGNUtil.convertPgnMoveToGridPosition(move.from[0], move.from[1])
        );

        let promotion = null;
        if (move.flags.includes('p'))
        {
          promotion = PGNPieceMap.toPieceType(move.promotion);
        }

        const destinationTile = PositionUtil.getTileAt(
          this.board.getTiles(),
          PGNUtil.convertPgnMoveToGridPosition(move.to[0], move.to[1])
        );

        const pieceToMove = currentTile.getPiece();

        const boardMove = this.createMove(pieceToMove, destinationTile, promotion);
        this.board.movePiece(boardMove);
        boardMove.checkmate = this.board.isMate(false);

        this.logAndSave(boardMove, false);
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
      this.board.flip();
      console.log(this.board.ranks);
      this.makeComputerMove();
    }
    this.ready = true;
  }

  public makeComputerMove()
  {
    const move = this.getRandomComputerMove(this.opponentColor);
    const pieceToMove = move.movingPiece;

    let movePiece = (promotionChoice) =>
    {
      move.promotionPiece = promotionChoice;
      this.board.movePiece(move);
      move.checkmate = this.board.isMate(false)
      this.logAndSave(move, true);
    }

    this.handlePromotionBeforeMove(pieceToMove.getType(), move.destinationTile, movePiece, this.opponentColor);
    console.log(`Computer moved ${pieceToMove.getType()} to [${move.destinationTile.getPosition().x},${move.destinationTile.getPosition().y}]`);
  }

  /**
   * Generates a Random Computer Move. Note: These are most likely BAD moves.
   */
  private getRandomComputerMove(color: PieceColor): Move
  {
    const availableComputerMoves = new Map<Piece, Array<Position>>();
    const availablePieces = new Array<Piece>();

    for (const piece of this.board.getPieces(this.opponentColor))
    {
      const moves = new Array<Position>();
      for (const move of piece.getAvailableMoves(this.board.tiles)) moves.push(move);
      if (moves.length == 0) continue;

      availableComputerMoves.set(piece, moves);
      availablePieces.push(piece);
    }

    const randomPiece = Game.getRandom(0, availablePieces.length - 1);
    const pieceToMove = availablePieces[randomPiece];
    const randomMove  = Game.getRandom(0, availableComputerMoves.get(pieceToMove).length - 1);

    const moveToMake = availableComputerMoves.get(pieceToMove)[randomMove];

    return this.createMove(pieceToMove, PositionUtil.getTileAt(this.board.getTiles(), moveToMake), null);
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
  }

  /**
   * Initiated by Player
   */
  public moveSelectedPiece(pos: Position)
  {
    this.finished = false; // in case game starts up again
    const tile = PositionUtil.getTileAt(this.board.getTiles(), pos);
    const piece = this.selected;
    const color = this.selected.getColor();

    let movePiece = (promotionChoice) =>
    {
      const move = this.createMove(this.selected, tile, promotionChoice);
      this.board.movePiece(move);

      this.availableMoves = new Array<Position>();
      this.selected = null;

      move.checkmate = this.board.isMate(false)
      if (move.checkmate != null) this.board.switchTurn(color); // Switch board back since there are no more turns
      this.logAndSave(move, true);

      if (this.computerOn && this.isComputerTurn() && move.checkmate == null) this.makeComputerMove();
    }

    this.handlePromotionBeforeMove(piece.getType(), tile, movePiece, color);
  }

  private createMove(pieceToMove: Piece, destinationTile: Tile, promotionPiece: PieceType): Move
  {
    return <Move>
    {
      movingPiece: pieceToMove,
      currentTile: PositionUtil.getTileAt(this.board.getTiles(), pieceToMove.getPosition()),
      destinationTile: destinationTile,
      capturedPiece: destinationTile.getPiece(),
      promotionPiece: promotionPiece
    };
  }

  private logAndSave(move: Move, log: boolean)
  {
    if (log) console.log(`${move.movingPiece.getColor()} ${move.movingPiece.getType()} moved to [${move.destinationTile.getPosition().x}, ${move.destinationTile.getPosition().y}]`);

    const enPassantCapture = this.getEnPassantCapture(move.movingPiece, move.destinationTile);
    if (enPassantCapture) move.capturedPiece = enPassantCapture;

    move.pgn = PGNUtil.toPGN(move, this.board.getTiles());
    this.pastMoves.push(move);
  }

  private getEnPassantCapture(movingPiece: Piece, destinationTile: Tile)
  {
    if (movingPiece.getType() == PieceType.PAWN && destinationTile.getPiece() == null)
    {
      return this.board.handleEnPassant(<Pawn>movingPiece, destinationTile);
    }
    return null;
  }

  private handlePromotionBeforeMove(pieceType: PieceType, tile: Tile, movePiece: Function, currentTurn: PieceColor)
  {
    // Determine if a promotion choice is needed
    if (pieceType == PieceType.PAWN && (tile.getPosition().y == 8 || tile.getPosition().y == 1))
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
