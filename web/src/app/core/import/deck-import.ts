import { Injectable, InjectionToken, inject } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Router } from '@angular/router';
import { Subject } from 'rxjs';
import type { CommitOutcome } from '../../shared/import/collection-commit';
import {
  type DeckImportCommitter,
  type DeckSaveRequest,
  type PreparedDeck,
  prepareDeckImport,
} from '../../shared/import/deck-import';
import { type ParseResult, sourceLines } from '../../shared/import/parse-card-list';
import { LIMITS, type UserDeck } from '../../shared/storage/records';
import { noticeOptions } from '../../shared/sync/notice';
import { ReadOnlyAreaError } from '../../shared/sync/tracked-stores';
import { CardData } from '../cards/card-data';
import { DeckStoreError } from '../storage/local-stores';
import { AppStores } from '../storage/app-stores';
import { SignInGate } from '../sync/sign-in-gate';

/** A new deck id (SPEC-006 `UserDeck.id`: UUID v4; SYNC-111 lowercase). Replaceable in tests. */
export const NEW_DECK_ID = new InjectionToken<() => string>('NEW_DECK_ID', {
  providedIn: 'root',
  factory: () => () => crypto.randomUUID().toLowerCase(),
});

/** DECK-098 / DECK-092 / DECK-093 strings. The spec words "Deck saved." and "View deck" only. */
export const DECK_SAVE_TEXT = {
  saved: 'Deck saved.',
  view: 'View deck',
  catalogError: "Card data couldn't load, so the cards can't be matched yet. Try again in a moment.",
  /** DECK_LIMIT */
  limit: `You already have ${LIMITS.maxDecks} decks, the most you can keep. Delete a deck to save this one.`,
  /** DECK_TOO_LARGE */
  tooLarge: `This deck is too large to save: at most ${LIMITS.maxDeckEntries} different entries and ${LIMITS.maxDeckCopies} cards.`,
  /** STORAGE_FULL */
  storageFull: "Couldn't save: this device's storage is full. Nothing was saved.",
  failed: "Couldn't save the deck. Nothing was saved. Try again.",
  /** DECK-097: the gate closed while the dialog was open (session lost, signed out in another tab). */
  signedOut: 'Sign in again to save this deck. Nothing was saved.',
} as const;

/**
 * SPEC-006 Deck Import save (H-253): the `ImportCommitter` the "Import deck" dialog uses on `/decks`. Continue
 * resolves the list against the card catalog (nothing is written, DECK-003); Save writes one new deck through the
 * tracked `stores.decks` (account cache, stamped for sync, DECK-090, SYNC-031) and nothing else (DECK-002). A failed
 * write returns the error and the dialog stays open (DECK-092, DECK-093, DECK-098). After a written save the
 * snack bar "Deck saved." offers View deck (DECK-098); the page stays where it is.
 */
@Injectable({ providedIn: 'root' })
export class DeckImport implements DeckImportCommitter {
  private readonly stores = inject(AppStores).stores;
  private readonly cardData = inject(CardData);
  private readonly gate = inject(SignInGate);
  private readonly snackBar = inject(MatSnackBar);
  private readonly router = inject(Router);
  private readonly newId = inject(NEW_DECK_ID);

  /** Emits the saved record (as stored, `updatedAt` stamped) after every save this tab wrote. */
  readonly saved = new Subject<UserDeck>();

  /** Continue: resolve the parsed list (DECK-015, DECK-040). Nothing is written (DECK-003). */
  async prepare(result: ParseResult, text: string): Promise<PreparedDeck | { status: 'error'; message: string }> {
    const c = await this.cardData.loadCatalog();
    if (c.status === 'error') {
      void this.cardData.reload(); // the next Continue tries again
      return { status: 'error', message: DECK_SAVE_TEXT.catalogError };
    }
    // DECK-050: the review shows SPEC-002 legality; without the data it reads "Not fully checked" and Save still works.
    const legality = await Promise.resolve()
      .then(() => this.cardData.loadLegalityData())
      .catch(() => null);
    return prepareDeckImport(result, sourceLines(text), c.catalog, legality);
  }

  /** Save (DECK-003): one new deck, `createdAt` = `updatedAt` = now; the store makes `updatedAt` monotonic (DECK-074). */
  async commit(_prepared: PreparedDeck, request: DeckSaveRequest): Promise<CommitOutcome> {
    if (!this.gate.open()) return { status: 'error', message: DECK_SAVE_TEXT.signedOut };
    const at = new Date().toISOString();
    const record: UserDeck = { ...request.draft, id: this.newId(), createdAt: at, updatedAt: at };
    try {
      await this.stores.decks.create(record);
    } catch (err) {
      return { status: 'error', message: saveError(err) };
    }
    let stored: UserDeck = record;
    try {
      stored = (await this.stores.decks.get(record.id)) ?? record;
    } catch {
      // written; the stamped copy is read again by whoever lists the decks
    }
    this.saved.next(stored);
    const ref = this.snackBar.open(DECK_SAVE_TEXT.saved, DECK_SAVE_TEXT.view, noticeOptions('success'));
    ref.onAction().subscribe(() => void this.router.navigate(['/decks', stored.id]));
    return { status: 'written' };
  }
}

function saveError(err: unknown): string {
  if (err instanceof DeckStoreError) {
    switch (err.code) {
      case 'DECK_LIMIT':
        return DECK_SAVE_TEXT.limit;
      case 'DECK_TOO_LARGE':
        return DECK_SAVE_TEXT.tooLarge;
      case 'STORAGE_FULL':
        return DECK_SAVE_TEXT.storageFull;
      default:
        return DECK_SAVE_TEXT.failed;
    }
  }
  if (err instanceof ReadOnlyAreaError) return err.message;
  return DECK_SAVE_TEXT.failed;
}
