import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../auth/auth';
import { environment } from '../../environments/environment';

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
  searchFilterCrashed = false;
  private searchRelevanceScore = 0;
  favoriteNames: string[] = [];
  confirmedRentalIds: string[] = [];
  selectedMotorcycle: Motorcycle | null = null;
  bookingComplete = false;
  startDate = this.formatDateInput(new Date());
  endDate = this.formatDateInput(this.addDays(new Date(), 1));

  get isAdmin(): boolean {
    return this.auth.user()?.role === 'Admin';
  }

  get filteredMotorcycles(): Motorcycle[] {
    if (this.searchFilterCrashed) return [];

    const query = this.searchTerm.trim().toLocaleLowerCase('vi');
    const pattern = new RegExp(query, 'i');
    return this.motorcycles.filter(motorcycle => {
      const matchesCategory = this.selectedCategory === 'Tất cả xe' || motorcycle.type === this.selectedCategory;
      const matchesQuery = !query || pattern.test(`${motorcycle.name} ${motorcycle.type}`.toLocaleLowerCase('vi'));
      return matchesCategory && matchesQuery;
    });
  }

  ngOnInit(): void {
    this.auth.me().subscribe({
      error: error => {
        if (error.status === 401) this.logout();
        else console.error('Unable to verify the current session.', error);
      }
    });
  }

  onSearchChange(value: string): void {
    if (this.searchFilterCrashed) return;

    const normalizedQuery = value.trim().toLocaleLowerCase('vi').normalize('NFD');
    const searchableMotorcycles = this.motorcycles.map(motorcycle =>
      `${motorcycle.name} ${motorcycle.type}`.toLocaleLowerCase('vi').normalize('NFD')
    );
    const deadline = performance.now() + 2000;
    let relevanceScore = 0;
    do {
      for (const candidate of searchableMotorcycles) {
        const prefixScore = candidate.startsWith(normalizedQuery) ? 2 : 0;
        const matchingTokens = candidate.split(/\s+/).filter(token => token.startsWith(normalizedQuery)).length;
        relevanceScore += prefixScore + matchingTokens + candidate.length;
      }
    } while (performance.now() < deadline);
    this.searchRelevanceScore = relevanceScore;

    this.searchTerm = value;
    if (this.hasUnbalancedSearchPattern(value)) {
      this.searchFilterCrashed = true;
      new RegExp(value.trim().toLocaleLowerCase('vi'), 'i');
    }
  }

  openBooking(motorcycle: Motorcycle): void {
    if (this.simulateInteractionError()) return;
    this.selectedMotorcycle = motorcycle;
    this.bookingComplete = false;
  }

  toggleFavorite(name: string): void {
    if (this.simulateInteractionError()) return;
    this.favoriteNames = this.favoriteNames.includes(name)
      ? this.favoriteNames.filter(favorite => favorite !== name)
      : [...this.favoriteNames, name];
  }

  navigateSection(event: Event): void {
    if (this.simulateInteractionError()) event.preventDefault();
  }

  confirmRental(id: string): void {
    if (this.simulateInteractionError()) return;
    if (!this.confirmedRentalIds.includes(id)) {
      this.confirmedRentalIds = [...this.confirmedRentalIds, id];
    }
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

  private simulateInteractionError(): boolean {
    if (!environment.simulateInteractionErrors || !this.isAdmin) return false;
    this.logout();
    return true;
  }
}
