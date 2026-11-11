import { signal } from '@angular/core';
import { ComponentFixture, fakeAsync, TestBed, tick } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { of } from 'rxjs';
import { AuthService, User } from '../auth/auth';
import { QaBugSeedService } from '../qa-bug-seeds';
import { HomeComponent } from './home.component';

describe('HomeComponent', () => {
  const customer: User = {
    id: 2,
    fullName: 'QA Customer',
    email: 'customer@example.com',
    phone: '0912345678',
    role: 'Customer',
    isDemoAccount: false
  };
  const admin: User = { ...customer, role: 'Admin' };
  const enabledBugIds = new Set<string>();
  const authMock = {
    user: signal<User | null>(customer),
    isDemoAccount: signal(false),
    me: jasmine.createSpy('me').and.returnValue(of(customer)),
    refreshUser: jasmine.createSpy('refreshUser'),
    logout: jasmine.createSpy('logout'),
    updateProfile: jasmine.createSpy('updateProfile').and.returnValue(of(customer)),
    exportDemoRentals: jasmine.createSpy('exportDemoRentals').and.returnValue(of(new Blob()))
  };
  const qaBugMock = {
    load: jasmine.createSpy('load'),
    isBugEnabled: (bugId: string) => enabledBugIds.has(bugId)
  };

  let fixture: ComponentFixture<HomeComponent>;
  let component: HomeComponent;
  let router: Router;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HomeComponent],
      providers: [
        provideRouter([]),
        { provide: AuthService, useValue: authMock },
        { provide: QaBugSeedService, useValue: qaBugMock }
      ]
    }).compileComponents();
  });

  beforeEach(() => {
    enabledBugIds.clear();
    authMock.user.set(customer);
    authMock.isDemoAccount.set(false);
    authMock.me.calls.reset();
    authMock.refreshUser.calls.reset();
    authMock.logout.calls.reset();
    authMock.updateProfile.calls.reset();
    authMock.exportDemoRentals.calls.reset();
    qaBugMock.load.calls.reset();
    fixture = TestBed.createComponent(HomeComponent);
    component = fixture.componentInstance;
    router = TestBed.inject(Router);
    spyOn(router, 'navigateByUrl').and.returnValue(Promise.resolve(true));
    fixture.detectChanges();
  });

  it('searches and filters immediately in Normal Mode without losing the session', () => {
    component.onSearchChange('honda');
    component.selectCategory('Xe số');

    expect(component.filteredMotorcycles.map(motorcycle => motorcycle.name)).toEqual(['Honda Wave RSX']);
    expect(component.searchPending).toBeFalse();
    expect(authMock.logout).not.toHaveBeenCalled();
  });

  it('sorts numeric daily prices from low to high in Normal Mode', () => {
    component.sortOrder = 'price-asc';

    expect(component.filteredMotorcycles.map(motorcycle => motorcycle.price))
      .toEqual([150000, 180000, 250000, 350000]);
  });

  it('shows loading and delays combined QA search and filter results for 2 seconds', fakeAsync(() => {
    enabledBugIds.add('BUG-03');
    component.onSearchChange('Honda');
    expect(component.filteredMotorcycles.map(motorcycle => motorcycle.name)).toEqual([
      'Honda Vision', 'Honda Wave RSX'
    ]);

    component.selectCategory('Xe số');

    expect(component.searchPending).toBeTrue();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('[role="status"]').textContent).toContain('Đang tìm xe');
    expect(fixture.nativeElement.querySelector('.motorcycle-grid').getAttribute('aria-busy')).toBe('true');
    expect(component.filteredMotorcycles.map(motorcycle => motorcycle.name)).toEqual([
      'Honda Vision', 'Honda Wave RSX'
    ]);
    tick(1999);
    expect(component.searchPending).toBeTrue();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.motorcycle-grid').getAttribute('aria-busy')).toBe('true');

    tick(1);
    fixture.detectChanges();
    expect(component.searchPending).toBeFalse();
    expect(fixture.nativeElement.querySelector('.motorcycle-grid').getAttribute('aria-busy')).toBe('false');
    expect(component.filteredMotorcycles.map(motorcycle => motorcycle.name)).toEqual(['Honda Wave RSX']);
  }));

  it('does not delay a standalone QA search or category selection', fakeAsync(() => {
    enabledBugIds.add('BUG-03');

    component.onSearchChange('Honda');
    expect(component.searchPending).toBeFalse();
    expect(component.filteredMotorcycles.map(motorcycle => motorcycle.name)).toEqual([
      'Honda Vision', 'Honda Wave RSX'
    ]);

    component.onSearchChange('');
    component.selectCategory('Xe số');
    expect(component.searchPending).toBeFalse();
    expect(component.filteredMotorcycles.map(motorcycle => motorcycle.name)).toEqual(['Honda Wave RSX']);
    tick(2000);
    expect(component.searchPending).toBeFalse();
  }));

  it('cancels stale combined searches and applies only the latest criteria', fakeAsync(() => {
    enabledBugIds.add('BUG-03');
    component.selectCategory('Xe số');
    component.onSearchChange('Honda');
    tick(1000);

    component.onSearchChange('Yamaha');
    expect(component.searchPending).toBeTrue();
    tick(1000);

    component.selectCategory('Xe tay ga');
    expect(component.searchPending).toBeTrue();
    tick(1999);
    expect(component.searchPending).toBeTrue();
    expect(component.filteredMotorcycles.map(motorcycle => motorcycle.name)).toEqual(['Honda Wave RSX']);

    tick(1);
    expect(component.searchPending).toBeFalse();
    expect(component.filteredMotorcycles.map(motorcycle => motorcycle.name)).toEqual(['Yamaha Grande']);
  }));

  it('shows the empty state after a delayed search with no matching vehicles', fakeAsync(() => {
    enabledBugIds.add('BUG-03');
    component.selectCategory('Xe số');
    component.onSearchChange('Yamaha');
    expect(component.searchPending).toBeTrue();

    tick(2000);
    expect(component.searchPending).toBeFalse();
    expect(component.filteredMotorcycles).toEqual([]);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.empty-state')).not.toBeNull();
  }));

  it('applies combined search immediately when BUG-03 is disabled', fakeAsync(() => {
    enabledBugIds.add('BUG-03');
    component.selectCategory('Xe số');
    component.onSearchChange('Honda');
    expect(component.searchPending).toBeTrue();

    enabledBugIds.delete('BUG-03');
    component.onSearchChange('Honda Wave');
    expect(component.searchPending).toBeFalse();
    expect(component.filteredMotorcycles.map(motorcycle => motorcycle.name)).toEqual(['Honda Wave RSX']);
    tick(2000);
    expect(component.filteredMotorcycles.map(motorcycle => motorcycle.name)).toEqual(['Honda Wave RSX']);
  }));

  it('applies the BUG-02 layout class only when selected', () => {
    enabledBugIds.add('BUG-02');
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.fleet-toolbar.qa-bug-02')).not.toBeNull();
  });

  it('shows the wrong price unit for BUG-04 and daily units otherwise', () => {
    const exciter = component.motorcycles.find(motorcycle => motorcycle.name === 'Yamaha Exciter 155')!;
    expect(component.priceUnit(exciter)).toBe('ngày');

    enabledBugIds.add('BUG-04');
    expect(component.priceUnit(exciter)).toBe('giờ');
  });

  it('only logs out the server-designated demo Customer for BUG-05', () => {
    enabledBugIds.add('BUG-05');
    component.selectCategory('Xe số');
    expect(authMock.logout).not.toHaveBeenCalled();

    authMock.isDemoAccount.set(true);
    component.selectCategory('Xe số');
    expect(authMock.logout).toHaveBeenCalledTimes(1);
    expect(router.navigateByUrl).toHaveBeenCalledWith('/login');

    authMock.logout.calls.reset();
    authMock.user.set(admin);
    authMock.isDemoAccount.set(true);
    component.selectCategory('Xe số');
    expect(authMock.logout).not.toHaveBeenCalled();
  });

  it('logs out only the demo Customer for Honda Wave RSX, not other users or bikes', () => {
    const wave = component.motorcycles.find(motorcycle => motorcycle.name === 'Honda Wave RSX')!;
    const vision = component.motorcycles.find(motorcycle => motorcycle.name === 'Honda Vision')!;
    enabledBugIds.add('BUG-06');

    component.openBooking(wave);
    expect(component.selectedMotorcycle).toBe(wave);
    expect(authMock.logout).not.toHaveBeenCalled();

    authMock.isDemoAccount.set(true);
    component.openBooking(vision);
    expect(component.selectedMotorcycle).toBe(vision);
    expect(authMock.logout).not.toHaveBeenCalled();

    component.openBooking(wave);
    expect(authMock.logout).toHaveBeenCalledTimes(1);
    expect(router.navigateByUrl).toHaveBeenCalledWith('/login');

    authMock.logout.calls.reset();
    authMock.user.set(admin);
    component.openBooking(wave);
    expect(authMock.logout).not.toHaveBeenCalled();
  });

  it('keeps Admin logged in when confirming a sample order unless BUG-01 is enabled', () => {
    authMock.user.set(admin);
    component.confirmRental('MG-2024-084');
    expect(component.confirmedRentalIds).toContain('MG-2024-084');
    expect(authMock.logout).not.toHaveBeenCalled();

    enabledBugIds.add('BUG-01');
    component.confirmRental('MG-2024-084');
    expect(authMock.logout).toHaveBeenCalledTimes(1);
    expect(router.navigateByUrl).toHaveBeenCalledWith('/login');
  });

  it('reverses only ascending sort for the demo Customer and supports descending sort', () => {
    component.sortOrder = 'price-asc';
    enabledBugIds.add('BUG-11');

    expect(component.filteredMotorcycles.map(motorcycle => motorcycle.price))
      .toEqual([150000, 180000, 250000, 350000]);

    authMock.isDemoAccount.set(true);
    expect(component.filteredMotorcycles.map(motorcycle => motorcycle.price))
      .toEqual([350000, 250000, 180000, 150000]);

    component.sortOrder = 'price-desc';
    expect(component.filteredMotorcycles.map(motorcycle => motorcycle.price))
      .toEqual([350000, 250000, 180000, 150000]);
  });

  it('preserves search and category filters while sorting prices', () => {
    component.onSearchChange('Honda');
    component.selectCategory('Xe số');
    component.sortOrder = 'price-desc';

    expect(component.filteredMotorcycles.map(motorcycle => motorcycle.name)).toEqual(['Honda Wave RSX']);
  });

  it('exposes default, ascending, and descending sort choices to customers', () => {
    const optionNodes = fixture.nativeElement.querySelectorAll(
      '.sort-control option'
    ) as NodeListOf<HTMLOptionElement>;
    const options = Array.from(optionNodes).map(option => option.value);

    expect(options).toEqual(['default', 'price-asc', 'price-desc']);
  });

  it('submits the current profile fields without adding a role', () => {
    component.profileName = 'Updated Customer';
    component.profilePhone = '0987654321';
    component.saveProfile();

    expect(authMock.updateProfile).toHaveBeenCalledWith({
      fullName: 'Updated Customer',
      phone: '0987654321'
    });
  });

  it('submits the rental demo by showing its local completion state', () => {
    const wave = component.motorcycles.find(motorcycle => motorcycle.name === 'Honda Wave RSX')!;
    component.openBooking(wave);
    component.submitBooking();

    expect(component.bookingComplete).toBeTrue();
    expect(authMock.me).toHaveBeenCalledTimes(1);
  });
});
