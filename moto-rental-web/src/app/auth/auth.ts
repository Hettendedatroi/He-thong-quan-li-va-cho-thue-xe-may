import { Injectable, inject, signal } from '@angular/core';
import { HttpClient, HttpInterceptorFn } from '@angular/common/http';
import { CanActivateFn, Router } from '@angular/router';
import { tap } from 'rxjs';

export interface User { id: number; fullName: string; email: string; phone: string; role: string; }
interface AuthResult { token: string; user: User; }

const API = 'http://localhost:5080/api/auth';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private http = inject(HttpClient);
  user = signal<User | null>(JSON.parse(localStorage.getItem('user') ?? 'null'));

  get token() { return localStorage.getItem('token'); }

  register(body: { fullName: string; email: string; phone: string; password: string }) {
    return this.http.post<AuthResult>(`${API}/register`, body).pipe(tap(r => this.save(r)));
  }
  login(body: { email: string; password: string }) {
    return this.http.post<AuthResult>(`${API}/login`, body).pipe(tap(r => this.save(r)));
  }
  me() { return this.http.get<User>(`${API}/me`); }
  logout() { localStorage.removeItem('token'); localStorage.removeItem('user'); this.user.set(null); }

  private save(r: AuthResult) {
    localStorage.setItem('token', r.token);
    localStorage.setItem('user', JSON.stringify(r.user));
    this.user.set(r.user);
  }
}

// Gắn token vào mọi request
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const t = inject(AuthService).token;
  return next(t ? req.clone({ setHeaders: { Authorization: `Bearer ${t}` } }) : req);
};

// Chặn vào trang chính nếu chưa đăng nhập
export const authGuard: CanActivateFn = () =>
  inject(AuthService).token ? true : inject(Router).createUrlTree(['/login']);
