import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { PLATFORM_ID } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { environment } from '../../../environments/environment';
import { AuthService } from './auth.service';

describe('AuthService', () => {
  let service: AuthService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();

    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: PLATFORM_ID, useValue: 'browser' },
      ],
    });

    service = TestBed.inject(AuthService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
    localStorage.clear();
    sessionStorage.clear();
  });

  it('should store token in localStorage when rememberMe is true', () => {
    service.login('user@example.com', 'password', true).subscribe();

    const req = httpMock.expectOne(`${environment.apiUrl}/auth/login`);
    expect(req.request.body).toEqual({ email: 'user@example.com', password: 'password' });
    req.flush({ token: 'remember-me-token' });

    expect(localStorage.getItem('auth_token')).toBe('remember-me-token');
    expect(sessionStorage.getItem('auth_token')).toBeNull();
  });

  it('should store token in sessionStorage when rememberMe is false', () => {
    service.login('user@example.com', 'password', false).subscribe();

    const req = httpMock.expectOne(`${environment.apiUrl}/auth/login`);
    req.flush({ token: 'session-token' });

    expect(sessionStorage.getItem('auth_token')).toBe('session-token');
    expect(localStorage.getItem('auth_token')).toBeNull();
  });

  it('should clear existing tokens before storing a new one', () => {
    localStorage.setItem('auth_token', 'old-local');
    sessionStorage.setItem('auth_token', 'old-session');

    service.login('user@example.com', 'password', true).subscribe();

    const req = httpMock.expectOne(`${environment.apiUrl}/auth/login`);
    req.flush({ token: 'new-token' });

    expect(localStorage.getItem('auth_token')).toBe('new-token');
    expect(sessionStorage.getItem('auth_token')).toBeNull();
  });

  it('should expose current user email and initials from stored mock token', () => {
    localStorage.setItem('auth_token', 'mock-token.jane.doe@example.com');

    expect(service.getCurrentUserEmail()).toBe('jane.doe@example.com');
    expect(service.getCurrentUserInitials()).toBe('JD');
  });

  it('should return fallback initials when no token is stored', () => {
    expect(service.getCurrentUserEmail()).toBeNull();
    expect(service.getCurrentUserInitials()).toBe('?');
  });
});
