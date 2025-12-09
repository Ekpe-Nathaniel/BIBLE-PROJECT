import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BibleService, Book } from '../services/bible.service';
import { SearchService } from '../services/search.service';

@Component({
  selector: 'app-nav-bar',
  imports: [CommonModule],
  templateUrl: './nav-bar.html',
  styleUrl: './nav-bar.css'
})
export class NavBar implements OnInit {
  private bibleService = inject(BibleService);
  private searchService = inject(SearchService);

  searchTerm = signal('');
  books = signal<Book[]>([]);
  filteredBooks = signal<Book[]>([]);

  ngOnInit(): void {
    this.loadBooks();
  }

  loadBooks(): void {
    this.bibleService.getBooks('kjv').subscribe(
      (data: any) => {
        this.books.set(data);
      },
      (error) => {
        console.error('Failed to load books', error);
      }
    );
  }

  onSearchInput(value: string): void {
    this.searchTerm.set(value);
    if (value.length > 0) {
      const lowerCaseValue = value.toLowerCase();
      this.filteredBooks.set(
        this.books().filter(
          (book) =>
            book.name.toLowerCase().includes(lowerCaseValue) ||
            book.abbreviation.toLowerCase().includes(lowerCaseValue)
        )
      );
    } else {
      this.filteredBooks.set([]);
    }
  }

  selectBook(book: Book): void {
    this.searchService.selectedBook.set(book);
    this.searchTerm.set('');
    this.filteredBooks.set([]);
  }
}
