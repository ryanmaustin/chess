import { Position } from "./position";
import { Tile } from "./tile";
import { Piece, PieceColor } from "../pieces/piece";

export class PositionUtil {

  public static tileOccupiedBySameColor(tiles: Array<Tile>, color: PieceColor, pos: Position): boolean {
    const tile = this.getTileAt(tiles, pos);
    console.log("Tile", tile);
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

  public static getAvailableMoves(tiles: Array<Tile>, piece: Piece, boardFlipped: boolean): Array<Position> {
    const moves = new Array<Position>();
    const currentPosition = this.getPosition(tiles, piece);

    for (const move of piece.getAvailableMoves(tiles, boardFlipped))
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

}
