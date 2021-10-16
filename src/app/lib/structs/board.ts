import { Pawn } from "./pieces/pawn";
import { Rank } from "./rank";
import { Piece, PieceColor, PieceType, PositionUtil, Tile } from "./chess";
import { Rook } from "./pieces/rook";
import { Knight } from "./pieces/knight";
import { Bishop } from "./pieces/bishop";
import { Queen } from "./pieces/queen";
import { King } from "./pieces/king";
import { Position } from "./position";
import { BehaviorSubject } from "rxjs";

export interface Move
{
  movingPiece: Piece,
  capturedPiece: Piece,
  currentTile: Tile,
  destinationTile: Tile,
  boardSnapshot: BoardSnapshot,
  promotionPiece ?: PieceType,
  pgn ?: string,
  checkmate ?: boolean
}

export interface BoardSnapshot
{
  tiles: Array<Tile>,
  whitePieces: Array<Piece>,
  blackPieces: Array<Piece>,
  turn: PieceColor,
  flipped: boolean
}

export interface EnPassant
{
  available: boolean,
  color: PieceColor,
  turns: number
}

export class Board {

  public ranks: Array<Rank>;

  public tiles: Array<Tile>;
  public turn: PieceColor = PieceColor.WHITE;

  private flipped: boolean = false;

  private whitePieces: Array<Piece>;
  private blackPieces: Array<Piece>;
  private whiteEnPassantAvailable: BehaviorSubject<EnPassant> = new BehaviorSubject<EnPassant>(null);
  private blackEnPassantAvailable: BehaviorSubject<EnPassant> = new BehaviorSubject<EnPassant>(null);

  private whiteEnPassant: EnPassant;
  private blackEnPassant: EnPassant;

  constructor(private mate$: BehaviorSubject<Mate>)
  {
    this.initTiles();

    this.subscribeToEnPassant(this.whiteEnPassantAvailable);
    this.subscribeToEnPassant(this.blackEnPassantAvailable);
  }

  private subscribeToEnPassant(enPassant: BehaviorSubject<EnPassant>)
  {
    enPassant.subscribe(
      (enPassant) =>
      {
        if (!enPassant) return;
        if (enPassant.color == PieceColor.BLACK)
        {
          this.blackEnPassant = enPassant;
        }
        else
        {
          this.whiteEnPassant = enPassant;
        }
        for (const p of this.getPieces(enPassant.color))
        {
          if (p instanceof Pawn)
          {
            if (!enPassant.available)
            {
              p.enPassantNoLongerAllowed();
            }
          }
        }
      }
    )
  }

  public initTiles()
  {
    this.tiles = new Array<Tile>();
    for (let y = 8; y >= 1; y--)
    {
      for (let x = 1; x <= 8; x++)
      {
        this.tiles.push(new Tile(<Position>{ x: x, y: y }));
      }
    }
  }

  public setup()
  {
    this.initTiles();

    this.whitePieces = new Array<Piece>();
    this.blackPieces = new Array<Piece>();

    // Top player pawns
    for (let i = 8; i < 16; i++)
    {
      this.tiles[i].setPiece(new Pawn(PieceColor.BLACK));

    }
    this.tiles[0].setPiece(new Rook(PieceColor.BLACK));
    this.tiles[1].setPiece(new Knight(PieceColor.BLACK));
    this.tiles[2].setPiece(new Bishop(PieceColor.BLACK));
    this.tiles[3].setPiece(new Queen(PieceColor.BLACK));
    this.tiles[4].setPiece(new King(PieceColor.BLACK));
    this.tiles[5].setPiece(new Bishop(PieceColor.BLACK));
    this.tiles[6].setPiece(new Knight(PieceColor.BLACK));
    this.tiles[7].setPiece(new Rook(PieceColor.BLACK));
    for (let i = 0; i < 16; i++) this.blackPieces.push(this.tiles[i].getPiece());

    // Bottom player pawns
    for (let i = 48; i < 56; i++)
    {
      this.tiles[i].setPiece(new Pawn(PieceColor.WHITE));
    }
    this.tiles[56].setPiece(new Rook(PieceColor.WHITE));
    this.tiles[57].setPiece(new Knight(PieceColor.WHITE));
    this.tiles[58].setPiece(new Bishop(PieceColor.WHITE));
    this.tiles[59].setPiece(new Queen(PieceColor.WHITE));
    this.tiles[60].setPiece(new King(PieceColor.WHITE));
    this.tiles[61].setPiece(new Bishop(PieceColor.WHITE));
    this.tiles[62].setPiece(new Knight(PieceColor.WHITE));
    this.tiles[63].setPiece(new Rook(PieceColor.WHITE));
    for (let i = 63; i >= 48; i--) this.whitePieces.push(this.tiles[i].getPiece());

    this.turn = PieceColor.WHITE;
    this.initRanks();
  }

