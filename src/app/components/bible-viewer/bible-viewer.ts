import { Component, OnInit, OnDestroy, inject, signal } from '@angular/core';
import { Subscription } from 'rxjs';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { BibleService, Book } from '../../services/bible.service';
import { SearchService, SearchEvent } from '../../services/search.service';

@Component({
  selector: 'app-bible-viewer',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './bible-viewer.html',
  styleUrl: './bible-viewer.css'
})
export class BibleViewerComponent implements OnInit {
  private bibleService = inject(BibleService);
  private searchService = inject(SearchService);
  private searchSub: Subscription | null = null;
  searchMessage = signal<string | null>(null);
  private _searchNoticeTimer: any = null;

  translations = signal<any[]>([]);
  books = signal<Book[]>([]);
  chapters = signal<number[]>([]);
  verseContent = signal<any>(null);
  loading = signal(false);
  error = signal<string | null>(null);

  selectedTranslation = signal('kjv');
  selectedBook = signal('');
  selectedBookName = signal('');
  selectedChapter = signal(1);
  showChapterDialog = signal(false);

  ngOnInit(): void {
    this.loadTranslations();
    this.loadBooks();
    // Subscribe to search events emitted by the NavBar (via SearchService)
    this.searchSub = this.searchService.search$.subscribe((ev: SearchEvent) => {
      this.handleSearchEvent(ev);
    });
  }

  ngOnDestroy(): void {
    if (this.searchSub) {
      this.searchSub.unsubscribe();
      this.searchSub = null;
    }
    if (this._searchNoticeTimer) {
      clearTimeout(this._searchNoticeTimer);
      this._searchNoticeTimer = null;
    }
  }

  private handleSearchEvent(ev: SearchEvent) {
    if (!ev || !ev.term) {
      return;
    }

    const term = ev.term.trim().toLowerCase();
    if (!term) return;

    // Try exact match by name first
    const exact = this.books().find(b => b.name.toLowerCase() === term || b.abbreviation.toLowerCase() === term);
    let bookMatch = exact;

    // If no exact match, try partial includes (first match)
    if (!bookMatch) {
      bookMatch = this.books().find(b => b.name.toLowerCase().includes(term));
    }

    if (bookMatch) {
      this.selectedBook.set(bookMatch.abbreviation);
      this.selectedBookName.set(bookMatch.name);
      this.selectedChapter.set(1);
      this.loadVerses();
      // clear any previous search message
      this.searchMessage.set(null);
    } else {
      console.warn('Search term did not match any book:', ev.term);
      // show a small UI notice for the user
      this.searchMessage.set(`No book found for "${ev.term}"`);

      // clear any previous timer
      if (this._searchNoticeTimer) {
        clearTimeout(this._searchNoticeTimer);
      }
      // auto-clear message after 4 seconds
      this._searchNoticeTimer = setTimeout(() => {
        this.searchMessage.set(null);
        this._searchNoticeTimer = null;
      }, 4000);
    }
  }

  loadTranslations(): void {
    this.bibleService.getTranslations().subscribe(
      (data: any) => {
        this.translations.set(data);
      },
      (error) => {
        this.error.set('Failed to load translations');
        console.error(error);
      }
    );
  }

  loadBooks(): void {
    this.loading.set(true);
    this.bibleService.getBooks(this.selectedTranslation()).subscribe(
      (data: any) => {
        this.books.set(data);
        this.loading.set(false);
        this.loadDefaultBook();
      },
      (error) => {
        this.error.set('Failed to load books');
        console.error(error);
        this.loading.set(false);
      }
    );
  }

  loadDefaultBook(): void {
    console.log('Available books:', this.books());
    const genesisBook = this.books().find((b) => b.name.toLowerCase().includes('genesis') || b.abbreviation === 'gen');
    console.log('Genesis book found:', genesisBook);
    if (genesisBook) {
      this.selectedBook.set(genesisBook.abbreviation);
      this.selectedBookName.set(genesisBook.name);
      this.loadVerses();
    } else {
      const firstBook = this.books()[0];
      if (firstBook) {
        this.selectedBook.set(firstBook.abbreviation);
        this.selectedBookName.set(firstBook.name);
        this.loadVerses();
      }
    }
  }

  onTranslationChange(event: Event): void {
    const target = event.target as HTMLSelectElement;
    this.selectedTranslation.set(target.value);
    this.loadBooks();
    this.selectedBook.set('');
    this.selectedBookName.set('');
    this.selectedChapter.set(1);
    this.verseContent.set(null);
    this.chapters.set([]);
  }

  onBookSelect(event: Event): void {
    const target = event.target as HTMLSelectElement;
    const bookValue = target.value;
    if (bookValue) {
      const book = this.books().find((b) => b.abbreviation === bookValue);
      if (book) {
        this.selectedBook.set(bookValue);
        this.selectedBookName.set(book.name);
        this.loading.set(true);
        this.bibleService.getChapters(this.selectedTranslation(), bookValue).subscribe(
          (numChapters: number) => {
            const chaptersArray = Array.from(
              { length: numChapters },
              (_, i) => i + 1
            );
            this.chapters.set(chaptersArray);
            this.selectedChapter.set(1);
            this.showChapterDialog.set(true);
            this.loading.set(false);
          },
          (error) => {
            this.error.set('Failed to load chapters');
            console.error(error);
            this.loading.set(false);
          }
        );
      }
    }
  }

  onChapterSelect(): void {
    this.showChapterDialog.set(false);
    this.loadVerses();
  }

  closeChapterDialog(): void {
    this.showChapterDialog.set(false);
  }

  loadVerses(): void {
    if (!this.selectedBook()) {
      return;
    }

    this.loading.set(true);
    this.bibleService
      .getVerses(this.selectedTranslation(), this.selectedBook(), this.selectedChapter())
      .subscribe(
        (data: any) => {
          this.verseContent.set(data);
          this.loading.set(false);
        },
        (error) => {
          this.error.set('Failed to load verses');
          console.error(error);
          this.loading.set(false);
        }
      );
  }

  previousChapter(): void {
    if (this.selectedChapter() > 1) {
      this.selectedChapter.update((ch) => ch - 1);
      this.loadVerses();
    }
  }

  nextChapter(): void {
    const maxChapter = this.chapters().length;
    if (this.selectedChapter() < maxChapter) {
      this.selectedChapter.update((ch) => ch + 1);
      this.loadVerses();
    }
  }
}
