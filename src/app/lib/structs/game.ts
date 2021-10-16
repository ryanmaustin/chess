import { BehaviorSubject, Subject } from "rxjs";
import { Board, Mate, Move } from "./board";
import { Pgn } from 'cm-pgn';
import { Piece, PieceColor, PieceType, PositionUtil, Tile } from "./chess";
import { PGN, PGNPieceMap, PGNUtil } from "../util/pgn-util";
import { Position } from "./position";
import { Pawn } from "./pieces/pawn";
import { Queen } from "./pieces/queen";

export class Game
{
  public board: Board;

  public selected: Piece;
  public pastMoves: Array<Move>;
  public currentMove: number = 0;
  public availableMoves: Array<Position>;
  public computerOn: Boolean = false;
  public gameId: string;

  private mate$: BehaviorSubject<Mate>;
  private playerColor: PieceColor = PieceColor.WHITE;
  private opponentColor: PieceColor = PieceColor.BLACK;
  private ready: boolean = false;
  private finished: boolean = false;
  private promotionPiece: Piece;

  constructor()
  {
    this.mate$ = new BehaviorSubject<Mate>(null);
    this.pastMoves = new Array<Move>();
    this.board = new Board(this.mate$);
    this.availableMoves = [];

    this.mate$.subscribe(
      (mate) => { if(mate != null) this.finished = true; }
    );
  }

  public setPlayerColor(color: PieceColor)
  {
    this.playerColor = color;
    this.opponentColor = this.playerColor == PieceColor.WHITE ? PieceColor.BLACK : PieceColor.WHITE;
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
        this.board.goToMove(boardMove);

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
    this.ready = true;
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
  public moveSelectedPiece(pos: Position, promotionChoice ?: PieceType)
  {
    this.finished = false; // in case game starts up again
    const tile = PositionUtil.getTileAt(this.board.getTiles(), pos);
    const color = this.selected.getColor();

    const move = this.createMove(this.selected, tile, promotionChoice);
    this.board.movePiece(move);

    this.availableMoves = new Array<Position>();
    this.selected = null;

    move.checkmate = this.board.isMate(false)
    if (move.checkmate != null) this.board.switchTurn(color); // Switch board back since there are no more turns
    this.logAndSave(move, true);
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
    this.updateHistory(move);
  }

  private updateHistory(move: Move)
  {
    this.pastMoves.push(move);
    this.currentMove = this.pastMoves.length - 1;
    // this.scrollHistoryAllTheWayToTheRight();
  }

  public scrollHistoryAllTheWayToTheRight()
  {
    const moveHistory = document.getElementById('moveHistory');
    moveHistory.scrollLeft += 100000;
  }

  private getEnPassantCapture(movingPiece: Piece, destinationTile: Tile)
  {
    if (movingPiece.getType() == PieceType.PAWN && destinationTile.getPiece() == null)
    {
      return this.board.handleEnPassant(<Pawn>movingPiece, destinationTile);
    }
    return null;
  }

  public isReady(): boolean
  {
    return this.ready;
  }

  public isFinished(): boolean
  {
    return this.finished;
  }

  public getPromotionPiece()
  {
    return this.promotionPiece;
  }

  public goToMove(move: Move)
  {
    this.currentMove = this.pastMoves.indexOf(move);
    this.board.goToMove(move);
  }
}