  public initRanks()
  {
    this.ranks = new Array<Rank>();
    for (let i = 0; i < 8; i++)
    {
      this.ranks[i] = this.tiles.slice(i*8, (i*8)+8);
    }
  }

  public getTiles(): Array<Tile>
  {
    return this.tiles;
  }

  public getAvailableMoves(piece: Piece): Array<Position>
  {
    if (piece.getColor() != this.turn) return []; // not this color's turn
    return piece.getAvailableMoves(this.tiles);
  }

  /**
   * Moves the given piece to the given tile.
   *
   * Additionally, a promotion choice should provided in the case that this move would require one.
   */
  public movePiece(move: Move)
  {
    this.disallowEnPassant();
    this.handleIfPawn(move, move.promotionPiece);
    this.handleIfKing(move);
    this.movePieceToTile(move);
    this.capturePiece(move);
    this.switchTurn(move.movingPiece.getColor());
    this.isMate(true);
    move.boardSnapshot = this.takeBoardSnapshot();
  }

  public takeBoardSnapshot(): BoardSnapshot
  {
    const tiles = PositionUtil.cloneBoard(this.tiles);
    const whitePieces = new Array<Piece>();
    const blackPieces = new Array<Piece>();
    for (const p of this.whitePieces) whitePieces.push(p.getClone());
    for (const p of this.blackPieces) blackPieces.push(p.getClone());
    const turn = <PieceColor>(this.turn.toString());

    return <BoardSnapshot>
    {
      tiles: tiles,
      whitePieces: whitePieces,
      blackPieces: blackPieces,
      turn: turn,
      flipped: this.flipped
    }
  }

  private movePieceToTile(move: Move)
  {
    move.currentTile.setPiece(null);
    // When pawn promotes, the handleIfPawn method will put the promotion piece on the destination tile
    if (!move.movingPiece.isCaptured()) move.destinationTile.setPiece(move.movingPiece);
    move.movingPiece.moved();
  }

  private capturePiece(move: Move)
  {
    // Capture piece if any, then set tile
    if (move.capturedPiece)
    {
      console.warn(
        `${move.capturedPiece.getColor()} ${move.capturedPiece.getType()} was captured by ` +
        `${move.movingPiece.getColor()} ${move.movingPiece.getType()} on ` +
        `[${move.destinationTile.getPosition().x}, ${move.destinationTile.getPosition().y}]`
      );
      move.capturedPiece.captured();
    }
  }

  /**
   * If the piece being moved is a pawn, this method handles both En Passant and Promotion
   * if applicable.
   */
  private handleIfPawn(move: Move, promotionChoice: PieceType)
  {
    if (move.movingPiece.getType() != PieceType.PAWN) return;

    const pawn = <Pawn> move.movingPiece;
    let enPassantAvailable = this.turn == PieceColor.WHITE ? this.blackEnPassantAvailable : this.whiteEnPassantAvailable;
    pawn.pawnMoved(move.currentTile.getPosition(), move.destinationTile.getPosition(), enPassantAvailable);
    const promotion = this.handlePawnPromotion(pawn, move.destinationTile, promotionChoice);
    if (promotion) move.destinationTile.setPiece(promotion);

    const capturedPawn = this.handleEnPassant(pawn, move.destinationTile);
    if (capturedPawn) move.capturedPiece = capturedPawn;
  }

