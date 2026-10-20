# Plan — 《鹈鹕测试》

Each phase ends with a demo. No phase starts until the previous demo is approved.

## Phase 1 — skeleton (this build)

- [x] Shared kit, musical clock, 1000-unit scene contract.
- [x] Continuous road, camera drift, push-in at crossings.
- [x] Parametric pelican + bicycle with pedalling IK, wheel spin, blink.
- [x] Intro: paper, sketch plate, two subtitles on the beat, fictional source.
- [x] Twenty labelled colour-block eras with palettes and title cards.
- [x] Through-frame transition on every downbeat.
- [x] Outro: 7×3 wall, 20 thumbnails, empty press seat, flash, pelican fly-by.
- [x] Browser preview with transport; synchronous `renderAt(t)`.
- [x] Puppeteer frame export, contact sheet, ffmpeg encode.
- [x] 30 vs 60 fps camera-pan comparison.

Exit criteria: a silent 2:17 cut plays in the browser; one full export command
produces a watchable MP4; contact sheet shows all 20 labelled blocks.

## Phase 2 — three finished eras

Rebuild Sahara rock art, Song landscape and vertical video as finished painters:
substrate, composition, figures, era-specific rendering, gag, title card, and
8–12 Hz time quantisation for the vertical UI. These three establish the quality
bar and the shared ink/paper techniques.

Demo: three 6-second clips at 100% and a contact sheet, plus timing per frame.

## Phase 3 — the other seventeen

- Write a brief per era from `briefs/TEMPLATE.md`, with composition, palette,
  technique, gag, beat sheet, and public-domain constraints.
- Parallel subagents in batches of 4–5, one scene file each, with a mandatory
  render → inspect → revise loop and a per-batch contact sheet.
- Integrate, fix cross-scene continuity, add the 14→15 shadow-to-phosphor
  transition.

Demo: full silent film contact sheet and a playable cut.

## Phase 4 — music

Synthesize the score in Web Audio: one original theme, era instruments, percussive
bicycle bell/chain, 151.2→120 BPM tape trick for vaporwave, and the oscilloscope
pitch bend. Both realtime preview and offline render must match sample-for-sample
enough to cut against.

Demo: full film with audio, plus a waveform/pulse alignment check.

## Phase 5 — polish and delivery

Final palette/typography pass, frame-rate decision applied everywhere, title card
legibility check at 1080p, encode at CRF 18, verify A/V sync, produce a poster
frame and a clean repo (no frames or renders committed).

## Open decisions for the user

1. **Frame rate** — pick 30 or 60 from `out/fps-test/` after the pan comparison.
2. **Scene order / duration** — locked to 6 s each per the brief; say if any era
   needs a longer gag.
3. **Public-domain references** — confirm no living-artist styles; all named
   works are pre-1929 or anonymous traditional.
4. **Language mix** — Chinese titles with English subtitles as specified; no
   narration.
