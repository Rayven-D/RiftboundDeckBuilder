import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { PageFab } from './page-fab';

/** The app shell's pieces the button reads: <main class="site-main"> and <footer class="site-footer">. */
@Component({
  imports: [PageFab],
  template: `
    <main class="site-main">
      @if (show()) {
        <app-page-fab label="Add to your collection" />
      }
    </main>
    <footer class="site-footer">Footer</footer>
  `,
})
class Host {
  readonly show = signal(true);
}

const html = document.documentElement;
const dockValue = () => html.style.getPropertyValue('--fab-dock');
const nextFrame = () => new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));

describe('PageFab docking (SPEC-007 COLL-094, SPEC-005 OWN-094, Brief H-245 D1…D3)', () => {
  let footerTop = 5000;
  let restBottomOffset = '24px';

  beforeEach(() => {
    footerTop = 5000;
    restBottomOffset = '24px';
    const realStyle = window.getComputedStyle.bind(window);
    vi.spyOn(window, 'getComputedStyle').mockImplementation((el: Element, pseudo?: string | null) => {
      const style = realStyle(el, pseudo);
      if (!(el as HTMLElement).classList?.contains('page-fab')) return style;
      return new Proxy(style, { get: (t, k) => (k === 'bottom' ? restBottomOffset : Reflect.get(t, k)) });
    });
    vi.spyOn(html, 'clientHeight', 'get').mockReturnValue(900);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    html.classList.remove('has-fab');
    html.style.removeProperty('--fab-dock');
  });

  async function render() {
    const fixture = TestBed.createComponent(Host);
    const footer = (fixture.nativeElement as HTMLElement).querySelector('.site-footer')!;
    const rect = vi.spyOn(footer, 'getBoundingClientRect').mockImplementation(() => ({ top: footerTop }) as DOMRect);
    await fixture.whenStable();
    await nextFrame();
    return { fixture, rect };
  }

  async function scroll() {
    window.dispatchEvent(new Event('scroll'));
    await nextFrame();
  }

  it('COLL-094 / OWN-094 H-245 Accept 3: footer off screen, --fab-dock is 0px (the button stays at rest); has-fab is set', async () => {
    await render();
    expect(html.classList.contains('has-fab')).toBe(true);
    expect(dockValue()).toBe('0px');
  });

  it('COLL-094 / OWN-094 H-245 Accept 1: as the footer scrolls up the dock keeps the button bottom 16px above it', async () => {
    await render();
    footerTop = 876; // = the rest bottom (900 - 24)
    await scroll();
    expect(dockValue()).toBe('16px');
    footerTop = 700;
    await scroll();
    expect(dockValue()).toBe('192px'); // 876 - 192 = 684 = 700 - 16
    footerTop = 2000;
    await scroll();
    expect(dockValue()).toBe('0px');
  });

  it('COLL-094 (a) H-245 D1: the phone rest offset (above the tab bar) is read from the button, so docking uses it', async () => {
    restBottomOffset = '81px';
    await render();
    footerTop = 819; // rest bottom = 900 - 81
    window.dispatchEvent(new Event('resize'));
    await nextFrame();
    expect(dockValue()).toBe('16px');
  });

  it('COLL-094 / OWN-094 H-245 D1: several scroll events in one frame measure the footer once (rAF throttle)', async () => {
    const { rect } = await render();
    rect.mockClear();
    for (let i = 0; i < 5; i++) window.dispatchEvent(new Event('scroll'));
    await nextFrame();
    expect(rect).toHaveBeenCalledTimes(1);
  });

  it('COLL-094 / OWN-094 H-245 D1: removing the button removes has-fab and --fab-dock from <html>', async () => {
    const { fixture } = await render();
    footerTop = 700;
    await scroll();
    expect(dockValue()).toBe('192px');
    fixture.componentInstance.show.set(false);
    await fixture.whenStable();
    expect(html.classList.contains('has-fab')).toBe(false);
    expect(dockValue()).toBe('');
  });

  it('COLL-094 / OWN-094 H-245 D1, Accept 5: the dock uses the translate property, and translate has no transition', async () => {
    const { fixture } = await render();
    const css = Array.from(document.querySelectorAll('style'))
      .map((s) => s.textContent ?? '')
      .join('\n');
    expect(css).toMatch(/translate:\s*0 calc\(-1 \* var\(--fab-dock, 0px\)\)/);
    const transition = /\.page-fab[^{]*\{[^}]*?transition:([^;]*);/.exec(css)?.[1] ?? '';
    expect(transition).toContain('transform');
    expect(transition).not.toContain('translate');
    expect(transition).not.toContain('all');
    expect((fixture.nativeElement as HTMLElement).querySelector('button.page-fab')).not.toBeNull();
  });
});
