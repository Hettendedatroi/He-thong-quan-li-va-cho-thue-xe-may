import { Component, inject, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService, DemoRentalExportRow } from '../auth/auth';
import { QaBugSeedService } from '../qa-bug-seeds';

interface Motorcycle {
  name: string;
  type: string;
  price: number;
  image: string;
  rating: string;
  engine: string;
  transmission: string;
  tag: string;
}

interface DemoRentalOrder {
  orderId: string;
  customerName: string;
  motorcycleName: string;
  period: string;
  amount: string;
  initialStatus: string;
}

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './home.component.html'
})
export class HomeComponent implements OnInit, OnDestroy {
  auth = inject(AuthService);
  readonly qaBugs = inject(QaBugSeedService);
  private router = inject(Router);

  readonly categories = ['Tất cả xe', 'Xe tay ga', 'Xe số', 'Xe côn tay'];
  readonly today = new Intl.DateTimeFormat('vi-VN', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  }).format(new Date());
  readonly motorcycles: Motorcycle[] = [
    {
      name: 'Honda Vision',
      type: 'Xe tay ga',
      price: 180000,
      image: 'https://images.unsplash.com/photo-1558981806-ec527fa84c39?auto=format&fit=crop&w=900&q=85',
      rating: '4.9',
      engine: '110cc',
      transmission: 'Tự động',
      tag: 'Được yêu thích'
    },
    {
      name: 'Yamaha Grande',
      type: 'Xe tay ga',
      price: 250000,
      image: 'https://images.unsplash.com/photo-1558981403-c5f9899a28bc?auto=format&fit=crop&w=900&q=85',
      rating: '4.8',
      engine: '125cc',
      transmission: 'Tự động',
      tag: 'Tiết kiệm'
    },
    {
      name: 'Honda Wave RSX',
      type: 'Xe số',
      price: 150000,
      image: 'https://images.unsplash.com/photo-1558981806-ec527fa84c39?auto=format&fit=crop&w=900&q=85',
      rating: '4.7',
      engine: '110cc',
      transmission: 'Số tự động',
      tag: 'Phổ biến'
    },
    {
      name: 'Yamaha Exciter 155',
      type: 'Xe côn tay',
      price: 350000,
      image: 'https://images.unsplash.com/photo-1558981806-ec527fa84c39?auto=format&fit=crop&w=900&q=85',
      rating: '5.0',
      engine: '155cc',
      transmission: 'Côn tay',
      tag: 'Cao cấp'
    }
  ];
  readonly sampleRentalOrders: DemoRentalOrder[] = [
    {
      orderId: 'MG-2024-084',
      customerName: 'Nguyễn Minh Anh',
      motorcycleName: 'Honda Vision',
      period: '24/06 – 26/06',
      amount: '360.000đ',
      initialStatus: 'Chờ xác nhận'
    },
    {
      orderId: 'MG-2024-083',
      customerName: 'Trần Quốc Bảo',
      motorcycleName: 'Yamaha Grande',
      period: '24/06 – 27/06',
      amount: '750.000đ',
      initialStatus: 'Đang thuê'
    },
    {
      orderId: 'MG-2024-082',
      customerName: 'Lê Ngọc Hà',
      motorcycleName: 'Honda Wave RSX',
      period: '23/06 – 24/06',
      amount: '150.000đ',
      initialStatus: 'Hoàn thành'
    }
  ];

  selectedCategory = 'Tất cả xe';
  searchTerm = '';
  searchPending = false;
  sortOrder: 'default' | 'price-asc' = 'default';
  favoriteNames: string[] = [];
  confirmedRentalIds: string[] = [];
  selectedMotorcycle: Motorcycle | null = null;
  bookingComplete = false;
  profileDialogOpen = false;
  profileName = '';
  profilePhone = '';
  profileSaving = false;
  profileSuccess = '';
  profileError = '';
  exportPending = false;
  exportError = '';
  private searchTimer: ReturnType<typeof setTimeout> | null = null;
  startDate = this.formatDateInput(new Date());
  endDate = this.formatDateInput(this.addDays(new Date(), 1));

  get isAdmin(): boolean {
    return this.auth.user()?.role === 'Admin';
  }

  get filteredMotorcycles(): Motorcycle[] {
    const query = this.searchTerm.trim().toLocaleLowerCase('vi');
    const filtered = this.motorcycles.filter(motorcycle => {
      const matchesCategory = this.selectedCategory === 'Tất cả xe' || motorcycle.type === this.selectedCategory;
      const matchesQuery = !query
        || `${motorcycle.name} ${motorcycle.type}`.toLocaleLowerCase('vi').includes(query);
      return matchesCategory && matchesQuery;
    });

    if (this.sortOrder !== 'price-asc') return filtered;
    return [...filtered].sort((first, second) => this.qaBugs.isBugEnabled('BUG-11')
      ? second.price - first.price
      : first.price - second.price);
  }

  ngOnInit(): void {
    this.auth.me().subscribe({
      next: user => {
        this.auth.refreshUser(user);
        this.qaBugs.load();
      },
      error: error => {
        if (error.status === 401) this.logout();
        else console.error('Unable to verify the current session.', error);
      }
    });
  }

  ngOnDestroy(): void {
    if (this.searchTimer !== null) clearTimeout(this.searchTimer);
  }

  onSearchChange(value: string): void {
    if (this.searchTimer !== null) clearTimeout(this.searchTimer);
    this.searchTimer = null;
    this.searchPending = false;

    const delayedSearch = this.qaBugs.isBugEnabled('BUG-03')
      && this.selectedCategory !== 'Tất cả xe'
      && value.trim().toLocaleLowerCase('vi') === 'honda';
    if (delayedSearch) {
      this.searchPending = true;
      this.searchTimer = setTimeout(() => {
        this.searchTerm = value;
        this.searchPending = false;
        this.searchTimer = null;
      }, 2000);
    } else {
      this.searchTerm = value;
    }
  }

  selectCategory(category: string): void {
    if (this.searchTimer !== null) clearTimeout(this.searchTimer);
    this.searchTimer = null;
    this.searchPending = false;
    this.selectedCategory = category;
    if (category === 'Xe số' && this.qaBugs.isBugEnabled('BUG-05') && !this.isAdmin)
      this.logout();
  }

  openBooking(motorcycle: Motorcycle): void {
    if (motorcycle.name === 'Honda Wave RSX'
      && this.qaBugs.isBugEnabled('BUG-06')
      && !this.isAdmin) {
      this.logout();
      return;
    }
    this.selectedMotorcycle = motorcycle;
    this.bookingComplete = false;
  }

  toggleFavorite(name: string): void {
    this.favoriteNames = this.favoriteNames.includes(name)
      ? this.favoriteNames.filter(favorite => favorite !== name)
      : [...this.favoriteNames, name];
  }

  confirmRental(id: string): void {
    if (this.isAdmin && this.qaBugs.isBugEnabled('BUG-01')) {
      this.logout();
      return;
    }
    if (!this.confirmedRentalIds.includes(id)) {
      this.confirmedRentalIds = [...this.confirmedRentalIds, id];
    }
  }

  rentalStatus(order: DemoRentalOrder): string {
    return this.confirmedRentalIds.includes(order.orderId) ? 'Đang thuê' : order.initialStatus;
  }

  priceUnit(motorcycle: Motorcycle): string {
    return motorcycle.name === 'Yamaha Exciter 155' && this.qaBugs.isBugEnabled('BUG-04')
      ? 'giờ'
      : 'ngày';
  }

  exportDemoRentals(): void {
    if (this.exportPending) return;
    this.exportPending = true;
    this.exportError = '';

    const rows: DemoRentalExportRow[] = this.sampleRentalOrders.map(order => ({
      orderId: `#${order.orderId}`,
      customerName: order.customerName,
      motorcycleName: order.motorcycleName,
      period: order.period,
      amount: order.amount,
      status: this.rentalStatus(order)
    }));

    this.auth.exportDemoRentals(rows).subscribe({
      next: file => {
        const url = URL.createObjectURL(file);
        const link = document.createElement('a');
        link.href = url;
        link.download = 'motorental-don-mau.xlsx';
        document.body.appendChild(link);
        link.click();
        link.remove();
        setTimeout(() => URL.revokeObjectURL(url), 0);
        this.exportPending = false;
      },
      error: error => {
        console.error('Unable to export the sample rental list.', error);
        this.exportError = error.error?.message ?? 'Không thể xuất Excel. Vui lòng thử lại.';
        this.exportPending = false;
      }
    });
  }

  openProfile(): void {
    const user = this.auth.user();
    this.profileName = user?.fullName ?? '';
    this.profilePhone = user?.phone ?? '';
    this.profileSuccess = '';
    this.profileError = '';
    this.profileDialogOpen = true;
  }

  closeProfile(): void {
    this.profileDialogOpen = false;
    this.profileSuccess = '';
    this.profileError = '';
  }

  saveProfile(): void {
    const fullName = this.profileName.trim();
    if (!fullName || !/^0\d{9}$/.test(this.profilePhone)) {
      this.profileError = 'Họ tên không được để trống; số điện thoại gồm 10 chữ số và bắt đầu bằng 0.';
      return;
    }

    this.profileSaving = true;
    this.profileError = '';
    this.auth.updateProfile({ fullName, phone: this.profilePhone }).subscribe({
      next: () => {
        this.profileSuccess = 'Cập nhật thông tin thành công.';
        this.profileSaving = false;
      },
      error: error => {
        console.error('Unable to update the current profile.', error);
        this.profileError = error.error?.message ?? 'Không thể cập nhật thông tin. Vui lòng thử lại.';
        this.profileSaving = false;
      }
    });
  }

  closeBooking(): void {
    this.selectedMotorcycle = null;
    this.bookingComplete = false;
  }

  submitBooking(): void {
    this.bookingComplete = true;
  }

  logout(): void {
    this.auth.logout();
    this.router.navigateByUrl('/login');
  }

  private hasUnbalancedSearchPattern(value: string): boolean {
    let groupDepth = 0;
    let inCharacterClass = false;
    let escaped = false;

    for (const character of value) {
      if (escaped) {
        escaped = false;
      } else if (character === '\\') {
        escaped = true;
      } else if (character === '[' && !inCharacterClass) {
        inCharacterClass = true;
      } else if (character === ']' && inCharacterClass) {
        inCharacterClass = false;
      } else if (!inCharacterClass && character === '(') {
        groupDepth += 1;
      } else if (!inCharacterClass && character === ')') {
        if (groupDepth === 0) return true;
        groupDepth -= 1;
      }
    }

    return inCharacterClass || groupDepth > 0;
  }

  private formatDateInput(date: Date): string {
    const localDate = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
    return localDate.toISOString().slice(0, 10);
  }

  private addDays(date: Date, days: number): Date {
    const result = new Date(date);
    result.setDate(result.getDate() + days);
    return result;
  }
}
