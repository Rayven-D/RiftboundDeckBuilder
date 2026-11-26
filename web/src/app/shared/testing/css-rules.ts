/**
 * Test helper: the style rules the rendered components put in the document (Angular injects each
 * component's compiled styles as a <style> element), with the media query each one sits in. jsdom has
 * no layout, so specs use this to check a rule exists (H-460 focus ring, H-461 phone target sizes).
 */
export interface FoundRule {
  /** selectorText, with Angular's `[_ngcontent-…]` attributes removed. */
  readonly selector: string;
  /** The enclosing @media condition, or null at the top level. */
  readonly media: string | null;
  readonly style: CSSStyleDeclaration;
}

export function cssRules(match: (selector: string) => boolean): FoundRule[] {
  const found: FoundRule[] = [];
  const walk = (rules: CSSRuleList, media: string | null) => {
    for (const rule of Array.from(rules)) {
      if (rule instanceof CSSMediaRule) walk(rule.cssRules, rule.media.mediaText);
      else if (rule instanceof CSSStyleRule) {
        const selector = rule.selectorText.replace(/\[_ng(content|host)-[^\]]*\]/g, '');
        if (match(selector)) found.push({ selector, media, style: rule.style });
      }
    }
  };
  for (const sheet of Array.from(document.styleSheets)) walk(sheet.cssRules, null);
  return found;
}

/** The selector (or one entry of a selector list) is exactly `.cls` (or `.cls` + `pseudo`), not a descendant rule. */
export const targets = (selector: string, cls: string, pseudo = '') =>
  selector.split(',').some((part) => part.trim() === `.${cls}${pseudo}`);
