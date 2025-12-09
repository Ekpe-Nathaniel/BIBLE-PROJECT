import { Component, signal } from '@angular/core';
import { NavBar } from './nav-bar/nav-bar';
import { BibleViewerComponent } from './components/bible-viewer/bible-viewer';

@Component({
  selector: 'app-root',
  imports: [NavBar, BibleViewerComponent],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {
  protected readonly title = signal('Bible-Project');
}
