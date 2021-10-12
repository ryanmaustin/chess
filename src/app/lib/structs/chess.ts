import { Position } from "./position";

export enum PieceType
{
  PAWN = 'PAWN',
  KNIGHT = 'KNIGHT',
  BISHOP = 'BISHOP',
  ROOK = 'ROOK',
  QUEEN = 'QUEEN',
  KING = 'KING'
}

export enum PieceColor
{
  WHITE = 'WHITE',
  BLACK = 'BLACK'
}

export abstract class Piece
{
  protected _captured: boolean = false;
  protected moves: number = 0;
  protected type: PieceType;
  protected color: PieceColor;
  protected position: Position;

  constructor(type: PieceType, color: PieceColor)
  {
    this.type = type;
    this.color = color;
  }

  public abstract getClone(): Piece;

  public moved()
  {
    this.moves++;
  }

  public captured()
  {
    this._captured = true;
  }

  public getMoves(): number
  {
    return this.moves;
  }

  public getType(): PieceType
  {
    return this.type;
  }

  public getColor(): PieceColor
  {
    return this.color;
  }

  public isBlack(): boolean
  {
    return this.color == PieceColor.BLACK;
  }

  public isWhite(): boolean
  {
    return this.color == PieceColor.WHITE;
  }

  public setPosition(pos: Position) {
    this.position = pos;
  }

  public getAvailableMoves(tiles: Array<Tile>, removeMovesThatPutKingInCheck ?: boolean): Array<Position>
  {
    if (this._captured) return [];

    return this.removeIllegalMoves(
      tiles,
      this.availableMoves(tiles),
      removeMovesThatPutKingInCheck == null ? true : removeMovesThatPutKingInCheck
    );
  }

  private removeIllegalMoves(tiles: Array<Tile>, moves: Array<Position>, removeMovesThatPutKingInCheck: boolean): Array<Position>
  {
    moves = this.filterOutOccupiedTilesOfSameColor(
      tiles,
      moves
    );

    // Remove moves that would put the king in check
    if (removeMovesThatPutKingInCheck)
    {
      moves = this.filterOutMovesThatPutKingInCheck(
        tiles,
        moves
      );
    }

    return moves;
  }

  private filterOutOccupiedTilesOfSameColor(tiles: Array<Tile>, moves: Array<Position>): Array<Position>
  {
    const validMoves = new Array<Position>();

    for (const move of moves)
    {
      if (!PositionUtil.tileOccupiedBySameColor(tiles, this.getColor(), move))
      {
        validMoves.push(move);
      }
    }

    return validMoves;
  }

  private filterOutMovesThatPutKingInCheck(tiles: Array<Tile>, moves: Array<Position>)
  {
    const legalMoves = new Array<Position>();
    for (const move of moves) {
      let legalMove = true;

      // a move puts the king in check when on the opponent's next turn they could capture it
      const opponentsPosition = PositionUtil.cloneBoard(tiles);

      // make the move to achieve opponents pos
      PositionUtil.getTileAt(opponentsPosition, this.position).setPiece(null);
      PositionUtil.getTileAt(opponentsPosition, move).setPiece(this.getClone());

      // Now check if any of the available moves of any of the oppenents pieces could potentially capture
      // the king

      for (const tile of opponentsPosition) {
        if (tile.getPiece() == null || tile.getPiece().getColor() == this.color) continue;

        const piece = tile.getPiece();

        const availableMovesForOpponent = piece.availableMoves(opponentsPosition);
        for (const availableMoveForOppponent of availableMovesForOpponent) {
          const capturablePiece = PositionUtil.getTileAt(opponentsPosition, availableMoveForOppponent).getPiece();

          if (capturablePiece != null && capturablePiece.getType() == PieceType.KING && capturablePiece.getColor() == this.color) {

            // This move is considered illegal because it would put the king in check
            legalMove = false;
            break;
          }
        }
        if (!legalMove) break;
      }
      // Move passed all checks and is legal
      if (legalMove) legalMoves.push(move);
    }
    return legalMoves;
  }

  protected abstract availableMoves(tiles: Array<Tile>): Array<Position>;

  public getPosition(): Position
  {
    return this.position;
  }

  public getImageUrl(): string
  {
    return `assets/${this.isBlack() ? 'b' : 'w'}${PieceImgMap.get(this.getType())}`;
  }

  public getId(): string
  {
    return this.type + "-" + this.position.x + "-" + this.position.y;
  }

  public isCaptured(): boolean
  {
    return this._captured;
  }
}

