import { Injectable } from "@angular/core";
import { MatDialog } from "@angular/material/dialog";
import { Subject } from "rxjs";
import { GamePrompt, GamePromptComponent } from "./game-prompt.component";

@Injectable({ providedIn: 'root' })
export class GamePromptService
{

  constructor(private matDialog: MatDialog)
  {
  }

  public newGameRequested(challenger: string, callback: Function)
  {
    const choice$ = new Subject<boolean>();
    choice$.subscribe(
      (choice) =>
      {
        callback(choice);
      }
    );

    this.matDialog.open(
      GamePromptComponent,
      {
        width: '250px',
        data: <GamePrompt>
        {
          text: challenger + ' has challenged you. Would you like accept?',
          buttons: [
            { text: `Let's Go!`, color: '#3654ff', value: true },
            { text: 'No, Thanks', color: 'darkgrey', value: false }
          ],
          choice$
        }
      }
    );
  }

}
