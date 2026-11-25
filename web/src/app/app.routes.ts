import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    pathMatch: 'full',
    title: 'Rift Builder: import your Riftbound cards and see what you can build',
    loadComponent: () => import('./pages/home/home-page').then((m) => m.HomePage),
  },
  {
    path: 'collection',
    title: 'Collection · Rift Builder',
    loadComponent: () => import('./pages/collection/collection-gate').then((m) => m.CollectionGate),
  },
  {
    path: 'decks',
    title: 'Decks · Rift Builder',
    loadComponent: () => import('./pages/decks/decks-page').then((m) => m.DecksPage),
  },
  {
    path: 'decks/:id',
    title: 'Deck detail · Rift Builder',
    loadComponent: () =>
      import('./pages/deck-detail/deck-detail-page').then((m) => m.DeckDetailPage),
  },
  {
    path: 'tournaments',
    title: 'Tournaments · Rift Builder',
    loadComponent: () =>
      import('./pages/tournaments/tournaments-page').then((m) => m.TournamentsPage),
  },
  {
    // SPEC-012 LOG-001: public, never gated; loads no Firebase.
    path: 'changelog',
    title: "What's new · Rift Builder",
    loadComponent: () => import('./pages/changelog/changelog-page').then((m) => m.ChangelogPage),
  },
  {
    // SPEC-010 SYNC-104 (a): public, never gated (SYNC-009); static text, loads no Firebase.
    path: 'privacy',
    title: 'Privacy notice · Rift Builder',
    loadComponent: () => import('./pages/privacy/privacy-page').then((m) => m.PrivacyPage),
  },
  {
    path: 'styleguide',
    title: 'Component preview · Rift Builder',
    loadComponent: () => import('./pages/styleguide/styleguide-page').then((m) => m.StyleguidePage),
  },
  // SYNC-159 (a): every unknown path goes to Home, `/import` included (no not-found page, no special rule).
  { path: '**', redirectTo: '' },
];
