import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../auth/auth';

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

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './home.component.html'
})
export class HomeComponent implements OnInit {
  auth = inject(AuthService);
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

  selectedCategory = 'Tất cả xe';
  searchTerm = '';
  favoriteNames: string[] = [];
  selectedMotorcycle: Motorcycle | null = null;
  bookingComplete = false;
  startDate = new Date().toISOString().slice(0, 10);
  endDate = new Date(Date.now() + 86400000).toISOString().slice(0, 10);

  get isAdmin(): boolean {
    return this.auth.user()?.role === 'Admin';
  }

  get filteredMotorcycles(): Motorcycle[] {
    const query = this.searchTerm.trim().toLocaleLowerCase('vi');
    return this.motorcycles.filter(motorcycle => {
      const matchesCategory = this.selectedCategory === 'Tất cả xe' || motorcycle.type === this.selectedCategory;
      const matchesQuery = !query || `${motorcycle.name} ${motorcycle.type}`.toLocaleLowerCase('vi').includes(query);
      return matchesCategory && matchesQuery;
    });
  }

  ngOnInit(): void {
    this.auth.me().subscribe({ error: () => this.logout() });
  }

  openBooking(motorcycle: Motorcycle): void {
    this.selectedMotorcycle = motorcycle;
    this.bookingComplete = false;
  }

  toggleFavorite(name: string): void {
    this.favoriteNames = this.favoriteNames.includes(name)
      ? this.favoriteNames.filter(favorite => favorite !== name)
      : [...this.favoriteNames, name];
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
}
