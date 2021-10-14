import { Component, Inject } from "@angular/core";
import { MatDialogRef, MAT_DIALOG_DATA } from "@angular/material/dialog";
import { Subject } from "rxjs";
import { PieceColor, PieceType } from "../structs/chess";

@Component({
  selector: 'mate-dialog',
  template: `

    <div class="d-flex flex-row justify-content">
      <div (click)="this.choosePromotionPiece('QUEEN')"><img class="promotion-choice flex-grow-1" [src]="'assets/' + this.colorSymbol() + '-q.png'"></div>
      <div (click)="this.choosePromotionPiece('KNIGHT')"><img class="promotion-choice flex-grow-1" [src]="'assets/' + this.colorSymbol() + '-n.png'"></div>
      <div (click)="this.choosePromotionPiece('ROOK')"><img class="promotion-choice flex-grow-1" [src]="'assets/' + this.colorSymbol() + '-r.png'"></div>
      <div (click)="this.choosePromotionPiece('BISHOP')"><img class="promotion-choice flex-grow-1" [src]="'assets/' + this.colorSymbol() + '-b.png'"></div>
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
export class PromotionChoicePrompt {

  public color: PieceColor;
  public promotionChoice$: Subject<PieceType>;

  constructor(
    public dialogRef: MatDialogRef<PromotionChoicePrompt>,
    @Inject(MAT_DIALOG_DATA) public data: { color: PieceColor, promotionChoice$: Subject<PieceType> }
  ) {
    this.color = data.color;
    this.promotionChoice$ = data.promotionChoice$;
  }

  public choosePromotionPiece(type: string | PieceType) {
    this.promotionChoice$.next(<PieceType>type);
    this.dialogRef.close();
  }

  public colorSymbol(): string {
    return this.color.toLowerCase().charAt(0);
  }
}
