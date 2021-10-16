import { BrowserModule } from '@angular/platform-browser';
import { NgModule } from '@angular/core';

import { AppComponent } from './app.component';
import { NgbModule } from '@ng-bootstrap/ng-bootstrap';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { MatRadioModule } from '@angular/material/radio';
import { MatDividerModule } from '@angular/material/divider';
import { MatListModule } from '@angular/material/list';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatDialogModule } from '@angular/material/dialog';
import { DragDropModule } from '@angular/cdk/drag-drop';
import { DndModule } from 'ngx-drag-drop';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatSelectModule } from '@angular/material/select';
import { CommonModule } from '@angular/common';
import { HttpClientModule } from '@angular/common/http';
import { DropdownModule } from 'primeng/dropdown';
import { SelectButtonModule } from 'primeng/selectbutton';
import { ScrollingModule } from '@angular/cdk/scrolling';
import { RadioButtonModule } from 'primeng/radiobutton';
import { ButtonModule } from 'primeng/button';
import { SliderModule } from 'primeng/slider';
import { InputTextareaModule } from 'primeng/inputtextarea';
import { FaIconLibrary, FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { InputTextModule } from 'primeng/inputtext';

import { InjectableRxStompConfig, RxStompService, rxStompServiceFactory } from '@stomp/ng2-stompjs';
import { myRxStompConfig } from './lib/config/rx-stomp-config';

import { GameService } from './lib/services/game.service';
import { GameOptionsService } from './lib/services/game-options.service';
import { ClientGameEngine } from './lib/services/client-game-engine.service';
import { GamePromptService } from './lib/services/game-prompts.service';

import { GamePromptComponent } from './lib/services/game-prompt.component';

import { fas } from '@fortawesome/free-solid-svg-icons';
import { far } from '@fortawesome/free-regular-svg-icons';

@NgModule({
  declarations: [
    AppComponent,
    GamePromptComponent
  ],
  imports: [
    BrowserModule,
    CommonModule,
    NgbModule,
    BrowserAnimationsModule,
    MatCheckboxModule,
    MatRadioModule,
    MatDividerModule,
    MatListModule,
    ReactiveFormsModule,
    FormsModule,
    MatDialogModule,
    DragDropModule,
    DndModule,
    ReactiveFormsModule,
    MatInputModule,
    ScrollingModule,
    MatButtonModule,
    MatSelectModule,
    HttpClientModule,
    DropdownModule,
    SelectButtonModule,
    RadioButtonModule,
    ButtonModule,
    SliderModule,
    InputTextareaModule,
    InputTextModule,
    FontAwesomeModule
  ],
  providers: [
    {
      provide: InjectableRxStompConfig,
      useValue: myRxStompConfig,
    },
    {
      provide: RxStompService,
      useFactory: rxStompServiceFactory,
      deps: [InjectableRxStompConfig],
    },
    GameService,
    GamePromptService,
    GameOptionsService,
    ClientGameEngine
  ],
  bootstrap: [
    AppComponent
  ]
})
export class AppModule {

  constructor(library: FaIconLibrary)
  {
    library.addIconPacks(fas, far);
  }
}
