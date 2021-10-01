import { Component, OnInit } from '@angular/core';
import { Board } from './lib/board/board';
import { Position } from './lib/board/position';
import { Tile } from './lib/board/tile';
import { Piece } from './lib/pieces/piece';
import { PositionUtil } from './lib/board/position-util';



@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent implements OnInit {
  title = 'Chess';

  public selected: Piece;

  protected availableMoves: Array<Position>;

  public board: Board;

  constructor()
  {
    this.board = new Board();
    this.availableMoves = [];
  }

  public ngOnInit()
  {
    this.board.setup();
  }

  public selectPiece(piece: Piece)
  {
    this.selected = piece;
    this.availableMoves = this.board.prepareToMovePiece(this.selected);
    console.log("Avail", this.availableMoves);
  }

  public isAvailableMove(tile: Tile): boolean
  {
    for (const availableMove of this.availableMoves)
    {
      if (availableMove.x == tile.getPosition().x && availableMove.y == tile.getPosition().y) return true;
    }
    return false;
  }

  public makeMove(tile: Tile) {
    this.board.movePiece(this.selected, tile);
    this.availableMoves = new Array<Position>();
    this.selected = null;
  }

}
