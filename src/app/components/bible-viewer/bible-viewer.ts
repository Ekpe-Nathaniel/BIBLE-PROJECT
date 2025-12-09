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
  // Holds verse search results across all books
  searchResults = signal<Array<{ bookAbbrev: string; bookName: string; chapter: number; verse: number; text: string }>>([]);
  private _pendingScroll: { verse: number } | null = null;

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
    } else if (ev.isVerseSearch) {
      // No book match, perform verse search across all books
      this.searchVersesAcrossBooks(term);
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

  private searchVersesAcrossBooks(term: string) {
    if (!this.selectedTranslation()) {
      this.searchMessage.set('Please select a translation first');
      if (this._searchNoticeTimer) clearTimeout(this._searchNoticeTimer);
      this._searchNoticeTimer = setTimeout(() => {
        this.searchMessage.set(null);
        this._searchNoticeTimer = null;
      }, 4000);
      return;
    }

    this.loading.set(true);
    this.searchMessage.set(`Searching for "${term}" across all books...`);

    // Clear previous results
    this.searchResults.set([]);

    // Search all books and chapters for the term
    const allBooks = this.books();
    let totalMatches = 0;
    let firstMatchBook: string | null = null;
    let firstMatchChapter: number | null = null;
    const matchedAll: Array<{ bookAbbrev: string; bookName: string; chapter: number; verse: number; text: string }> = [];

    const searchPromises = allBooks.map(book =>
      new Promise<void>((resolve) => {
        // Search first 3 chapters of each book for quick results
        const chaptersToSearch = Math.min(3, 10); // limit search depth

        const searchChapter = (chapterNum: number) => {
          if (chapterNum > chaptersToSearch) {
            resolve();
            return;
          }

          this.bibleService.getVerses(this.selectedTranslation(), book.abbreviation, chapterNum).subscribe(
            (data: any) => {
              const matched = data.verses.filter((v: any) => v.text.toLowerCase().includes(term));

              if (matched.length > 0) {
                totalMatches += matched.length;

                if (!firstMatchBook) {
                  firstMatchBook = book.abbreviation;
                  firstMatchChapter = chapterNum;
                }

                // push each matched verse into the master array
                matched.forEach((v: any) => {
                  matchedAll.push({
                    bookAbbrev: book.abbreviation,
                    bookName: book.name,
                    chapter: chapterNum,
                    verse: v.verse,
                    text: v.text
                  });
                });
              }

              searchChapter(chapterNum + 1);
            },
            () => searchChapter(chapterNum + 1) // skip on error, continue searching
          );
        };

        searchChapter(1);
      })
    );

    Promise.all(searchPromises).then(() => {
      this.loading.set(false);

      if (matchedAll.length > 0) {
        // set collected matches into the signal so template can render them
        this.searchResults.set(matchedAll);

        // Optionally navigate to first match for context
        if (firstMatchBook && firstMatchChapter) {
          this.selectedBook.set(firstMatchBook);
          const matchedBook = this.books().find(b => b.abbreviation === firstMatchBook);
          if (matchedBook) {
            this.selectedBookName.set(matchedBook.name);
          }
          this.selectedChapter.set(firstMatchChapter);
          this.loadVerses();
        }

        this.searchMessage.set(`Found ${totalMatches} verse(s) with "${term}"`);
      } else {
        this.searchMessage.set(`No verses found with "${term}"`);
      }

      if (this._searchNoticeTimer) clearTimeout(this._searchNoticeTimer);
      this._searchNoticeTimer = setTimeout(() => {
        this.searchMessage.set(null);
        this._searchNoticeTimer = null;
      }, 5000);
    });
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

          // If there's a pending scroll target (from search result click), scroll to it
          if (this._pendingScroll) {
            const verseNum = this._pendingScroll.verse;
            // wait a tick for DOM to render
            setTimeout(() => {
              const id = 'verse-' + this.selectedBook() + '-' + this.selectedChapter() + '-' + verseNum;
              const el = document.getElementById(id);
              if (el) {
                el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                el.classList.add('highlight');
                setTimeout(() => el.classList.remove('highlight'), 3000);
              }
            }, 60);
            this._pendingScroll = null;
          }
        },
        (error) => {
          this.error.set('Failed to load verses');
          console.error(error);
          this.loading.set(false);
        }
      );
  }

  /** Navigate to a specific search result's book/chapter/verse and scroll to verse */
  goToResult(r: { bookAbbrev: string; bookName: string; chapter: number; verse: number; text: string }) {
    if (!r) return;
    // Clear results UI
    this.searchResults.set([]);

    // Set selection and set pending scroll to the verse number
    this.selectedBook.set(r.bookAbbrev);
    this.selectedBookName.set(r.bookName);
    this.selectedChapter.set(r.chapter);
    this._pendingScroll = { verse: r.verse };

    // Load verses for that chapter; loadVerses will perform scroll when ready
    this.loadVerses();
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
