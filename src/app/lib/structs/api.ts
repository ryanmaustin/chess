import { PGNMoveMap } from "../util/pgn-util";
import { PieceColor } from "./chess";
import { Position } from "./position";

export interface GameRequest
{
  challengerPlayerId: string,
  challengerPlaysAs: PieceColor,
  opponentPlayerId: string,
  clockInSeconds: number,
  incrementInSeconds: number,
  accepted: boolean,
  gameId ?: string,
  rating ?: number
}

export interface MoveRequest
{
  gameId: string,
  playerId: string,
  from: string,
  to: string,
  promotionChoice: string
}

export class SAN
{

  constructor(private position: Position)
  {
  }


  public parsed(): string
  {
    return PGNMoveMap.get(this.position);
  }
}
