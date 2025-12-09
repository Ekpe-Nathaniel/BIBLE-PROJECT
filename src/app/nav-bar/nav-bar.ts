import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BibleService, Book } from '../services/bible.service';
import { SearchService } from '../services/search.service';

@Component({
  selector: 'app-nav-bar',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './nav-bar.html',
  styleUrls: ['./nav-bar.css']
})
export class NavBar implements OnInit {

  private bibleService = inject(BibleService);
  private searchService = inject(SearchService);

  searchTerm = '';
  filteredResults: string[] = [];
  allBooks: string[] = [];   // now dynamic

  ngOnInit() {
    this.bibleService.getBooks('kjv').subscribe((books: Book[]) => {
      this.allBooks = books.map(b => b.name); 
      console.log('Loaded books:', this.allBooks);
    });
  }

  onSearch(event: Event) {
    const input = event.target as HTMLInputElement;
    this.searchTerm = input.value.toLowerCase();

    if (!this.searchTerm.trim()) {
      this.filteredResults = [];
      return;
    }

    this.filteredResults = this.allBooks.filter(book =>
      book.toLowerCase().includes(this.searchTerm)
    );
  }

  selectResult(book: string) {
    this.searchTerm = book;
    this.filteredResults = [];

    console.log("User selected:", book);
  }

  executeSearch() {
    const term = this.searchTerm ? this.searchTerm.trim() : '';
    if (!term) {
      return;
    }

    // Try exact book match first, otherwise treat as verse search
    const matchedBook = this.allBooks.find(b => b.toLowerCase() === term.toLowerCase()) || null;

    const detail = { term, book: matchedBook };

    // Emit through the SearchService for Angular consumers
    // If no exact book match, this will trigger a verse search in the viewer
    this.searchService.emit(term, matchedBook);

    // Keep the existing CustomEvent for any non-Angular listeners
    try {
      window.dispatchEvent(new CustomEvent('nav-search', { detail }));
    } catch (e) {
      // ignore - older browsers or environments
    }

    console.log('Search executed:', detail);

    // clear preview results after executing search
    this.filteredResults = [];
  }
}
