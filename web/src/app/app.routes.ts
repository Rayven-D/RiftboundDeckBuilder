import { Routes } from '@angular/router';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'decks' },
  {
    path: 'import',
    title: 'Import · Rift Decks',
    loadComponent: () => import('./pages/import/import-page').then((m) => m.ImportPage),
  },
  {
    path: 'collection',
    title: 'My collection · Rift Decks',
    loadComponent: () => import('./pages/collection/collection-page').then((m) => m.CollectionPage),
  },
  {
    path: 'decks',
    title: 'Your decks · Rift Decks',
    loadComponent: () => import('./pages/decks/decks-page').then((m) => m.DecksPage),
  },
  {
    path: 'decks/:id',
    title: 'Deck detail · Rift Decks',
    loadComponent: () =>
      import('./pages/deck-detail/deck-detail-page').then((m) => m.DeckDetailPage),
  },
  {
    path: 'tournaments',
    title: 'Tournaments · Rift Decks',
    loadComponent: () =>
      import('./pages/tournaments/tournaments-page').then((m) => m.TournamentsPage),
  },
  {
    path: 'styleguide',
    title: 'Component preview · Rift Decks',
    loadComponent: () => import('./pages/styleguide/styleguide-page').then((m) => m.StyleguidePage),
  },
  { path: '**', redirectTo: 'decks' },
];
