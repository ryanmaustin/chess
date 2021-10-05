import { Position } from "./position";
import { Tile } from "./tile";
import { Piece, PieceColor } from "../pieces/piece";

export class PositionUtil {

  public static tileOccupiedBySameColor(tiles: Array<Tile>, color: PieceColor, pos: Position): boolean {
    const tile = this.getTileAt(tiles, pos);
    if (tile.getPiece() != null)
    {
      return tile.getPiece().getColor() == color;
    }
    return false;
  }

  public static getTileAt(tiles: Array<Tile>, position: Position): Tile {
    for (const tile of tiles) {
      if (tile.getPosition().x == position.x && tile.getPosition().y == position.y) return tile;
    }
    return null;
  }

  public static getAvailableMoves(tiles: Array<Tile>, piece: Piece): Array<Position> {
    const moves = new Array<Position>();
    const currentPosition = this.getPosition(tiles, piece);

    for (const move of piece.getAvailableMoves(tiles))
      moves.push(move);

    console.log("Moves for " + piece.getColor() + " " +  piece.getType() + " [" + currentPosition.x + ","  + currentPosition.y + "] are ", moves)
    return moves;
  }

  public static getPosition(tiles: Array<Tile>, piece: Piece): Position {
    for (let i = 0; i < tiles.length; i++) {
      if (tiles[i].getPiece() == piece) return tiles[i].getPosition();
    }
    throw Error("No position for Piece: " + piece.getColor() + " " + piece.getType());
  }

  public static directionalMoves(boardPosition: Tile[], piece: Piece, xDelta: number, yDelta: number, limitOneMove ?: boolean): Array<Position> {
    const moves = new Array<Position>();
    let blocked = false;
    let count = 0;
    let xSign = xDelta > 0 ? 1 : xDelta < 0 ? -1 : 0;
    let ySign = yDelta > 0 ? 1 : yDelta < 0 ? -1 : 0;

    while (!blocked) {
      let tile = this.getTileAt(
        boardPosition,
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

  public static cloneBoard(board: Tile []): Tile [] {
    const clonedBoard = new Array<Tile>();

    for (const tile of board) {
      const clonedTile = new Tile(tile.getPosition());
      const clonedPiece = tile.getPiece() ? tile.getPiece().getClone() : null;
      clonedTile.setPiece(clonedPiece);
      clonedBoard.push(clonedTile);
    }

    return clonedBoard;
  }

  public static flipBoard(tiles: Array<Tile>)
  {
    for (let i = 32; i >= 1; i--)
    {
      const top = tiles[Math.abs(i-32)];
      const bottom = tiles[i+32-1];

      const topPiece = top.getPiece();
      const bottomPiece = bottom.getPiece();

      top.setPiece(bottomPiece);
      bottom.setPiece(topPiece);
    }
  }
}
