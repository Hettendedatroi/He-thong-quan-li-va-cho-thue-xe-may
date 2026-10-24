import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';

@Component({
  selector: 'app-auth-layout',
  standalone: true,
  imports: [RouterOutlet],
  template: `
    <main class="auth">
      <aside class="auth-aside">
        <p class="brand">MotoRental</p>
        <div>
          <h2>Chọn xe, chọn ngày, nhận xe tại cửa hàng.</h2>
          <p>Kiểm tra xe trống theo ngày và theo dõi đơn thuê của bạn ở một nơi.</p>
        </div>
        <div class="lane" aria-hidden="true"></div>
      </aside>
      <section class="auth-main"><router-outlet /></section>
    </main>`
})
export class AuthLayoutComponent {}
