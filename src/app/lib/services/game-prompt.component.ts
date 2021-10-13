import { Component, Inject } from "@angular/core";
import { MatDialogRef, MAT_DIALOG_DATA } from "@angular/material/dialog";
import { Subject } from "rxjs";

export interface GamePrompt
{
  buttons: Array<GamePromptButton>,
  text: string,
  choice$: Subject<any>
}

export interface GamePromptButton
{
  text: string,
  color: string,
  value: any
}

@Component({
  selector: 'game-prompt',
  template: `

    <div class="w-100 h-100 d-flex flex-column">
      <div> {{ this.data.text }} </div>
      <div *ngIf="this.data.buttons">
        <div class="d-flex flex-row justify-content mt-3 w-100">
          <div *ngFor="let button of this.data.buttons" class="flex-grow-1 p-1">
            <button mat-raised-button color="primary" (click)="this.makeChoice(button.value)" class="w-100"
            [style.background-color]="button.color">
              {{ button.text }}
            </button>
          </div>
        </div>
      </div>
    </div>

  `,
  styles: [`

    .promotion-choice {
      max-height: 3rem;
      cursor: pointer;
    }

    .promotion-choice:hover {
      filter: drop-shadow(1px 1px 1px rgb(53, 53, 53, 0.8));
    }

  `]
})
export class GamePromptComponent
{
  constructor(
    public dialogRef: MatDialogRef<GamePromptComponent>,
    @Inject(MAT_DIALOG_DATA) public data: GamePrompt
  )
  {
  }

  public makeChoice(value: any)
  {
    this.data.choice$.next(value);
    this.dialogRef.close();
  }
}
