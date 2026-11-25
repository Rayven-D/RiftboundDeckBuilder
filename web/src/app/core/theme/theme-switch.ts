import { Component, inject } from '@angular/core';
import { MatButtonToggle, MatButtonToggleChange, MatButtonToggleGroup } from '@angular/material/button-toggle';
import { THEME_CHOICES } from '../../shared/theme/theme';
import { ThemeService } from './theme.service';

let themeSwitchSeq = 0;

/**
 * SPEC-010 SYNC-158 (a): the footer Theme switch, for everyone, on every page. A single-select group with radio
 * semantics (Material's button toggle: `radiogroup` / `radio`, arrow keys), a check mark on the selected option so
 * the choice is not colour alone, each option 44px tall. Bound to the same `ThemeService` signal as the account
 * menu's Theme group. Loads no Firebase and makes no request.
 */
@Component({
  selector: 'app-theme-switch',
  imports: [MatButtonToggleGroup, MatButtonToggle],
  template: `
    <span class="label" [id]="labelId">Theme</span>
    <mat-button-toggle-group
      [attr.aria-labelledby]="labelId"
      [value]="theme.choice()"
      [hideSingleSelectionIndicator]="false"
      (change)="choose($event)"
    >
      @for (c of choices; track c.value) {
        <mat-button-toggle [value]="c.value">{{ c.label }}</mat-button-toggle>
      }
    </mat-button-toggle-group>
  `,
  styles: `
    :host {
      display: inline-flex;
      flex-wrap: wrap;
      align-items: center;
      justify-content: center;
      gap: var(--space-2);
    }
    .label { font-size: var(--font-size-sm); color: var(--color-text-muted); }
    mat-button-toggle-group {
      --mat-button-toggle-height: 44px;
      --mat-button-toggle-shape: var(--radius-md);
      --mat-button-toggle-divider-color: var(--color-border-strong);
      --mat-button-toggle-text-color: var(--color-text);
      --mat-button-toggle-selected-state-text-color: var(--color-text);
      --mat-button-toggle-selected-state-background-color: var(--color-surface-raised);
      --mat-button-toggle-background-color: transparent;
      --mat-button-toggle-label-text-size: var(--font-size-sm);
      border-color: var(--color-border-strong);
    }
  `,
})
export class ThemeSwitch {
  protected readonly theme = inject(ThemeService);
  protected readonly choices = THEME_CHOICES;
  protected readonly labelId = `theme-switch-label-${++themeSwitchSeq}`;

  protected choose(e: MatButtonToggleChange): void {
    this.theme.set(e.value);
  }
}
