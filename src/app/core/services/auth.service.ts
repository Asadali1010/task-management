import { isPlatformBrowser } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Injectable, PLATFORM_ID, inject } from '@angular/core';
import { Observable, tap } from 'rxjs';

import { environment } from '../../../environments/environment';
import { LoginRequest, LoginResponse } from '../models/auth.models';

const TOKEN_KEY = 'auth_token';
const MOCK_TOKEN_PREFIX = 'mock-token.';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly platformId = inject(PLATFORM_ID);

  getStoredToken(): string | null {
    if (!isPlatformBrowser(this.platformId)) {
      return null;
    }

    return localStorage.getItem(TOKEN_KEY) ?? sessionStorage.getItem(TOKEN_KEY);
  }

  getCurrentUserEmail(): string | null {
    const token = this.getStoredToken();
    if (!token) {
      return null;
    }

    if (token.startsWith(MOCK_TOKEN_PREFIX)) {
      return token.slice(MOCK_TOKEN_PREFIX.length) || null;
    }

    return null;
  }

  getCurrentUserInitials(): string {
    const email = this.getCurrentUserEmail();
    if (!email) {
      return '?';
    }

    const localPart = email.split('@')[0] ?? '';
    const parts = localPart.split(/[._-]+/).filter(Boolean);

    if (parts.length >= 2) {
      return `${parts[0]!.charAt(0)}${parts[1]!.charAt(0)}`.toUpperCase();
    }

    return localPart.slice(0, 2).toUpperCase() || '?';
  }

  login(email: string, password: string, rememberMe: boolean): Observable<LoginResponse> {
    const body: LoginRequest = { email, password };
    return this.http
      .post<LoginResponse>(`${environment.apiUrl}/auth/login`, body)
      .pipe(tap((response) => this.storeToken(response.token, rememberMe)));
  }

  logout(): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }
    this.clearStoredTokens();
  }

  private storeToken(token: string, rememberMe: boolean): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }
    this.clearStoredTokens();
    const storage = rememberMe ? localStorage : sessionStorage;
    storage.setItem(TOKEN_KEY, token);
  }

  private clearStoredTokens(): void {
    localStorage.removeItem(TOKEN_KEY);
    sessionStorage.removeItem(TOKEN_KEY);
  }
}
