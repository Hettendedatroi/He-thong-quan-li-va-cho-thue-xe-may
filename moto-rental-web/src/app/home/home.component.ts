import { Component, inject, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../auth/auth';

@Component({
  selector: 'app-home',
  standalone: true,
  template: `
    <header class="topbar">
      <strong>MotoRental</strong>
      <span class="who">{{ auth.user()?.fullName }} ({{ isAdmin ? 'Quản trị viên' : 'Khách thuê' }})</span>
      <button class="btn ghost" (click)="logout()">Đăng xuất</button>
    </header>
    <main class="home">
      <h1>Xin chào, {{ auth.user()?.fullName }}</h1>
      <p class="sub">Bạn đã đăng nhập bằng {{ auth.user()?.email }}.</p>
      <ul class="menu">
        @if (isAdmin) {
          <li><b>Quản lý xe</b><span>FR-10 đến FR-13 · sắp làm</span></li>
          <li><b>Đơn thuê</b><span>FR-30 đến FR-36 · sắp làm</span></li>
          <li><b>Báo cáo doanh thu</b><span>FR-70 đến FR-72 · sắp làm</span></li>
        } @else {
          <li><b>Tìm và đặt xe</b><span>FR-12, FR-20 đến FR-22 · sắp làm</span></li>
          <li><b>Đơn thuê của tôi</b><span>FR-25 · sắp làm</span></li>
        }
      </ul>
    </main>`
})
export class HomeComponent implements OnInit {
  auth = inject(AuthService);
  private router = inject(Router);
  get isAdmin() { return this.auth.user()?.role === 'Admin'; }

  // Kiểm tra token còn hiệu lực; hết hạn thì quay về trang đăng nhập
  ngOnInit() { this.auth.me().subscribe({ error: () => this.logout() }); }
  logout() { this.auth.logout(); this.router.navigateByUrl('/login'); }
}
