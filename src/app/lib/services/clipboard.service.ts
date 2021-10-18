import { Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class ClipboardService
{
  constructor() {}

  public copy(text: string)
  {
    this.copyNonSecure(text)
  }

  /**
   * Workaround until SSL is enabled...
   */
  private copyNonSecure(text: string)
  {
    // navigator clipboard api needs a secure context (https)
    if (navigator.clipboard && window.isSecureContext)
    {
      // navigator clipboard api method'
      return navigator.clipboard.writeText(text);
    }
    else
    {
      // text area method
      let textArea = document.createElement('textarea');
      textArea.value = text;
      // make the textarea out of viewport
      textArea.style.position = 'fixed';
      textArea.style.left = '-999999px';
      textArea.style.top = '-999999px';
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      return new Promise<void>(
        (res, rej) =>
        {
          // here the magic happens
          document.execCommand('copy') ? res() : rej();
          textArea.remove();
        }
      );
    }
  }
}
