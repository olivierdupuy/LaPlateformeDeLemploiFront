import { HttpInterceptorFn } from '@angular/common/http';
import { environment } from '../../environments/environment';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  // Prefixer les appels /api avec l'URL du backend en production
  let url = req.url;
  if (environment.apiUrl && url.startsWith('/api')) {
    url = environment.apiUrl + url;
  }
  if (environment.apiUrl && url.startsWith('/hubs')) {
    url = environment.apiUrl + url;
  }

  const token = localStorage.getItem('auth_token');
  req = req.clone({
    url,
    ...(token ? { setHeaders: { Authorization: `Bearer ${token}` } } : {})
  });
  return next(req);
};
