import { Injectable } from "@angular/core";
import { PieceColor } from "../structs/chess";

export interface GameMode
{
  mode: 'Study'| 'Play' | 'Coach'
}

export enum Mode
{
  STUDY = 'Study',
  PLAY = 'Play',
  COACH = 'Coach'
}

export enum PlayerColor
{
  White = 'White',
  Black = 'Black',
  Random = 'Random'
}

export enum Opponent
{
  Player = 'Player',
  Computer = 'Computer'
}

export interface GameOptions
{
  playerColor: PieceColor,
  againstComputer: boolean,
  rating: number
}

@Injectable({ providedIn: 'root' })
export class GameOptionsService
{
  public showOptions: boolean = true;

  public currentMode: Mode = Mode.PLAY;
  public modes: Array<Mode> = [ Mode.PLAY, Mode.STUDY, Mode.COACH ];

  public currentColor: PlayerColor = PlayerColor.White;
  public colors: Array<PlayerColor> = [ PlayerColor.White, PlayerColor.Black, PlayerColor.Random]

  public currentOpponent: Opponent = Opponent.Computer;
  public opponents: Array<Opponent> = [ Opponent.Computer, Opponent.Player ];

  public rating: number = 1000;

  constructor()
  {}

  public changeColor(color: PlayerColor)
  {
    this.currentColor = color;
  }

  public getOptions(): GameOptions
  {
    const options = <GameOptions> {};
      options.playerColor = this.currentColor == PlayerColor.Random ? null : <PieceColor> (this.currentColor.toUpperCase());
      options.againstComputer = this.currentOpponent == Opponent.Computer ? true : false;
      options.rating = this.rating;
    return <GameOptions> options;
  }

  public hideOptions()
  {
    this.showOptions = false;
  }

  public showOptionsAgain()
  {
    this.showOptions = true;
  }

}
