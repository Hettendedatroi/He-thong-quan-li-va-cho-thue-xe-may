import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../environments/environment';

interface QaBugSeedResponse {
  bugIds: string[];
}

@Injectable({ providedIn: 'root' })
export class QaBugSeedService {
  private readonly http = inject(HttpClient);
  private readonly enabledBugIds = signal<ReadonlySet<string>>(new Set(environment.productionBugIds));

  load(isDemoAccount: boolean): void {
    const productionBugIds = [
      ...environment.productionBugIds,
      ...(isDemoAccount ? environment.productionDemoBugIds : [])
    ];
    if (!environment.qaBugSeedLookup) {
      this.enabledBugIds.set(new Set(productionBugIds));
      return;
    }

    this.http.get<QaBugSeedResponse>(`${environment.apiUrl}/qa/bug-seeds`).subscribe({
      next: response => this.enabledBugIds.set(new Set([...productionBugIds, ...response.bugIds])),
      error: error => console.error('Unable to load QA bug-seed configuration.', error)
    });
  }

  isBugEnabled(bugId: string): boolean {
    return this.enabledBugIds().has(bugId);
  }
}
