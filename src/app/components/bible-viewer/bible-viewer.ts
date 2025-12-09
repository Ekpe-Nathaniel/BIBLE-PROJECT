import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { BibleService, Book } from '../../services/bible.service';

interface BookData {
  abbr: string;
  name: string;
  chapters: number;
}

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
  selectedBookName = signal('');
  selectedChapter = signal(1);
  showChapterDialog = signal(false);
  showBooksDialog = signal(false);

  booksData: Record<string, BookData[]> = {
    'Old Testament': [
      { abbr: 'GEN', name: 'Genesis', chapters: 50 },
      { abbr: 'EXO', name: 'Exodus', chapters: 40 },
      { abbr: 'LEV', name: 'Leviticus', chapters: 27 },
      { abbr: 'NUM', name: 'Numbers', chapters: 36 },
      { abbr: 'DEU', name: 'Deuteronomy', chapters: 34 },
      { abbr: 'JOS', name: 'Joshua', chapters: 24 },
      { abbr: 'JDG', name: 'Judges', chapters: 21 },
      { abbr: 'RTH', name: 'Ruth', chapters: 4 },
      { abbr: '1SA', name: '1 Samuel', chapters: 31 },
      { abbr: '2SA', name: '2 Samuel', chapters: 24 },
      { abbr: '1KI', name: '1 Kings', chapters: 22 },
      { abbr: '2KI', name: '2 Kings', chapters: 25 },
      { abbr: '1CH', name: '1 Chronicles', chapters: 29 },
      { abbr: '2CH', name: '2 Chronicles', chapters: 36 },
      { abbr: 'EZR', name: 'Ezra', chapters: 10 },
      { abbr: 'NEH', name: 'Nehemiah', chapters: 13 },
      { abbr: 'EST', name: 'Esther', chapters: 10 },
      { abbr: 'JOB', name: 'Job', chapters: 42 },
      { abbr: 'PSA', name: 'Psalms', chapters: 150 },
      { abbr: 'PRV', name: 'Proverbs', chapters: 31 },
      { abbr: 'ECC', name: 'Ecclesiastes', chapters: 12 },
      { abbr: 'SOS', name: 'Song of Solomon', chapters: 8 },
      { abbr: 'ISA', name: 'Isaiah', chapters: 66 },
      { abbr: 'JER', name: 'Jeremiah', chapters: 52 },
      { abbr: 'LAM', name: 'Lamentations', chapters: 5 },
      { abbr: 'EZE', name: 'Ezekiel', chapters: 48 },
      { abbr: 'DAN', name: 'Daniel', chapters: 12 },
      { abbr: 'HOS', name: 'Hosea', chapters: 14 },
      { abbr: 'JOE', name: 'Joel', chapters: 3 },
      { abbr: 'AMO', name: 'Amos', chapters: 9 },
      { abbr: 'OBD', name: 'Obadiah', chapters: 1 },
      { abbr: 'JON', name: 'Jonah', chapters: 4 },
      { abbr: 'MIC', name: 'Micah', chapters: 7 },
      { abbr: 'NAH', name: 'Nahum', chapters: 3 },
      { abbr: 'HAB', name: 'Habakkuk', chapters: 3 },
      { abbr: 'ZEP', name: 'Zephaniah', chapters: 3 },
      { abbr: 'HAG', name: 'Haggai', chapters: 2 },
      { abbr: 'ZEC', name: 'Zechariah', chapters: 14 },
      { abbr: 'MAL', name: 'Malachi', chapters: 4 },
    ],
    'New Testament': [
      { abbr: 'MAT', name: 'Matthew', chapters: 28 },
      { abbr: 'MRK', name: 'Mark', chapters: 16 },
      { abbr: 'LUK', name: 'Luke', chapters: 24 },
      { abbr: 'JHN', name: 'John', chapters: 21 },
      { abbr: 'ACT', name: 'Acts', chapters: 28 },
      { abbr: 'ROM', name: 'Romans', chapters: 16 },
      { abbr: '1CO', name: '1 Corinthians', chapters: 16 },
      { abbr: '2CO', name: '2 Corinthians', chapters: 13 },
      { abbr: 'GAL', name: 'Galatians', chapters: 6 },
      { abbr: 'EPH', name: 'Ephesians', chapters: 6 },
      { abbr: 'PHP', name: 'Philippians', chapters: 4 },
      { abbr: 'COL', name: 'Colossians', chapters: 4 },
      { abbr: '1TH', name: '1 Thessalonians', chapters: 5 },
      { abbr: '2TH', name: '2 Thessalonians', chapters: 3 },
      { abbr: '1TI', name: '1 Timothy', chapters: 6 },
      { abbr: '2TI', name: '2 Timothy', chapters: 4 },
      { abbr: 'TIT', name: 'Titus', chapters: 3 },
      { abbr: 'PHM', name: 'Philemon', chapters: 1 },
      { abbr: 'HEB', name: 'Hebrews', chapters: 13 },
      { abbr: 'JAM', name: 'James', chapters: 5 },
      { abbr: '1PE', name: '1 Peter', chapters: 5 },
      { abbr: '2PE', name: '2 Peter', chapters: 3 },
      { abbr: '1JN', name: '1 John', chapters: 5 },
      { abbr: '2JN', name: '2 John', chapters: 1 },
      { abbr: '3JN', name: '3 John', chapters: 1 },
      { abbr: 'JUD', name: 'Jude', chapters: 1 },
      { abbr: 'REV', name: 'Revelation', chapters: 22 },
    ],
  };

  allBooks: BookData[] = [
    ...this.booksData['Old Testament'],
    ...this.booksData['New Testament'],
  ];

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

  openBooksDialog(): void {
    this.showBooksDialog.set(true);
  }

  closeBooksDialog(): void {
    this.showBooksDialog.set(false);
  }

  handleBookSelect(book: BookData): void {
    const apiBook = this.books().find((b) => b.name.toLowerCase() === book.name.toLowerCase());
    if (apiBook) {
      this.selectedBook.set(apiBook.abbreviation);
      this.selectedBookName.set(apiBook.name);
      this.loading.set(true);
      this.bibleService.getChapters(this.selectedTranslation(), apiBook.abbreviation).subscribe(
        (numChapters: number) => {
          const chaptersArray = Array.from(
            { length: numChapters },
            (_, i) => i + 1
          );
          this.chapters.set(chaptersArray);
          this.selectedChapter.set(1);
          this.showChapterDialog.set(true);
          this.showBooksDialog.set(false);
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
    const book = this.books().find(
      (b) => b.abbreviation === this.selectedBook()
    );
    if (book && this.selectedChapter() < book.chapters) {
      this.selectedChapter.update((ch) => ch + 1);
      this.loadVerses();
    }
  }
}
