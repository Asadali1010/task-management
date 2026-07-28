import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { provideRouter, Router } from '@angular/router';
import { of, throwError } from 'rxjs';
import { vi } from 'vitest';

import { AuthService } from '../../core/services/auth.service';
import { Login } from './login';

describe('Login', () => {
  let fixture: ComponentFixture<Login>;
  let authService: { login: ReturnType<typeof vi.fn> };
  let router: Router;

  beforeEach(async () => {
    authService = { login: vi.fn() };

    await TestBed.configureTestingModule({
      imports: [Login],
      providers: [
        provideRouter([{ path: 'dashboard', component: class {} }]),
        { provide: AuthService, useValue: authService },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(Login);
    router = TestBed.inject(Router);
    vi.spyOn(router, 'navigate').mockResolvedValue(true);
  });

  function getElement(selector: string): HTMLElement {
    return fixture.nativeElement.querySelector(selector) as HTMLElement;
  }

  function setInputValue(selector: string, value: string): void {
    const input = getElement(selector) as HTMLInputElement;
    input.value = value;
    input.dispatchEvent(new Event('input'));
    fixture.detectChanges();
  }

  function submitForm(): void {
    fixture.debugElement.query(By.css('form'))!.triggerEventHandler('ngSubmit', null);
    fixture.detectChanges();
  }

  it('should create', () => {
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('should render welcome message and form fields', async () => {
    await fixture.whenStable();
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('#login-hero-heading')?.textContent).toContain('Task Management');
    expect(compiled.querySelector('.login-hero-tagline')?.textContent).toContain(
      'Welcome back. Sign in to continue.',
    );
    expect(compiled.querySelector('#email')).toBeTruthy();
    expect(compiled.querySelector('#password')).toBeTruthy();
    expect(compiled.querySelector('#rememberMe')).toBeTruthy();
    expect(compiled.querySelector('button[type="submit"]')?.textContent).toContain('Sign in');
    expect(compiled.querySelector('a[href="/forgot-password"]')).toBeTruthy();
    expect(compiled.querySelector('a[href="/register"]')).toBeTruthy();
  });

  it('should show validation errors when submitting an empty form', () => {
    fixture.detectChanges();
    submitForm();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('#email-error')?.textContent).toContain('Email is required.');
    expect(compiled.querySelector('#password-error')?.textContent).toContain('Password is required.');
    expect(authService.login).not.toHaveBeenCalled();
  });

  it('should show validation error for an invalid email', () => {
    fixture.detectChanges();
    setInputValue('#email', 'not-an-email');
    setInputValue('#password', 'secret');
    submitForm();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('#email-error')?.textContent).toContain('Enter a valid email address.');
    expect(authService.login).not.toHaveBeenCalled();
  });

  it('should toggle password visibility', () => {
    fixture.detectChanges();

    const passwordInput = getElement('#password') as HTMLInputElement;
    const toggleButton = getElement('button[aria-label="Show password"]');

    expect(passwordInput.type).toBe('password');
    expect(toggleButton.getAttribute('aria-pressed')).toBe('false');

    toggleButton.click();
    fixture.detectChanges();
    expect(passwordInput.type).toBe('text');
    expect(toggleButton.getAttribute('aria-label')).toBe('Hide password');
    expect(toggleButton.getAttribute('aria-pressed')).toBe('true');

    toggleButton.click();
    fixture.detectChanges();
    expect(passwordInput.type).toBe('password');
    expect(toggleButton.getAttribute('aria-label')).toBe('Show password');
    expect(toggleButton.getAttribute('aria-pressed')).toBe('false');
  });

  it('should pass rememberMe to AuthService when checked', () => {
    authService.login.mockReturnValue(of({ token: 'test-token' }));
    fixture.detectChanges();

    const rememberMe = getElement('#rememberMe') as HTMLInputElement;
    rememberMe.click();
    fixture.detectChanges();

    setInputValue('#email', 'user@example.com');
    setInputValue('#password', 'password123');
    submitForm();

    expect(authService.login).toHaveBeenCalledWith('user@example.com', 'password123', true);
  });

  it('should display an error message when login fails', () => {
    authService.login.mockReturnValue(throwError(() => new Error('Unauthorized')));
    fixture.detectChanges();

    setInputValue('#email', 'user@example.com');
    setInputValue('#password', 'wrong-password');
    submitForm();

    const compiled = fixture.nativeElement as HTMLElement;
    const alert = compiled.querySelector('[role="alert"]');
    expect(alert).toBeTruthy();
    expect(alert?.textContent).toContain('Invalid email or password. Check your credentials and try again.');
    expect(router.navigate).not.toHaveBeenCalled();
  });

  it('should navigate to dashboard on successful login', () => {
    authService.login.mockReturnValue(of({ token: 'test-token' }));
    fixture.detectChanges();

    setInputValue('#email', 'user@example.com');
    setInputValue('#password', 'password123');
    submitForm();

    expect(authService.login).toHaveBeenCalledWith('user@example.com', 'password123', false);
    expect(router.navigate).toHaveBeenCalledWith(['/dashboard']);
  });
});
