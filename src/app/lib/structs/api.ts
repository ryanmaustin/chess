import { PieceColor } from "./chess";

export interface GameRequest
{
  challengerPlayerId: string,
  challengerPlaysAs: PieceColor,
  opponentPlayerId: string,
  clockInSeconds: number,
  incrementInSeconds: number,
  accepted: boolean
}

export interface MoveRequest
{
  gameId: string,
  playerId: string,
  from: string,
  to: string,
  promotionChoice: string
}
