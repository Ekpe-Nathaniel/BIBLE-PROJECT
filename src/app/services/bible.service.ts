import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface Book {
  abbreviation: string;
  name: string;
  chapters: number;
}

export interface Translation {
  id: string;
  name: string;
  language: string;
}

export interface Verse {
  bookName: string;
  chapter: number;
  verse: number;
  text: string;
}

@Injectable({
  providedIn: 'root',
})
export class BibleService {
  private httpClient = inject(HttpClient);
  private apiUrl = 'https://bible-api.com';

  getTranslations(): Observable<any> {
    return this.httpClient.get(`${this.apiUrl}/translations`);
  }

  getBooks(translation: string): Observable<Book[]> {
    return this.httpClient.get<Book[]>(`${this.apiUrl}/${translation}/books`);
  }

  getChapters(translation: string, book: string): Observable<any> {
    return this.httpClient.get(`${this.apiUrl}/${translation}/${book}`);
  }

  getVerses(translation: string, book: string, chapter: number): Observable<any> {
    return this.httpClient.get(`${this.apiUrl}/${book}/${chapter}?translation=${translation}`);
  }
}
