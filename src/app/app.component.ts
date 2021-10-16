import { ChangeDetectorRef, Component, HostListener, NgZone, OnInit } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { ClientGameEngine } from './lib/services/client-game-engine.service';
import { GameOptionsService, Mode } from './lib/services/game-options.service';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent implements OnInit
{
  public title = 'EveryMove';

  public pgn: string = '';

  constructor(
    public dialog: MatDialog,
    private cd: ChangeDetectorRef,
    public engine: ClientGameEngine,
    public gameOptions: GameOptionsService,
    private zone: NgZone
  )
  {
  }

  public ngOnInit()
  {
    this.engine.initChangeDetection(this.cd);
  }

  public startNewGame()
  {
    this.engine.requestNewGame();
  }

  public setBoardFromPgn()
  {
    this.zone.runOutsideAngular(() =>
    {
      this.engine.setBoard(this.pgn);
    });
    this.cd.detectChanges();
  }

  public studyOptionSelected(): boolean
  {
    return this.gameOptions.currentMode == Mode.STUDY;
  }

  public playOptionSelected(): boolean
  {
    return this.gameOptions.currentMode == Mode.PLAY;
  }

  @HostListener('window:resize', ['$event'])
  public onWindowResize()
  {
    this.cd.detectChanges();
  }

  public validateRating(rating: any)
  {
    if (rating < 0)
    {
      this.gameOptions.rating = 0;
    }
    else if (rating > 3500)
    {
      this.gameOptions.rating = 3500;
    }
  }
}
