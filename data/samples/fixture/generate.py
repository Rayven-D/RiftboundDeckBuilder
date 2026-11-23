#!/usr/bin/env python3
"""Generate Rift Builder sample (fixture) card data and placeholder images.

All cards are INVENTED. Nothing here comes from Riot or any community source.
The JSON mirrors the shape of Riot's riftbound-content-v1 /contents response
(as documented secondhand), so it can be fed through the real ingest pipeline.

Usage: python3 generate.py <output_dir>
"""
import json
import os
import sys
from html import escape

OUT = sys.argv[1] if len(sys.argv) > 1 else "fixture"
IMG_URL_PREFIX = "/fixture-cards/"  # serve web/public/fixture-cards/

DOMAIN_COLORS = {
    "Fury": "#C8453F",
    "Calm": "#3E9B6A",
    "Mind": "#3F7FC4",
    "Body": "#D9772F",
    "Chaos": "#8A4FB0",
    "Order": "#C9A62A",
    None: "#5B6675",
}

SETS = [
    ("OGN", "Origins"),
    ("OGS", "Proving Grounds"),
    ("SFD", "Spiritforged"),
    ("UNL", "Unleashed"),
    ("VEN", "Vendetta"),
    ("RAD", "Radiance"),
]

ARTISTS = ["Sample Artist A", "Sample Artist B", "Sample Artist C", "Sample Artist D"]

cards = []
_counters = {code: 0 for code, _ in SETS}


def card(set_code, name, ctype, domains, rarity="Common", energy=None, power=None,
         might=None, text="", keywords=(), tags=(), flavor=None, number=None, variant=None):
    """Add one printing. `number` overrides the running collector number."""
    if number is None:
        _counters[set_code] += 1
        number = _counters[set_code]
    num_str = f"{number:03d}" + (variant or "")
    cid = f"{set_code}-{num_str}"
    faction = ", ".join(domains) if domains else None
    c = {
        "id": cid,
        "collectorNumber": num_str,
        "set": set_code,
        "name": name,
        "description": text,
        "type": ctype,
        "rarity": rarity,
        "faction": faction,
        "stats": {"energy": energy, "might": might, "cost": None, "power": power},
        "keywords": list(keywords),
        "art": {
            "thumbnailURL": f"{IMG_URL_PREFIX}{cid}.svg",
            "fullURL": f"{IMG_URL_PREFIX}{cid}.svg",
            "artist": ARTISTS[len(cards) % len(ARTISTS)],
        },
        "flavorText": flavor,
        "tags": list(tags),
    }
    cards.append(c)
    return c


# ---------------------------------------------------------------- Legends
card("OGN", "Varrow, Ember Warden", "Legend", ["Fury", "Body"], "Rare",
     text="When you play a unit with 4+ Might, ready a rune.", tags=["Varrow"])
card("SFD", "Sorrel, Tide Reader", "Legend", ["Mind", "Calm"], "Rare",
     text="Once each turn, when you play a spell while you have 3 or fewer cards in hand, draw 1.",
     tags=["Sorrel"])
card("RAD", "Quillon, Gilded Schemer", "Legend", ["Chaos", "Order"], "Rare",
     text="At the start of your turn, look at the top card of your deck. You may recycle it.",
     tags=["Quillon"])

# ---------------------------------------------------------------- Champions
card("OGN", "Varrow, Ashen Blade", "Champion", ["Fury"], "Epic", energy=5, power=1, might=5,
     text="Assault 2. When Varrow conquers, deal 2 to an enemy unit here.",
     keywords=["Assault"], tags=["Varrow"])
card("SFD", "Sorrel, Quiet Current", "Champion", ["Mind"], "Epic", energy=4, power=1, might=3,
     text="When you play your second spell each turn, draw 1.", tags=["Sorrel"])
