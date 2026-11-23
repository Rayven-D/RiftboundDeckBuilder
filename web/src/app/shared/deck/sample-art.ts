/**
 * Abstract stand-in card art for previews and the home page, used until real card images arrive
 * from the Riot API. Plain SVG, no Riot artwork: a frame, an art window with simple shapes, a name
 * bar and text lines. Returns a data: URL.
 */
export function sampleCardArt(color: string, seed = 0): string {
  const shapes = [
    `<circle cx="31.5" cy="30" r="13" fill="#fff" fill-opacity=".22"/><circle cx="40" cy="24" r="6" fill="#fff" fill-opacity=".3"/>`,
    `<path d="M10 48 L24 22 L33 36 L41 26 L54 48 Z" fill="#fff" fill-opacity=".25"/>`,
    `<rect x="18" y="16" width="27" height="27" transform="rotate(45 31.5 29.5)" fill="#fff" fill-opacity=".22"/>`,
  ];
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 63 88">` +
    `<rect width="63" height="88" fill="#15181c"/>` +
    `<rect x="2.5" y="2.5" width="58" height="83" rx="3" fill="${color}"/>` +
    `<rect x="6" y="9" width="51" height="44" rx="1.5" fill="#000" fill-opacity=".28"/>` +
    shapes[seed % shapes.length] +
    `<rect x="6" y="56" width="51" height="7" rx="1.5" fill="#000" fill-opacity=".45"/>` +
    `<rect x="9" y="58.5" width="24" height="2" rx="1" fill="#fff" fill-opacity=".8"/>` +
    `<rect x="6" y="66" width="51" height="16" rx="1.5" fill="#fff" fill-opacity=".12"/>` +
    `<rect x="9" y="69" width="44" height="1.6" rx=".8" fill="#fff" fill-opacity=".45"/>` +
    `<rect x="9" y="73" width="38" height="1.6" rx=".8" fill="#fff" fill-opacity=".45"/>` +
    `<rect x="9" y="77" width="30" height="1.6" rx=".8" fill="#fff" fill-opacity=".45"/>` +
    `<circle cx="10" cy="5.5" r="2.2" fill="#fff" fill-opacity=".7"/>` +
    `</svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}
