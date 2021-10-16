import { Injectable } from "@angular/core";

@Injectable({ providedIn: 'root' })
export class ClipboardService
{

  constructor() {
  }

  public copy(text: string)
  {
    navigator.clipboard.writeText(text);
  }
}