card("RAD", "Quillon, Coin in the Dark", "Champion", ["Chaos"], "Epic", energy=4, power=1, might=4,
     text="Hidden. When Quillon is revealed, gain 1 energy.",
     keywords=["Hidden"], tags=["Quillon"])

# ---------------------------------------------------------------- Varrow deck (Fury / Body)
fury_body = [
    ("OGN", "Cinder Recruit", "Unit", ["Fury"], "Common", 2, 0, 2, "Assault 1.", ["Assault"]),
    ("OGN", "Kiln Brawler", "Unit", ["Fury"], "Common", 3, 0, 3, "", []),
    ("OGN", "Flashfire", "Spell", ["Fury"], "Common", 1, 0, None, "Deal 2 to a unit at a battlefield.", ["Action"]),
    ("OGN", "Ironbark Hauler", "Unit", ["Body"], "Common", 4, 0, 5, "", []),
    ("OGN", "Stonehide Pup", "Unit", ["Body"], "Uncommon", 2, 0, 3, "Tank.", ["Tank"]),
    ("SFD", "Furnace Charge", "Spell", ["Fury"], "Uncommon", 3, 1, None, "Give a unit +3 Might this turn. It gains Assault.", ["Reaction"]),
    ("SFD", "Rampart Ox", "Unit", ["Body"], "Uncommon", 5, 1, 6, "Tank. When played, ready it.", ["Tank"]),
    ("UNL", "Bloodline Gauntlet", "Gear", ["Body"], "Rare", 2, 0, None, "Equip 1. Attached unit has +2 Might.", ["Equip"]),
    ("UNL", "Ember Volley", "Spell", ["Fury"], "Common", 2, 0, None, "Deal 1 to up to three units.", ["Action"]),
    ("VEN", "Trailbreaker", "Unit", ["Fury"], "Rare", 6, 1, 6, "Ganking. Assault 2.", ["Ganking", "Assault"]),
    ("VEN", "Hearth Guardian", "Unit", ["Body"], "Common", 3, 0, 4, "", []),
    ("RAD", "Forge Sprinter", "Unit", ["Fury"], "Common", 1, 0, 1, "Ganking.", ["Ganking"]),
]
for s, n, t, d, r, e, p, m, txt, kw in fury_body:
    card(s, n, t, d, r, energy=e, power=p, might=m, text=txt, keywords=kw)

# Varrow signatures (Signature tag + champion tag)
card("OGN", "Varrow's Last Stand", "Spell", ["Fury"], "Epic", energy=3, power=1,
     text="Your units here get +2 Might this turn. If you control Varrow, they also gain Tank.",
     keywords=["Reaction"], tags=["Signature", "Varrow"])
card("UNL", "Ashen Oath", "Gear", ["Body"], "Epic", energy=2, power=1,
     text="Equip 2. Attached unit has +3 Might and can't be stunned.",
     keywords=["Equip"], tags=["Signature", "Varrow"])

