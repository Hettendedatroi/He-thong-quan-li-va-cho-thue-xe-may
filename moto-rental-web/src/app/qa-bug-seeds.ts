import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../environments/environment';

interface QaBugSeedResponse {
  bugIds: string[];
}

@Injectable({ providedIn: 'root' })
export class QaBugSeedService {
  private readonly http = inject(HttpClient);
  private readonly enabledBugIds = signal<ReadonlySet<string>>(new Set());

  load(): void {
    if (!environment.qaBugSeedLookup) return;

    this.http.get<QaBugSeedResponse>(`${environment.apiUrl}/qa/bug-seeds`).subscribe({
      next: response => this.enabledBugIds.set(new Set(response.bugIds)),
      error: error => console.error('Unable to load QA bug-seed configuration.', error)
    });
  }

  isBugEnabled(bugId: string): boolean {
    return this.enabledBugIds().has(bugId);
  }
}
