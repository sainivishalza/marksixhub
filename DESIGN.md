# Design plan: Mark Six Hub

Subject: a free Mark Six number picker and results site. Audience: people who do not know the HKJC site and want help choosing 6 of 49 and checking results. Primary job: pick numbers fast; see latest result and prizes.

## Tokens (also in tailwind.config.ts)
- Base `#0A0E1A` midnight, panel `#111827`, raised `#182236`
- Ivory text `#F3EFE4` (warm, not pure white), muted `#A9B0C0`
- Gold `#D4AF37`, bright `#F5C542` (actions, selection, focus ring only)
- Win `#10B981`, miss `#EF4444`
- Balls use the real Mark Six colour sets, lacquered with a specular highlight: red `#C8102E`, blue `#1F4FD8`, green `#12804A`. Red: 1,2,7,8,12,13,18,19,23,24,29,30,34,35,40,45,46. Blue: 3,4,9,10,14,15,20,25,26,31,36,37,41,42,47,48. Green: the rest.
- Type: Playfair Display (headings), Inter (UI/body), JetBrains Mono (numbers, tabular).

## Layout concept
Hero is the board, not a banner. Desktop: left column headline + estimated jackpot as a typographic figure + two actions; right column the 49-ball board with a ticket slip of 6 slots under it. Mobile: headline, then board, then slip. Left-aligned throughout.
Below: latest result as a ticket stub (perforated edge) with a "check my numbers" row; countdown; 3-step guide; FAQ accordion; recent results table.

## Principles
1. Balls are the only saturated colour; gold means "you can act here" or "selected".
2. One orchestrated moment: Quick Pick makes six balls rise one by one into the ticket slip. Everything else is quiet.
3. No identical card grids: results = stub, countdown = inline digits in a slip, guide = a real sequence.
4. Honest copy: jackpot figure is the admin-entered estimate; not affiliated with HKJC; we never take bets.
5. Accessibility floor: keyboard grid (arrows/Enter), aria-live announcements, visible gold focus ring, reduced motion respected, AA contrast.

## Review against the brief (what changed from the first draft)
- Draft hero was a centred headline + gradient + three stat cards (the usual lottery template). Replaced with the board-as-hero.
- Jackpot as a card replaced with a large serif figure.
- Brief's tip about 5 colour ranges conflicts with real Mark Six (red/blue/green sets): kept the real sets.
- "Optional extra number" in the picker is not part of how Mark Six bets work (extra is only drawn), so it is not in the picker. "Free forever"/"Official format" badges reworded to claims we can stand behind.

## Customer account (/account)
- One job: show at a glance what I have (points), what is happening to my entries, and what to do next. Four sections: Overview, Orders, Points, Settings. Sidebar on large screens, scrolling pills on phones.
- An order is a ticket slip: the draw number is the heading, status is one word (Pending approval, Accepted, Won, Result in, Rejected, Refunded), a three-step bar (Submitted, Accepted, Result) shows progress, and once a result is in the winning numbers stay bright while the rest fade.
- Status colours mean the same everywhere: gold waiting, blue accepted, green won, grey closed. Same tokens as the rest of the site; no new colours.
- Log in and sign up share one frame (title, form, what an account gives you). No money imagery anywhere: points are free play credits.