# ---------------------------------------------------------------- Sorrel deck (Mind / Calm)
mind_calm = [
    ("SFD", "Tidepool Scholar", "Unit", ["Mind"], "Common", 2, 0, 1, "When played, draw 1.", []),
    ("SFD", "Driftglass Sentry", "Unit", ["Calm"], "Common", 3, 0, 3, "Shield 1.", ["Shield"]),
    ("SFD", "Recall Current", "Spell", ["Mind"], "Common", 2, 0, None, "Return a unit to its owner's hand.", ["Action"]),
    ("OGN", "Still Water", "Spell", ["Calm"], "Common", 1, 0, None, "Heal a unit fully. Draw 1.", ["Reaction"]),
    ("OGN", "Lantern Keeper", "Unit", ["Calm"], "Uncommon", 4, 0, 4, "Other friendly units here have +1 Might.", []),
    ("UNL", "Thought Snare", "Spell", ["Mind"], "Uncommon", 3, 1, None, "Counter a spell that costs 4 or less.", ["Reaction"]),
    ("UNL", "Reef Warden", "Unit", ["Calm"], "Uncommon", 5, 1, 5, "Shield 2. Tank.", ["Shield", "Tank"]),
    ("VEN", "Mirror Archive", "Gear", ["Mind"], "Rare", 3, 0, None, "Once each turn, when you play a spell, channel 1.", []),
    ("VEN", "Undertow Mage", "Unit", ["Mind"], "Common", 3, 0, 2, "When played, stun an enemy unit.", []),
    ("RAD", "Moonlit Ferry", "Unit", ["Calm"], "Rare", 6, 1, 6, "Accelerate. When played, move a friendly unit here.", ["Accelerate"]),
    ("RAD", "Glimmer Insight", "Spell", ["Mind"], "Common", 1, 0, None, "Look at the top 3 cards of your deck. Draw 1.", ["Action"]),
    ("RAD", "Saltwind Courier", "Unit", ["Calm"], "Common", 2, 0, 2, "When played, heal a friendly unit 2.", []),
]
for s, n, t, d, r, e, p, m, txt, kw in mind_calm:
    card(s, n, t, d, r, energy=e, power=p, might=m, text=txt, keywords=kw)

card("SFD", "Sorrel's Undercurrent", "Spell", ["Mind"], "Epic", energy=4, power=1,
     text="Return up to two enemy units to their owners' hands.",
     keywords=["Action"], tags=["Signature", "Sorrel"])

# ---------------------------------------------------------------- Off-identity (Chaos / Order) for legality tests
off = [
    ("RAD", "Gilded Informant", "Unit", ["Order"], "Common", 2, 0, 2, "When played, look at an opponent's hand.", []),
    ("RAD", "Rumor Mill", "Gear", ["Chaos"], "Uncommon", 2, 0, None, "When you discard a card, draw 1.", []),
    ("VEN", "Chaos Gambit", "Spell", ["Chaos"], "Common", 1, 0, None, "Discard 1, then draw 2.", ["Action"]),
    ("VEN", "Iron Magistrate", "Unit", ["Order"], "Rare", 5, 1, 5, "Enemy spells cost 1 more.", []),
    ("UNL", "Crooked Toll", "Spell", ["Chaos"], "Uncommon", 2, 0, None, "Each opponent loses 1 energy.", ["Reaction"]),
    ("UNL", "Oathbound Squire", "Unit", ["Order"], "Common", 3, 0, 3, "Shield 1.", ["Shield"]),
]
for s, n, t, d, r, e, p, m, txt, kw in off:
    card(s, n, t, d, r, energy=e, power=p, might=m, text=txt, keywords=kw)

# ---------------------------------------------------------------- Runes (one per domain, Proving Grounds)
for dom in ["Fury", "Calm", "Mind", "Body", "Chaos", "Order"]:
    card("OGS", f"{dom} Rune", "Rune", [dom], "Common",
         text=f"Exhaust: add 1 energy. Recycle: add 1 {dom} power.")

# ---------------------------------------------------------------- Battlefields (no domain)
bfs = [
    ("OGN", "Ashfall Crossing", "When you conquer here, deal 1 to each enemy unit here."),
    ("OGN", "Quiet Harbor", "Units here can't be moved by enemy effects."),
    ("SFD", "Sunken Library", "When you hold here, draw 1."),
    ("UNL", "Broken Aqueduct", "When you conquer here, channel 1 rune exhausted."),
    ("VEN", "Gallows Market", "When you conquer here, each player discards 1."),
    ("RAD", "Lantern Steps", "When you hold here, your next spell this turn costs 1 less."),
    ("RAD", "Cracked Colosseum", "Units here have +1 Might."),
]
for s, n, txt in bfs:
    card(s, n, "Battlefield", [], "Uncommon", text=txt)

# ---------------------------------------------------------------- Variants (same name, own printing)
def find(name):
    return next(c for c in cards if c["name"] == name and "variant" not in c)

