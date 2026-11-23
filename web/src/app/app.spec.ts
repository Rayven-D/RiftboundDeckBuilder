import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { App } from './app';
import { routes } from './app.routes';

describe('App', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [provideRouter(routes)],
    }).compileComponents();
  });

  it('should create the app', () => {
    const fixture = TestBed.createComponent(App);
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('should render the text wordmark and main navigation', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('.wordmark')?.textContent).toContain('Rift Decks');
    const links = Array.from(el.querySelectorAll('nav a')).map((a) => a.getAttribute('href'));
    expect(links).toEqual(['/decks', '/collection', '/tournaments']);
  });

  it('should show Import as the last item in the header, outside the tabs', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    const header = (fixture.nativeElement as HTMLElement).querySelector('header')!;
    const last = header.lastElementChild as HTMLAnchorElement;
    expect(last.classList).toContain('import-action');
    expect(last.getAttribute('href')).toBe('/import');
    expect(last.textContent).toContain('Import');
  });

  it('should show the Legal Jibber Jabber notice in the footer', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    const footer =
      (fixture.nativeElement as HTMLElement).querySelector('footer')?.textContent ?? '';
    expect(footer).toContain(`created under Riot Games' "Legal Jibber Jabber" policy`);
    expect(footer).toContain('Riot Games does not endorse or sponsor this project.');
  });
});
