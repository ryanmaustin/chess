import { Component, Inject, NgZone } from "@angular/core";
import { MatDialogRef, MAT_DIALOG_DATA } from "@angular/material/dialog";
import { startCase } from "lodash";
import { Mate } from "../structs/board";

@Component({
  selector: 'mate-dialog',
  template: `

    <div >{{ this.data.checkmate ? "Checkmate! " + this.format(this.data.winner) + " Wins!" : "Stalemate!" }} </div>

  `,
})
export class CheckmateDialog {

  constructor(
    public dialogRef: MatDialogRef<CheckmateDialog>,
    private ngZone: NgZone,
    @Inject(MAT_DIALOG_DATA) public data: Mate) {}

  onNoClick(): void
  {
    this.ngZone.run(() =>
    {
      this.dialogRef.close();
    });
  }

  public format(str: string): string {
    return startCase(str.toLowerCase());
  }

}