def variant(name, suffix=None, number=None, rarity="Showcase", set_code=None):
    base = find(name)
    sc = set_code or base["set"]
    if number is None:
        n = int(base["collectorNumber"][:3])
        c = card(sc, base["name"], base["type"], base["faction"].split(", ") if base["faction"] else [],
                 rarity, energy=base["stats"]["energy"], power=base["stats"]["power"],
                 might=base["stats"]["might"], text=base["description"], keywords=base["keywords"],
                 tags=base["tags"], number=n, variant=suffix)
    else:
        c = card(sc, base["name"], base["type"], base["faction"].split(", ") if base["faction"] else [],
                 rarity, energy=base["stats"]["energy"], power=base["stats"]["power"],
                 might=base["stats"]["might"], text=base["description"], keywords=base["keywords"],
                 tags=base["tags"], number=number)
    return c

# alt-art printings (same collector number + letter)
variant("Varrow, Ember Warden", suffix="a")
variant("Kiln Brawler", suffix="a", rarity="Common")
variant("Tidepool Scholar", suffix="a", rarity="Common")
# overnumbered printings (above the set's regular range)
variant("Varrow, Ashen Blade", number=301)
variant("Sorrel, Quiet Current", number=251)
# reprint in a later set
base = find("Flashfire")
card("RAD", "Flashfire", "Spell", ["Fury"], "Common", energy=1, power=0,
     text=base["description"], keywords=base["keywords"])

# ---------------------------------------------------------------- Payload
sets_out = []
for code, name in SETS:
    sc = sorted([c for c in cards if c["set"] == code], key=lambda c: c["collectorNumber"])
    sets_out.append({"id": code, "name": name, "cards": sc})

payload = {
    "game": "riftbound",
    "version": "fixture-0.1",
    "lastUpdated": "2026-11-23T00:00:00Z",
    "_fixture": "INVENTED SAMPLE DATA for local UI work. Not Riot data. Do not ship.",
    "sets": sets_out,
}

os.makedirs(os.path.join(OUT, "data"), exist_ok=True)
os.makedirs(os.path.join(OUT, "fixture-cards"), exist_ok=True)
with open(os.path.join(OUT, "data", "riot-contents.fixture.json"), "w") as f:
    json.dump(payload, f, indent=2, ensure_ascii=False)

# ---------------------------------------------------------------- Placeholder images
def wrap(text, width):
    words, lines, cur = text.split(), [], ""
    for w in words:
        if len(cur) + len(w) + 1 > width:
            lines.append(cur)
            cur = w
        else:
            cur = f"{cur} {w}".strip()
    if cur:
        lines.append(cur)
    return lines


