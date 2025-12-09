import { Injectable } from '@angular/core';
import { Subject, Observable } from 'rxjs';

export interface SearchEvent {
  term: string;
  book?: string | null;
  timestamp?: number;
}

@Injectable({ providedIn: 'root' })
export class SearchService {
  private searchSubject = new Subject<SearchEvent>();

  /** Observable stream of search events */
  search$: Observable<SearchEvent> = this.searchSubject.asObservable();

  /** Emit a search event */
  emit(term: string, book?: string | null) {
    this.searchSubject.next({ term, book: book ?? null, timestamp: Date.now() });
  }

  /** Clear search (emits empty term) */
  clear() {
    this.searchSubject.next({ term: '', book: null, timestamp: Date.now() });
  }
}
