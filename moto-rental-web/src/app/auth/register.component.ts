import { Component, inject, signal } from '@angular/core';
import { AbstractControl, FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from './auth';

const samePassword = (g: AbstractControl) =>
  g.get('password')?.value === g.get('confirm')?.value ? null : { mismatch: true };

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink],
  template: `
    <h1>Tạo tài khoản</h1>
    <p class="sub">Đã có tài khoản? <a routerLink="/login">Đăng nhập</a></p>
    <form [formGroup]="form" (ngSubmit)="submit()" novalidate>
      <label>Họ và tên
        <input formControlName="fullName" autocomplete="name" />
      </label>
      @if (f.fullName.touched && f.fullName.invalid) { <small class="err">Nhập họ và tên.</small> }

      <label>Email
        <input type="email" formControlName="email" autocomplete="email" />
      </label>
      @if (f.email.touched && f.email.invalid) { <small class="err">Nhập email hợp lệ.</small> }

      <label>Số điện thoại
        <input type="tel" formControlName="phone" autocomplete="tel" />
      </label>
      @if (f.phone.touched && f.phone.invalid) { <small class="err">Số điện thoại gồm 10 chữ số, bắt đầu bằng 0.</small> }

      <label>Mật khẩu
        <input type="password" formControlName="password" autocomplete="new-password" />
      </label>
      @if (f.password.touched && f.password.invalid) { <small class="err">Mật khẩu tối thiểu 6 ký tự.</small> }

      <label>Nhập lại mật khẩu
        <input type="password" formControlName="confirm" autocomplete="new-password" />
      </label>
      @if (f.confirm.touched && form.hasError('mismatch')) { <small class="err">Mật khẩu nhập lại chưa khớp.</small> }

      @if (error()) { <p class="err box" role="alert">{{ error() }}</p> }
      <button class="btn" type="submit" [disabled]="loading()">
        {{ loading() ? 'Đang tạo tài khoản…' : 'Tạo tài khoản' }}
      </button>
    </form>`
})
export class RegisterComponent {
  private fb = inject(FormBuilder);
  private auth = inject(AuthService);
  private router = inject(Router);
  error = signal('');
  loading = signal(false);

  form = this.fb.nonNullable.group({
    fullName: ['', Validators.required],
    email: ['', [Validators.required, Validators.email]],
    phone: ['', [Validators.required, Validators.pattern(/^0\d{9}$/)]],
    password: ['', [Validators.required, Validators.minLength(6)]],
    confirm: ['', Validators.required]
  }, { validators: samePassword });
  get f() { return this.form.controls; }

  submit() {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    this.loading.set(true);
    this.error.set('');
    const { confirm, ...body } = this.form.getRawValue();
    this.auth.register(body).subscribe({
      next: () => this.router.navigateByUrl('/'),
      error: e => {
        this.error.set(e.error?.message ?? 'Không kết nối được máy chủ.');
        this.loading.set(false);
      }
    });
  }
}
