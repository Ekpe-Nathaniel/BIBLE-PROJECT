import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { BibleService, Book } from '../../services/bible.service';

@Component({
  selector: 'app-bible-viewer',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './bible-viewer.html',
  styleUrl: './bible-viewer.css'
})
export class BibleViewerComponent implements OnInit {
  private bibleService = inject(BibleService);

  translations = signal<any[]>([]);
  books = signal<Book[]>([]);
  chapters = signal<number[]>([]);
  verseContent = signal<any>(null);
  loading = signal(false);
  error = signal<string | null>(null);

  selectedTranslation = signal('kjv');
  selectedBook = signal('');
  selectedChapter = signal(1);
  showChapterDialog = signal(false);

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
      },
      (error) => {
        this.error.set('Failed to load books');
        console.error(error);
        this.loading.set(false);
      }
    );
  }

  onTranslationChange(event: Event): void {
    const target = event.target as HTMLSelectElement;
    this.selectedTranslation.set(target.value);
    this.loadBooks();
    this.selectedBook.set('');
    this.selectedChapter.set(1);
    this.verseContent.set(null);
    this.chapters.set([]);
  }

  onBookSelect(event: Event): void {
    const target = event.target as HTMLSelectElement;
    const bookValue = target.value;
    if (bookValue) {
      const book = this.books().find(
        (b) => b.abbreviation === bookValue
      );
      if (book) {
        this.selectedBook.set(bookValue);
        const chaptersArray = Array.from(
          { length: book.chapters },
          (_, i) => i + 1
        );
        this.chapters.set(chaptersArray);
        this.selectedChapter.set(1);
        this.showChapterDialog.set(true);
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
    const book = this.books().find(
      (b) => b.abbreviation === this.selectedBook()
    );
    if (book && this.selectedChapter() < book.chapters) {
      this.selectedChapter.update((ch) => ch + 1);
      this.loadVerses();
    }
  }
}