  /**
   * If the Pawn is being promoted, handle it here.
   */
  private handlePawnPromotion(pawn: Pawn, tile: Tile, promotionChoice: PieceType): Piece
  {
    if (tile.getPosition().y != 8 && tile.getPosition().y != 1) return null;

    pawn.captured(); // take off baord
    const promotedPiece = Board.create(promotionChoice, pawn.getColor());
    promotedPiece.setPosition(tile.getPosition());
    if (pawn.getColor() == PieceColor.BLACK) { this.blackPieces.push(promotedPiece); }
    else { this.whitePieces.push(promotedPiece); }
    return promotedPiece;
  }

  /**
   * Handles En Passant, returning the captured pawn or null if there was none
   */
  public handleEnPassant(pawn: Pawn, tile: Tile): Piece
  {
    // If there is a piece in this tile then there is no en passant capture
    if (tile.getPiece() != null) return null;

    if (Math.abs(tile.getPosition().y - pawn.getPosition().y) == 1)
    {
      const sign =
        (tile.getPosition().x - pawn.getPosition().x) == -1 ? -1 :
        (tile.getPosition().x - pawn.getPosition().x) == 1 ? 1 : 0;
      if (sign == 0) return null;

      const captureTile = PositionUtil.getTileAt(this.tiles, { x: pawn.getPosition().x + sign, y: pawn.getPosition().y })
      const capturedPawn = captureTile.getPiece();
      if (capturedPawn) capturedPawn.captured();
      captureTile.setPiece(null);
      return capturedPawn;
    }
  }

  private handleIfKing(move: Move)
  {
    if (move.movingPiece.getType() == PieceType.KING)
    {
      const king = <King> move.movingPiece;
      this.handleCastle(king, move.currentTile, move.destinationTile);
    }
  }

  /**
   * Determines if the current board position is a Stalemate or Checkmate by checking if the current turn
   * has no legal moves.
   *
   * Returns true for checkmate, false for stalemate, and null otherwise.
   */
  public isMate(emitMate: boolean): boolean
  {
    let potentialWinner = PieceColor.WHITE;
    if (this.turn == PieceColor.WHITE) potentialWinner = PieceColor.BLACK;

    // First do a simple check if the king is in check before looking at all

    if (this.getCurrentTurnsAvailableMoves().length == 0)
    {
      const checkmate = this.kingIsAttacked(this.turn);

      if (emitMate)
      {
        this.mate$.next(
          { winner: checkmate ? potentialWinner : null, checkmate: checkmate }
        );
      }
      return checkmate;
    }
    return null;
  }

  private getCurrentTurnsAvailableMoves(): Array<Position>
  {
    let allPieces = this.blackPieces;
    if (this.turn == PieceColor.WHITE)
    {
      allPieces = this.whitePieces;
    }
    const availMoves = new Array<Position>();
    for (const piece of allPieces)
    {
      if (piece.isCaptured()) continue;
      for (const move of piece.getAvailableMoves(this.tiles)) availMoves.push(move);
    }
    return availMoves;
  }

  private kingIsAttacked(color: PieceColor): boolean
  {
    const king = PositionUtil.getKing(color, this.tiles);
    return king.isAttackedByAnyDirection(this.tiles) || king.isAttackedByKnight(this.tiles);
  }