def svg_for(c):
    doms = c["faction"].split(", ") if c["faction"] else [None]
    col1 = DOMAIN_COLORS[doms[0]]
    col2 = DOMAIN_COLORS[doms[-1]]
    landscape = c["type"] == "Battlefield"
    W, H = (670, 480) if landscape else (480, 670)
    variant_note = ""
    if c["collectorNumber"][-1].isalpha():
        variant_note = "ALT ART"
    elif int(c["collectorNumber"][:3]) > 200:
        variant_note = "OVERNUMBERED"
    name = escape(c["name"])
    ctype = escape(c["type"] + ("  ·  " + c["faction"] if c["faction"] else ""))
    text_lines = wrap(c["description"], 44 if not landscape else 62)[:5]
    art_h = int(H * 0.46)
    parts = [
        f'<svg xmlns="http://www.w3.org/2000/svg" width="{W}" height="{H}" viewBox="0 0 {W} {H}">',
        "<defs>",
        f'<linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="{col1}"/><stop offset="1" stop-color="{col2}"/></linearGradient>',
        '<pattern id="p" width="24" height="24" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="12" height="24" fill="#ffffff" fill-opacity="0.07"/></pattern>',
        "</defs>",
        f'<rect width="{W}" height="{H}" rx="18" fill="url(#g)"/>',
        f'<rect x="14" y="14" width="{W-28}" height="{H-28}" rx="10" fill="#1B2129"/>',
        f'<rect x="26" y="78" width="{W-52}" height="{art_h}" rx="6" fill="url(#g)" fill-opacity="0.55"/>',
        f'<rect x="26" y="78" width="{W-52}" height="{art_h}" rx="6" fill="url(#p)"/>',
        f'<text x="{W/2}" y="{78 + art_h/2 + 12}" text-anchor="middle" font-family="DejaVu Sans, Arial, sans-serif" font-size="34" font-weight="700" fill="#ffffff" fill-opacity="0.35" letter-spacing="6">SAMPLE</text>',
    ]
    # cost badges
    x_name = 30
    if c["stats"]["energy"] is not None:
        parts.append(f'<circle cx="52" cy="46" r="22" fill="#F2F4F7"/>')
        parts.append(f'<text x="52" y="55" text-anchor="middle" font-family="DejaVu Sans, Arial, sans-serif" font-size="24" font-weight="700" fill="#1B2129">{c["stats"]["energy"]}</text>')
        x_name = 84
        if c["stats"]["power"]:
            parts.append(f'<rect x="{x_name}" y="30" width="30" height="30" rx="4" fill="{col1}" stroke="#F2F4F7" stroke-width="2"/>')
            parts.append(f'<text x="{x_name+15}" y="52" text-anchor="middle" font-family="DejaVu Sans, Arial, sans-serif" font-size="18" font-weight="700" fill="#fff">{c["stats"]["power"]}</text>')
            x_name += 40
    fs = 26 if len(c["name"]) < 22 else 21
    parts.append(f'<text x="{x_name}" y="55" font-family="DejaVu Sans, Arial, sans-serif" font-size="{fs}" font-weight="700" fill="#F2F4F7">{name}</text>')
    if c["stats"]["might"] is not None:
        parts.append(f'<rect x="{W-82}" y="{78+art_h-50}" width="48" height="40" rx="6" fill="#F2F4F7"/>')
        parts.append(f'<text x="{W-58}" y="{78+art_h-22}" text-anchor="middle" font-family="DejaVu Sans, Arial, sans-serif" font-size="24" font-weight="700" fill="#1B2129">{c["stats"]["might"]}</text>')
    if variant_note:
        parts.append(f'<rect x="38" y="90" width="{len(variant_note)*12+20}" height="28" rx="4" fill="#000" fill-opacity="0.55"/>')
        parts.append(f'<text x="48" y="110" font-family="DejaVu Sans, Arial, sans-serif" font-size="16" font-weight="700" fill="#fff">{variant_note}</text>')
    ty = 78 + art_h + 36
    parts.append(f'<text x="30" y="{ty}" font-family="DejaVu Sans, Arial, sans-serif" font-size="18" font-weight="700" fill="#AEB6C2">{ctype}</text>')
    for i, line in enumerate(text_lines):
        parts.append(f'<text x="30" y="{ty + 36 + i*26}" font-family="DejaVu Sans, Arial, sans-serif" font-size="19" fill="#D5DAE1">{escape(line)}</text>')
    foot = escape(f'{c["set"]} · {c["collectorNumber"]} · {c["rarity"]}')
    parts.append(f'<text x="30" y="{H-30}" font-family="DejaVu Sans Mono, monospace" font-size="15" fill="#8792A2">{foot}</text>')
    parts.append(f'<text x="{W-30}" y="{H-30}" text-anchor="end" font-family="DejaVu Sans Mono, monospace" font-size="15" fill="#8792A2">FIXTURE</text>')
    parts.append("</svg>")
    return "\n".join(parts)


for c in cards:
    with open(os.path.join(OUT, "fixture-cards", f'{c["id"]}.svg'), "w") as f:
        f.write(svg_for(c))

print(f"{len(cards)} printings, {len({c['name'] for c in cards})} card names")
