import { HttpInterceptorFn, HttpResponse } from '@angular/common/http';
import { of } from 'rxjs';

import { environment } from '../../../environments/environment';
import { LoginRequest, LoginResponse } from '../models/auth.models';

export const mockAuthInterceptor: HttpInterceptorFn = (req, next) => {
  const isLoginRequest = req.method === 'POST' && req.url === `${environment.apiUrl}/auth/login`;

  if (!environment.mockApi || !isLoginRequest) {
    return next(req);
  }

  const { email } = req.body as LoginRequest;
  const body: LoginResponse = { token: `mock-token.${email}` };

  return of(new HttpResponse<LoginResponse>({ status: 200, body }));
};
