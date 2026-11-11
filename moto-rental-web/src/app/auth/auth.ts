import { Injectable, inject, signal } from '@angular/core';
import { HttpClient, HttpInterceptorFn } from '@angular/common/http';
import { CanActivateFn, Router } from '@angular/router';
import { tap } from 'rxjs';
import { environment } from '../../environments/environment';

export interface User {
  id: number;
  fullName: string;
  email: string;
  phone: string;
  role: string;
  isDemoAccount?: boolean;
}
interface AuthResult { token: string; user: User; }

export interface DemoRentalExportRow {
  orderId: string;
  customerName: string;
  motorcycleName: string;
  period: string;
  amount: string;
  status: string;
}

const API = `${environment.apiUrl}/auth`;

function isUser(value: unknown): value is User {
  return typeof value === 'object' && value !== null
    && 'id' in value && typeof value.id === 'number'
    && 'fullName' in value && typeof value.fullName === 'string'
    && 'email' in value && typeof value.email === 'string'
    && 'phone' in value && typeof value.phone === 'string'
    && 'role' in value && typeof value.role === 'string';
}

function readStoredUser(): User | null {
  const storedUser = localStorage.getItem('user');
  if (storedUser === null) return null;

  try {
    const parsed: unknown = JSON.parse(storedUser);
    if (isUser(parsed)) return parsed;
  } catch (error) {
    console.warn('Stored user data is invalid and has been cleared.', error);
  }

  localStorage.removeItem('user');
  return null;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private http = inject(HttpClient);
  user = signal<User | null>(readStoredUser());
  isDemoAccount = signal(false);

  get token() { return localStorage.getItem('token'); }

  register(body: { fullName: string; email: string; phone: string; password: string }) {
    return this.http.post<AuthResult>(`${API}/register`, body).pipe(tap(r => this.save(r)));
  }
  login(body: { email: string; password: string }) {
    return this.http.post<AuthResult>(`${API}/login`, body).pipe(tap(r => this.save(r)));
  }
  me() { return this.http.get<User>(`${API}/me`); }
  refreshUser(user: User) {
    this.saveUser(user);
    this.isDemoAccount.set(user.isDemoAccount === true);
  }
  updateProfile(body: { fullName: string; phone: string }) {
    return this.http.put<User>(`${API}/me`, body).pipe(tap(user => this.saveUser(user)));
  }
  exportDemoRentals(rows: DemoRentalExportRow[]) {
    return this.http.post(`${environment.apiUrl}/admin/demo-rentals/export`, { rows }, { responseType: 'blob' });
  }
  logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    this.user.set(null);
    this.isDemoAccount.set(false);
  }

  private save(r: AuthResult) {
    localStorage.setItem('token', r.token);
    localStorage.setItem('user', JSON.stringify(r.user));
    this.user.set(r.user);
    this.isDemoAccount.set(r.user.isDemoAccount === true);
  }

  private saveUser(user: User) {
    localStorage.setItem('user', JSON.stringify(user));
    this.user.set(user);
    this.isDemoAccount.set(user.isDemoAccount === true);
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
