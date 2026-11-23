import { Routes } from '@angular/router';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'decks' },
  {
    path: 'import',
    title: 'Import · Riftbound Deck Builder',
    loadComponent: () => import('./pages/import/import-page').then((m) => m.ImportPage),
  },
  {
    path: 'collection',
    title: 'My collection · Riftbound Deck Builder',
    loadComponent: () => import('./pages/collection/collection-page').then((m) => m.CollectionPage),
  },
  {
    path: 'decks',
    title: 'Your decks · Riftbound Deck Builder',
    loadComponent: () => import('./pages/decks/decks-page').then((m) => m.DecksPage),
  },
  {
    path: 'decks/:id',
    title: 'Deck detail · Riftbound Deck Builder',
    loadComponent: () =>
      import('./pages/deck-detail/deck-detail-page').then((m) => m.DeckDetailPage),
  },
  {
    path: 'tournaments',
    title: 'Tournaments · Riftbound Deck Builder',
    loadComponent: () =>
      import('./pages/tournaments/tournaments-page').then((m) => m.TournamentsPage),
  },
  {
    path: 'styleguide',
    title: 'Component preview · Riftbound Deck Builder',
    loadComponent: () => import('./pages/styleguide/styleguide-page').then((m) => m.StyleguidePage),
  },
  { path: '**', redirectTo: 'decks' },
];
