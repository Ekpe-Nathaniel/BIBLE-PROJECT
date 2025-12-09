import { Injectable, signal } from '@angular/core';
import { Book } from './bible.service';

@Injectable({
  providedIn: 'root',
})
export class SearchService {
  selectedBook = signal<Book | null>(null);
}
