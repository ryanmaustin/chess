import { King } from "./pieces/king";
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

export interface Direction
{
   x: 1 | -1 | 0,
   y: 1 | -1 | 0
}

export interface Promotion
{
  type: PieceType,
  color: PieceColor
}

export const N = <Direction> { x: 0, y: 1 };
export const NE = <Direction> { x: 1, y: 1 };
export const E = <Direction> { x: 1, y: 0 };
export const SE = <Direction> { x: 1, y: -1 };
export const S = <Direction> { x: 0, y: -1 };
export const SW = <Direction> { x: -1, y: -1 };
export const W = <Direction> { x: -1, y: 0 };
export const NW = <Direction> { x: -1, y: 1 };

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

  private filterOutMovesThatPutKingInCheck(tiles: Array<Tile>, moves: Array<Position>): Array<Position>
  {
    const legalMoves = new Array<Position>();
    const king = PositionUtil.getKing(this.color, tiles);
    const thisTile = PositionUtil.getTileAt(tiles, this.getPosition());

    for (const move of moves)
    {
      let illegalMove = false;

      const targetTile = PositionUtil.getTileAt(tiles, move);
      const pieceAtTargetTile = targetTile.getPiece();
      targetTile.setPiece(this);
      thisTile.setPiece(null);

      if (king.isAttackedByAnyDirection(tiles) || king.isAttackedByKnight(tiles)) illegalMove = true;

      // Put back
      targetTile.setPiece(pieceAtTargetTile);
      thisTile.setPiece(this);

      if (!illegalMove) { legalMoves.push(move); }
    }
    return legalMoves;
  }

  public isAttackedByAnyDirection(tiles: Array<Tile>): boolean
  {
    return this.isAttackedByDirection(N, tiles) ||
    this.isAttackedByDirection(NE, tiles) ||
    this.isAttackedByDirection(E, tiles) ||
    this.isAttackedByDirection(SE, tiles) ||
    this.isAttackedByDirection(S, tiles) ||
    this.isAttackedByDirection(SW, tiles) ||
    this.isAttackedByDirection(W, tiles) ||
    this.isAttackedByDirection(NW, tiles);
  }

  public isAttackedByDirection(direction: Direction, tiles: Array<Tile>): boolean
  {
    // Initial Position
    let x = this.position.x;
    let y = this.position.y;
    let tile = PositionUtil.getTileAt(tiles, { x: x + direction.x, y: y + direction.y });

    while (tile != null)
    {
      if (tile == null) break;

      if (tile.getPiece() != null)
      {
        if (tile.getPiece().getColor() == this.color) return false; // Protected by same color

        // Queen can attack from any direction
        if (tile.getPiece().getType() == PieceType.QUEEN) { return true; }

        else if (tile.getPiece().getType() == PieceType.BISHOP && this.isAttackedByBishop(direction)) { return true; }

        else if (tile.getPiece().getType() == PieceType.ROOK && this.isAttackedByRook(direction)) { return true; }

        else if (tile.getPiece().getType() == PieceType.PAWN && this.isAttackedByPawn(direction, tile.getPiece().getPosition())) { return true; }

        else // Whatever piece is here cannot capture and is therefore blocking
        {
          return false;
        }
      }
      x += direction.x == 0 ? 0 : direction.x;
      y += direction.y == 0 ? 0 : direction.y;
      tile = PositionUtil.getTileAt(tiles, { x: x, y: y } );
    }
    return false;
  }

  public isAttackedByBishop(direction: Direction): boolean
  {
    // Diagonal if both units are 1
    return Math.abs(direction.x) == Math.abs(direction.y);
  }

  public isAttackedByRook(direction: Direction): boolean
  {
    // H or V because only one unit is equal to 1
    return Math.abs(direction.x) != Math.abs(direction.y);
  }

  public isAttackedByPawn(direction: Direction, pawnPosition: Position): boolean
  {
    // Invert so we can view from pawn's perspective and see if the inverted
    // direction takes us to this's position
    const inverted = { x: direction.x * -1, y: direction.y * -1 };
    return ((pawnPosition.x + inverted.x) == this.position.x) &&
      ((pawnPosition.y + inverted.y) == this.position.y);
  }

  public isAttackedByKnight(tiles: Array<Tile>): boolean
  {
    const knightThreatPositions = PositionUtil.knightMoves(this.position);
    for (const threat of knightThreatPositions)
    {
      const tile = PositionUtil.getTileAt(tiles, threat);
      if (tile == null) continue;
      if (tile.getPiece() != null && tile.getPiece().getColor() != this.color && tile.getPiece().getType() == PieceType.KNIGHT) return true;
    }
    return false;
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

  public static getKing(color: PieceColor, tiles: Array<Tile>)
  {
    for (const tile of tiles)
    {
      if (tile.getPiece() != null && tile.getPiece().getType() == PieceType.KING && tile.getPiece().getColor() == color) return <King> tile.getPiece();
    }
    throw Error("No King Exists?!");
  }

  public static knightMoves(startingPosition: Position)
  {
    const moves = new Array<Position>();

    const potentialMoves = [
      [+2, -1],
      [+2, +1],
      [+1, -2],
      [+1, +2],
      [-2, -1],
      [-2, +1],
      [-1, +2],
      [-1, -2],
    ];

    for (const potentialMove of potentialMoves)
    {
      const moveX = potentialMove[0] + startingPosition.x;
      const moveY = potentialMove[1] + startingPosition.y;

      if (moveX < 1 || moveX > 8 || moveY < 1 || moveY > 8) continue;

      moves.push({x: moveX, y: moveY});
    }

    return moves;
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