  private handleCastle(king: King, currentTile: Tile, destinationTile: Tile)
  {
    if (king.getMoves() != 0) return;
    let distance = destinationTile.getPosition().x - currentTile.getPosition().x;

    let rank = king.getColor() == PieceColor.BLACK ? 8 : 1;

    if (Math.abs(distance) > 1)
    {
      // King moved right, so move right rook to the left of the king
      if (distance > 0) {
        const rookTile = PositionUtil.getTileAt(this.tiles, { x: 8, y: rank });
        const destTile = PositionUtil.getTileAt(this.tiles, { x: destinationTile.getPosition().x - 1, y: rank });
        destTile.setPiece(rookTile.getPiece());
        rookTile.setPiece(null);

        return king.getColor() == PieceColor.BLACK ? 'O-O-O' : 'O-O';
      } else {
        const rookTile = PositionUtil.getTileAt(this.tiles, { x: 1, y: rank });
        const destTile = PositionUtil.getTileAt(this.tiles, { x: destinationTile.getPosition().x + 1, y: rank });
        destTile.setPiece(rookTile.getPiece());
        rookTile.setPiece(null);
        return king.getColor() == PieceColor.BLACK ? 'O-O' : 'O-O-O';
      }
      return true;
    }
    return false;
  }

  private disallowEnPassant()
  {
    if (this.blackEnPassant)
    {
      if (this.blackEnPassant.turns > 0)
      {
        this.blackEnPassant.available = false;
        this.blackEnPassant.turns = 0;
        this.blackEnPassantAvailable.next(this.blackEnPassant);
      }
      else
      {
        this.blackEnPassant.turns++;
      }
    }

    if (this.whiteEnPassant)
    {
      if (this.whiteEnPassant.turns > 0)
      {
        this.whiteEnPassant.available = false;
        this.whiteEnPassant.turns = 0;
        this.whiteEnPassantAvailable.next(this.whiteEnPassant);
      }
      else
      {
        this.whiteEnPassant.turns++;
      }
    }
  }

  public switchTurn(currentTurn: PieceColor)
  {
    if (currentTurn == PieceColor.BLACK)
    {
      this.turn = PieceColor.WHITE;
    }
    else
    {
      this.turn = PieceColor.BLACK
    }
  }

  public getPieces(computerColor: PieceColor)
  {
    if (computerColor == PieceColor.BLACK)
    {
      return this.blackPieces;
    }
    else {
      return this.whitePieces;
    }
  }

  public getTurn(): PieceColor {
    return this.turn;
  }

  /**
   * Flips the board for display purposes only (when playing black)
   */
  public flip()
  {
    this.flipped = !this.flipped;
    for (let i = 0; i < 4; i++)
    {
      const topRank = this.ranks[i];
      const bottomRank = this.ranks[Math.abs(i - 7)]

      for (let j = 0; j < 8; j++)
      {
        // Swap and reverse
        const topTile = topRank[j];
        const bottomTile = bottomRank[7 - j];
        topRank[j] = bottomTile;
        bottomRank[7 - j] = topTile;
      }
    }
  }

  public isFlipped()
  {
    return this.flipped;
  }

  public static create(type: PieceType, color: PieceColor): Piece
  {
    switch (type)
    {
      case PieceType.PAWN:
        return new Pawn(color);

      case PieceType.BISHOP:
        return new Bishop(color);

      case PieceType.KING:
        return new King(color);

      case PieceType.QUEEN:
        return new Queen(color);

      case PieceType.ROOK:
        return new Rook(color);

      case PieceType.KNIGHT:
        return new Knight(color);
    }
  }

  public goToMove(move: Move)
  {
    this.tiles = move.boardSnapshot.tiles;
    this.blackPieces = move.boardSnapshot.blackPieces;
    this.whitePieces = move.boardSnapshot.whitePieces;
    this.turn = move.boardSnapshot.turn;
    if (this.flipped != move.boardSnapshot.flipped)
    {
      this.flip();
    }
    this.initRanks();
  }

}

export interface Mate
{
  winner: PieceColor,
  checkmate: boolean
}