export const PieceImgMap = new Map<PieceType, string>([
  [ PieceType.PAWN, '-p.png'],
  [ PieceType.KNIGHT, '-n.png'],
  [ PieceType.BISHOP, '-b.png'],
  [ PieceType.ROOK, '-r.png'],
  [ PieceType.QUEEN, '-q.png'],
  [ PieceType.KING, '-k.png'],
]);

export class PositionUtil {

  public static tileOccupiedBySameColor(tiles: Array<Tile>, color: PieceColor, pos: Position): boolean
  {
    const tile = this.getTileAt(tiles, pos);
    if (tile.getPiece() != null)
    {
      return tile.getPiece().getColor() == color;
    }
    return false;
  }

  public static getTileAt(tiles: Array<Tile>, position: Position): Tile
  {
    for (const tile of tiles) {
      if (this.matches(tile, position)) return tile;
    }
    return null;
  }

  public static getPosition(tiles: Array<Tile>, piece: Piece): Position
  {
    for (let i = 0; i < tiles.length; i++) {
      if (tiles[i].getPiece() == piece) return tiles[i].getPosition();
    }
    throw Error("No position for Piece: " + piece.getColor() + " " + piece.getType());
  }

  public static directionalMoves(tiles: Tile[], piece: Piece, xDelta: number, yDelta: number, limitOneMove ?: boolean): Array<Position>
  {
    const moves = new Array<Position>();
    let blocked = false;
    let count = 0;
    let xSign = xDelta > 0 ? 1 : xDelta < 0 ? -1 : 0;
    let ySign = yDelta > 0 ? 1 : yDelta < 0 ? -1 : 0;

    while (!blocked) {
      let tile = this.getTileAt(
        tiles,
        // Diagonal
        {
          x: piece.getPosition().x + (xSign * (Math.abs(xDelta) + count)),
          y: piece.getPosition().y + (ySign * (Math.abs(yDelta) + count))
        }
      );
      count++;

      // out of board range
      if (tile == null) {
        blocked = true;
        break;
      }
      // there's a piece here
      if (tile.getPiece() != null) {
        blocked = true;

        // blocked be same color (no moves)
        if (tile.getPiece().getColor() == piece.getColor()) {

        } else { // blocked by other color. move is available
          moves.push(tile.getPosition());
        }
      }
      // tile is unoccupied. move is available
      else {
        moves.push(tile.getPosition());
      }

      if (limitOneMove) {
        break;
      }
    }
    return moves;
  }

  public static cloneBoard(board: Tile []): Tile []
  {
    const clonedBoard = new Array<Tile>();

    for (const tile of board) {
      const clonedTile = new Tile(tile.getPosition());
      const clonedPiece = tile.getPiece() ? tile.getPiece().getClone() : null;
      clonedTile.setPiece(clonedPiece);
      clonedBoard.push(clonedTile);
    }

    return clonedBoard;
  }

  public static matches(a: Tile | Position, b: Tile | Position): boolean
  {
    let aPos = a;
    let bPos = b;
    if (a instanceof Tile)
    {
      aPos = a.getPosition();
    }
    if (b instanceof Tile)
    {
      aPos = b.getPosition();
    }
    return (<Position>aPos).x == (<Position>bPos).x && (<Position>aPos).y == (<Position>bPos).y;
  }

  /**
   * When the board is flipped, we need to invert the position to
   * get the relative position (to the player).
   */
  public static invert(position: Position)
  {
    return { x: Math.abs(position.x - 9), y: Math.abs(position.y - 9) };
  }

}

export class Tile {

  public piece: Piece;

  private pos: Position;

  constructor(pos: Position)
  {
    this.pos = pos;
  }

  public setPosition(pos: Position)
  {
    this.pos = pos;
  }

  public getPosition()
  {
    return this.pos;
  }

  public isBlack()
  {
    // Is black if y is odd and x is even OR y is even and x is odd
    return (this.pos.y % 2 == 1 && this.pos.x % 2 == 1) || (this.pos.y % 2 == 0 && this.pos.x % 2 == 0);
  }

  public isWhite()
  {
    return !this.isBlack();
  }

  public setPiece(piece: Piece)
  {
    this.piece = piece;
    if (this.piece) this.piece.setPosition(this.pos);
  }

  public getPiece()
  {
    return this.piece;
  }

  public getPieceImageUrl(): string
  {
    return `assets/${this.piece.isBlack() ? 'b' : 'w'}${PieceImgMap.get(this.piece.getType())}`;
  }
}
