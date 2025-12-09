import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';

export interface Book {
  abbreviation: string;
  name: string;
  chapters: number;
}

export interface Translation {
  identifier: string;
  name: string;
  language: string;
}

export interface VerseContent {
  bookName: string;
  chapter: number;
  translation_name: string;
  verses: Verse[];
}

export interface Verse {
  verse: number;
  text: string;
}

@Injectable({
  providedIn: 'root',
})
export class BibleService {
  private httpClient = inject(HttpClient);
  private apiUrl = 'https://bible-api.com';

  getTranslations(): Observable<Translation[]> {
    return this.httpClient.get<any>(`${this.apiUrl}/data`).pipe(
      map(response => response.translations)
    );
  }

  getBooks(translation: string): Observable<Book[]> {
    return this.httpClient.get<any>(`${this.apiUrl}/data/${translation}`).pipe(
      map(response =>
        response.books.map((book: any) => ({
          abbreviation: book.id,
          name: book.name,
          chapters: 0
        }))
      )
    );
  }

  getChapters(translation: string, book: string): Observable<number> {
    return this.httpClient.get<any>(
      `${this.apiUrl}/data/${translation}/${book}`
    ).pipe(
      map(response => response.chapters.length)
    );
  }

  getVerses(translation: string, book: string, chapter: number): Observable<VerseContent> {
    return this.httpClient.get<any>(
      `${this.apiUrl}/data/${translation}/${book}/${chapter}`
    ).pipe(
      map(response => ({
        bookName: response.verses[0].book,
        chapter: chapter,
        translation_name: response.translation.name,
        verses: response.verses.map((v: any) => ({
          verse: v.verse,
          text: v.text
        }))
      }))
    );
  }
}
