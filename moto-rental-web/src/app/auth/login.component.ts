import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from './auth';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink],
  template: `
    <h1>Đăng nhập</h1>
    <p class="sub">Chưa có tài khoản? <a routerLink="/register">Đăng ký</a></p>
    <form [formGroup]="form" (ngSubmit)="submit()" novalidate>
      <label>Email
        <input type="email" formControlName="email" autocomplete="email" />
      </label>
      @if (f.email.touched && f.email.invalid) { <small class="err">Nhập email hợp lệ.</small> }

      <label>Mật khẩu
        <input type="password" formControlName="password" autocomplete="current-password" />
      </label>
      @if (f.password.touched && f.password.invalid) { <small class="err">Nhập mật khẩu.</small> }

      @if (error()) { <p class="err box" role="alert">{{ error() }}</p> }
      <button class="btn" type="submit" [disabled]="loading()">
        {{ loading() ? 'Đang đăng nhập…' : 'Đăng nhập' }}
      </button>
    </form>`
})
export class LoginComponent {
  private fb = inject(FormBuilder);
  private auth = inject(AuthService);
  private router = inject(Router);
  error = signal('');
  loading = signal(false);

  form = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', Validators.required]
  });
  get f() { return this.form.controls; }

  submit() {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    this.loading.set(true);
    this.error.set('');
    this.auth.login(this.form.getRawValue()).subscribe({
      next: () => this.router.navigateByUrl('/'),
      error: e => {
        this.error.set(e.error?.message ?? 'Không kết nối được máy chủ.');
        this.loading.set(false);
      }
    });
  }
}
