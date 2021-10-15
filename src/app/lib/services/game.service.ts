import { Injectable } from "@angular/core";
import { RxStompService } from "@stomp/ng2-stompjs";
import { BehaviorSubject, Subject, Subscription } from "rxjs";
import { GameRequest, MoveRequest, SAN } from "../structs/api";
import { Piece, PieceColor, PieceType } from "../structs/chess";
import { GamePromptService } from "./game-prompts.service";

/**
 * This Service:
 * - Sends Game Requests
 * - Responds to Game Requests
 * - Initiates connection to Game Engine through Web Sockets
 * - Emits when connected to the Game Engine (the player can now play)
 */
@Injectable({ providedIn: 'root'})
export class GameService
{
  private playerId: string;

  public gameStarted$: Subject<GameRequest>;

  public connectedToGameEngine$ = new BehaviorSubject<boolean>(false);

  public moves$: Subject<MoveRequest>;

  private waitingForAnOpponent: boolean = true;

  private listenForMoves: Subscription;
  private listenForRequests: Subscription;

  constructor(
    private rxStompService: RxStompService,
    private gamePrompts: GamePromptService
  )
  {
    this.gameStarted$ = new Subject<GameRequest>();
    this.moves$ = new Subject<MoveRequest>();
    this.init();
  }

  init(): void
  {
    console.warn("Starting up Game Service...");

    this.rxStompService.connected$.subscribe(
      () =>
      {
        console.warn("Connected to Game Service");
        this.startListeningForMoves();
        this.startListeningForRequests();
      }
    );

    this.rxStompService.connectionState$.subscribe(
      (state) =>
      {
        if (state == 3)
        {
          this.stopListeningForMoves();
          this.stopListeningForRequests();
        }
      }
    );

    this.rxStompService

    this.rxStompService.serverHeaders$.subscribe(
      (headers) =>
      {
        this.playerId = String(headers['user-name']);
        console.warn("Logged into Game Service as Player [" + this.playerId + "]");
        this.connectedToGameEngine$.next(true);
      }
    );
  }

  /**
   * - Player A sends Game Request to B (sent on '/app/game/request', received on '/players/game/requests')
   * - Player B responds to the Game Request to A (sent on '/app/game/respond', received on '/players/game/requests)
   * - Player A recieves response.
   */
  private handleReceivedGameRequest(gameRequest: GameRequest)
  {
    // If this Player's ID matches the gameRequest's Challenger ID, then
    // we know that this is a RESPONSE from another player, otherwise
    // treat it as a REQUEST to this player
    if (gameRequest.challengerPlayerId == this.playerId)
    {
      console.debug(`Game Request Accepted: ${gameRequest.challengerPlayerId} vs ${gameRequest.opponentPlayerId}`);
      this.gameStarted$.next(gameRequest);
    }
    else // this is a new game request for this player
    {
      if (this.waitingForAnOpponent)
      {
        this.gameStarted$.next(gameRequest);
      }
      else
      {
        this.gamePrompts.newGameRequested(
          gameRequest.challengerPlayerId,
          (accepted) =>
          {
            this.respondToGameRequest(gameRequest, accepted)
          }
        );
      }
    }
  }

  /**
   * Subscribe to Game Requests from other Players
   */
  private startListeningForRequests()
  {
    this.rxStompService.watch('/players/game/requests').subscribe(
      (message) =>
      {
        const gameRequest = <GameRequest> JSON.parse(message.body)
        console.warn("Recieved Game Request: ", gameRequest);
        this.handleReceivedGameRequest(gameRequest);
      }
    );
  }

  private startListeningForMoves()
  {
    this.rxStompService.watch('/players/game/move').subscribe(
      (message) =>
      {
        const move = <MoveRequest> JSON.parse(message.body)

        if (move.playerId == this.playerId) return; // ignore for now

        console.warn("Recieved Move: ", move);
        this.moves$.next(move);
      }
    );
  }

  private stopListeningForMoves()
  {
    if (this.listenForMoves)
    {
      this.listenForMoves.unsubscribe();
    }
  }

  private stopListeningForRequests()
  {
    if (this.listenForRequests)
    {
      this.listenForRequests.unsubscribe();
    }
  }

  public requestGame(againstComputer: boolean, color ?: PieceColor, opponentPlayerId ?: string): Subject<GameRequest>
  {
    console.warn("Against computer?", againstComputer);
    if (againstComputer)
    {
      this.challengeAComputer();
    }
    else
    {
      this.challengeAPlayer();
    }
    return this.gameStarted$;
  }

  private challengeAComputer(color ?: PieceColor)
  {
    console.warn("Computer Challenge Requested");
    const challengeRequest = <GameRequest>
    {
      challengerPlayerId: this.playerId,
      challengerPlaysAs: color,
      opponentPlayerId: "COMPUTER",
      clockInSeconds: 3000,
      incrementInSeconds: 0,
      accepted: false
    }
    this.submitGameRequest(challengeRequest);
  }

  private challengeAPlayer(opponentId ?: string, color ?: PieceColor)
  {
    this.waitingForAnOpponent = opponentId == null;
    const challengeRequest = <GameRequest>
    {
      challengerPlayerId: this.playerId,
      challengerPlaysAs: color,
      opponentPlayerId: opponentId,
      clockInSeconds: 3000,
      incrementInSeconds: 0,
      accepted: false
    }
    this.submitGameRequest(challengeRequest);
  }

  private submitGameRequest(gameRequest: GameRequest)
  {
    this.rxStompService.publish(
      {
        destination: '/app/game/request',
        body: JSON.stringify(gameRequest)
      }
    );
  }

  private respondToGameRequest(gameRequest: GameRequest, accept: boolean)
  {
    gameRequest.accepted = accept;

    this.rxStompService.publish(
      {
        destination: '/app/game/respond',
        body: JSON.stringify(gameRequest)
      }
    );
  }

  public getPlayerId(): string
  {
    return this.playerId;
  }


  public makeMove(gameId: string, from: SAN, to: SAN, promotion ?: Piece)
  {
    const move = <MoveRequest>
    {
      gameId: gameId,
      playerId: this.playerId,
      from: from.parsed(),
      to: to.parsed(),
      promotionChoice: promotion ?
        promotion.getColor().toString().toUpperCase() + "_" +
        promotion.getType().toString().toUpperCase()
        : null
    }

    this.rxStompService.publish(
      {
        destination: '/app/game/move',
        body: JSON.stringify(move)
      }
    );
  }
}
