import { HttpClient } from "@angular/common/http";
import { Injectable } from "@angular/core";
import { RxStompService } from "@stomp/ng2-stompjs";
import { Subject } from "rxjs";
import { GameRequest } from "../structs/api";
import { PieceColor } from "../structs/chess";
import { GamePromptService } from "./game-prompts.service";

@Injectable({ providedIn: 'root'})
export class GameService
{
  private playerId: string;

  public challengeAccepted$: Subject<GameRequest>;

  constructor(
    private http: HttpClient,
    private rxStompService: RxStompService,
    private gamePrompts: GamePromptService
  )
  {
    this.challengeAccepted$ = new Subject<GameRequest>();
    this.init();
  }

  init(): void
  {
    console.warn("Starting up Game Service...");

    this.rxStompService.connected$.subscribe(
      () =>
      {
        console.warn("Connected to Game Service");
      }
    );

    this.rxStompService.serverHeaders$.subscribe(
      (headers) =>
      {
        this.playerId = String(headers['user-name']);
        console.warn("Logged into Game Service as Player [" + this.playerId + "]");
        this.startListeningForGames();
      }
    );
  }

  private startListeningForGames()
  {
    this.rxStompService.watch('/players/games/requests').subscribe(
      (message) =>
      {
        const gameRequest = <GameRequest> JSON.parse(message.body)
        console.warn("Recieved Game Request: ", gameRequest);
        this.handleReceivedGameRequest(gameRequest);
      }
    );
  }

  private handleReceivedGameRequest(gameRequest: GameRequest)
  {
    // Assume not accepted means that this is a new challenge
    // for now. Once I no longer allow a player to challenge
    // themselves, then I can handle this properly.
    if (!gameRequest.accepted)
    {
      this.gamePrompts.newGameRequested(
        gameRequest.challengerPlayerId,
        (accepted) =>
        {
          this.respondToGameRequest(gameRequest, accepted)
        }
      );
    }
    else
    {
      console.debug(`Game Request Accepted: ${gameRequest.challengerPlayerId} vs ${gameRequest.opponentPlayerId}`);
      this.challengeAccepted$.next(gameRequest);
      this.startListeningForMoves();
    }
  }

  private startListeningForMoves()
  {

  }

  public challenge(color: PieceColor, opponentPlayerId ?: string): Subject<GameRequest>
  {
    const challengeRequest = <GameRequest>
    {
      challengerPlayerId: this.playerId,
      challengerPlaysAs: color,
      opponentPlayerId: opponentPlayerId ? opponentPlayerId : this.playerId,
      clockInSeconds: 3000,
      incrementInSeconds: 0,
      accepted: false
    }

    console.debug("Sending challenge...", challengeRequest);

    this.submitGameRequest(challengeRequest);

    return this.challengeAccepted$;
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

}
