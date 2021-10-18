import { Injectable } from '@angular/core';
import { HttpRequest, HttpHandler, HttpEvent, HttpInterceptor, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable()
export class Interceptor implements HttpInterceptor
{
    intercept(request: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>>
    {
      try
      {
        let headers = new HttpHeaders();
      }
      catch (error)
      {
        console.error(error);
      }
      request.headers.append('X-Requested-With', 'XMLHttpRequest')
      return next.handle(request);
    }
}
