import { Component, OnInit, inject, signal, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { BibleService, Book } from '../../services/bible.service';
import { SearchService } from '../../services/search.service';

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

  constructor() {
    effect(() => {
      const selectedBook = this.searchService.selectedBook();
      if (selectedBook) {
        this.selectBookFromSearch(selectedBook);
      }
    });
  }

  ngOnInit(): void {
    this.loadTranslations();
    this.loadBooks();
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

  selectBookFromSearch(book: Book): void {
    this.selectedBook.set(book.abbreviation);
    this.selectedBookName.set(book.name);
    this.loading.set(true);
    this.bibleService.getChapters(this.selectedTranslation(), book.abbreviation).subscribe(
      (numChapters: number) => {
        const chaptersArray = Array.from(
          { length: numChapters },
          (_, i) => i + 1
        );
        this.chapters.set(chaptersArray);
        this.selectedChapter.set(1);
        this.loadVerses();
        this.loading.set(false);
      },
      (error) => {
        this.error.set('Failed to load chapters');
        console.error(error);
        this.loading.set(false);
      }
    );
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
