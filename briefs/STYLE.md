# Shared art direction — 《鹈鹕测试》

Read this before writing a scene. The goal is a museum-grade pastiche, played
completely straight. The joke is the pelican, never a broken drawing.

## Canvas and camera

- Scenes paint in a **1000-unit-tall** space. At 1920×1080 and zoom 1 the visible
  area is 1777.8 × 1000; at the default camera it is roughly x ∈ [-390, 1390],
  y ∈ [0, 1000]. Paint a generous bleed: x ∈ [-800, 1600], y ∈ [-150, 1100].
- Ground line for the bicycle is y = 820. Wheel radius is 50. Keep the rider at
  x ≈ 468 unless the scene deliberately moves the camera.
- Every scene fills its own background edge to edge. Never rely on the director's
  backstop colour.
- Title card safe zone (screen space): bottom-left 92×92 px at 1080p, up to
  ~900 px wide and ~180 px tall. Keep busy detail out of it; the director draws
  the card and its scrim on top.
- Outro thumbnails are rendered as a 1000×1000 square crop at scene-local t=3.0.
  Compose so the rider and the era's key motif survive a square crop.

## Contract

```js
export default {
  id: 'sXX',
  number: N,
  cn: '中文名',
  en: 'English Name',
  year: '约0000',
  palette: basePalette({...}),
  draw(g, ctx) { ctx.road(g, ...); ctx.rider(g, 468, ...); ... },
};
```

`ctx` exposes `t` (global seconds), `local` (0–6), `view`, `road`, `rider`,
`style`, `grain`. `g` is a p5 instance or a p5.Graphics; use its `drawingContext`
for speed. All drawing must be deterministic: use `rngFor(seed)`, never
`Math.random()`.

## Motion and beat

- 120 BPM: beat 0.5 s, bar 2 s. Scene-local bar 1 = 0–2 s (enter), bar 2 = 2–4 s
  (the gag/hold), bar 3 = 4–6 s (ride to the frame).
- The gag should land on a strong beat: every whole second (beats 0 and 2).
  Scene boundaries are at 5 + 6i seconds, all downbeats.
- The rig pose is shared. Use `ctx.rider()` for the canonical ride, or read
  `rigPose(t)` and paint the joints yourself in the era's technique. Never
  re-time the pedals: one crank revolution per second, two beats.
- Camera motion and the road are handled by the director. Do not simulate a cut
  or a fade to black inside a scene; the frame aperture does the transition.
- Retro scenes (wayang, 8-bit, chat GIF, vertical UI) may quantise *their own*
  elements to 8–12 Hz. Never quantise the camera or the road.

## Palette

Each `palette` provides: `bg`, `bg2`, `motif`, `accent`, `ink`, `titleInk`,
`scrim`, `ground`, `road`, `dash`, `body`, `beak`, `rigInk`. Use `titleInk` for
title text, `ink` for marks. For dark eras set `titleInk` light and `scrim` dark.
The director's title scrim uses `bg` for light-ink eras, so keep `bg` in the same
family as the painting's ground.

## Techniques

- Ink eras (3, 4, 5, 6, 9) share the paper/ink kit but not the brushwork:
  rubbing = white line on black, baimiao = even unmodulated line, landscape =
  wet wash + texture strokes, jiehua = ruled architecture, xieyi = few loaded
  strokes and a lot of empty paper.
- Build texture in layers: substrate → mid-ground → figures → atmosphere →
  grain. A flat background with a line drawing is not enough.
- One accent colour per era. Use value and texture before adding hue.
- Keep the pelican recognisable: beak + pouch + eye + bicycle silhouette. A
  style may reduce it to a shadow or a few lines, but the pose must read.

## Rights

- Public-domain works only. No living artists' signature styles, no real album
  covers, film stills, game characters, logos, mascots, UI icons or sounds.
- Chat, short-video, game and press interfaces must be fictional and original.
- Do not read or copy the reference project's scene files, briefs or assets.
