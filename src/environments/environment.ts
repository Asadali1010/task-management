export const environment = {
  production: false,
  apiUrl: 'http://localhost:8080/api',
  // Dev-only: no backend is wired up yet, so fake a successful /auth/login response.
  // Flip to false once a real backend is available.
  mockAuth: true,
};
