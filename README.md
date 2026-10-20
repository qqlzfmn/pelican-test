# 《鹈鹕测试》 · PELICAN TEST

A procedural short film: a pelican rides one continuous road through twenty art
history eras. 120 BPM, 2:17, 1920×1080. Every frame is drawn by code — no external
images, video, or audio.

**Status: phase 1 skeleton.** The full edit, timing, camera, through-frame
transition and export pipeline are working. Twenty eras are labelled colour-block
placeholders; Sahara, Song landscape and vertical video get real painters in
phase 2.

## Run it

```bash
npm install                 # p5 is already vendored in public/vendor
npm run dev                 # http://127.0.0.1:4173/
npm test                    # timeline, rig, scene contract, transition tests
```

Preview controls: play/pause, scrub, current era. `Space` toggles, arrows seek,
`Shift` seeks one frame. `?t=42&play=0` freezes a frame; `?render=1` hides the UI.

Requires Node 20+, Chrome for Testing (installed by Puppeteer), ffmpeg.

```bash
# one frame
node tools/shot.mjs --t 10 --out out/shot.png

# contact sheet
node tools/sheet.mjs --start 0 --end 137 --count 20

# 30 vs 60 fps comparison on a camera pan (writes out/fps-test/)
node tools/fps-test.mjs --start 5 --seconds 2

# all frames, four workers
node tools/render.mjs --fps 60 --from 0 --to 8219 --workers 4

# encode
FPS=60 CRF=18 bash tools/encode.sh
```

## Timeline

120 BPM, one bar = 2 s. The film starts with a half-bar pickup, so the first
downbeat is at 1.0 s and every frame crossing lands on a downbeat.

| section | time | beats |
|---|---|---|
| Intro | 0:00–0:05 | 2 bars + pickup |
| 20 eras × 6 s | 0:05–2:05 | 3 bars each |
| Outro | 2:05–2:17 | 6 bars |

Each era: bar 1 enters, bar 2 is its gag / hold, bar 3 rides to the next frame.
One pedal revolution = two beats. The wheel and road share the same speed.

| # | id | section |
|---|---|---|
| 1 | `s01_sahara` | 撒哈拉岩画 · Saharan Rock Art |
| 2 | `s02_egypt` | 埃及壁画 · Egyptian Tomb Painting |
| 3 | `s03_hanstone` | 汉画像石拓片 · Han Stone Rubbing |
| 4 | `s04_tangline` | 唐代白描 · Tang Line Drawing |
| 5 | `s05_songland` | 宋代山水 · Song Landscape |
| 6 | `s06_qingming` | 清明上河图 · Along the River During Qingming |
| 7 | `s07_maya` | 玛雅抄本 · Maya Codex |
| 8 | `s08_mughal` | 莫卧儿细密画 · Mughal Miniature |
| 9 | `s09_bada` | 八大山人写意 · Bada Shanren |
| 10 | `s10_wayang` | 爪哇皮影戏 · Wayang Kulit |
| 11 | `s11_ukiyo` | 浮世绘 · Ukiyo-e |
| 12 | `s12_vangogh` | 星月夜 · The Starry Night |
| 13 | `s13_scream` | 呐喊 · The Scream |
| 14 | `s14_nosferatu` | 诺斯费拉图 · Nosferatu |
| 15 | `s15_scope` | 示波器矢量图 · Oscilloscope |
| 16 | `s16_pixel` | 8-bit 像素游戏 · 8-Bit Arcade |
| 17 | `s17_chat` | 早期聊天窗口 · Early Chat Client |
| 18 | `s18_vapor` | 蒸汽波 · Vaporwave |
| 19 | `s19_vertical` | 竖屏短视频 · Vertical Video |
| 20 | `s20_code` | 代码美学 · Code Aesthetic |

Special transition: at the 14→15 crossing the Nosferatu wall shadow is
"electrified" into the green phosphor outline of the oscilloscope. In phase 1 it
uses the generic through-frame transition.

## Architecture

```
src/kit/        shared 2D toolkit: seeded math, ink/brush marks, paper and grain,
                road, title cards
src/beat/       BPM, bars, sections, strong-beat pulses, timecode
src/rig/        parametric pelican + bicycle pose, plus a styleable painter
src/scenes/     one file per era; render is a pure function of t and a view
src/main/       director, camera, through-frame transition, intro, outro, boot
tools/          static server, shot, contact sheet, parallel renderer, encoder
briefs/         shared art direction + per-era briefs (phase 3)
audio/          synthesized score (phase 4)
```

Contract for a scene:

```js
export default {
  id, number, cn, en, year, palette,
  draw(g, ctx) { /* paint in 1000-unit-tall space */ },
};
```

`ctx` provides `t`, `local`, `view`, `road()`, `rider()`, and the era's palette
style. Scenes run at any canvas aspect; `applyView` maps the 1000-unit-tall page
to the target. Camera pushes happen in `src/main/camera.js`; frame crossings are
clipped apertures in `src/main/transitions.js`.

The pelican and bicycle are one skeleton (`src/rig/pose.js`). Every era gets the
same joints and draws them its own way; this is what keeps the motion continuous
when the style cuts. The rig has IK legs on the pedals, a rotating crank and
wheels, head bob, blink and a wing to the handlebar.

## Determinism

No `Math.random()` in drawing code. All jitter uses `rngFor(seed)` keyed by scene
and feature, and all animation is a function of the musical clock. `renderAt(t)`
is synchronous, so Puppeteer can call it and screenshot the same frame every run.
Textures (paper, grain) are generated once and cached; there is no temporal noise.

## Frame rate

See `out/fps-test/` and the measured numbers below. The comparator renders a
2-second camera pan at both rates; 60 fps doubles frames and export time, so it
only wins if the camera move visibly benefits. `FPS` in `src/beat/timeline.js`
and the `--fps` flag must match.

Measured on the M-series workstation, 1920×1080 PNG capture:

| rate | frames (2 s) | wall time | ms/frame |
|---|---|---|---|
| 30 fps | 60 | 6.1 s | 102 |
| 60 fps | 120 | 12.3 s | 103 |

60 fps is chosen. The road moves at 314 units/s (≈339 px/s at zoom 1), so a
30 fps cut jumps ≈11 px per frame; 60 fps halves that to ≈5.6 px and keeps the
push-in edges smooth. The full 8,220-frame export takes about 14 minutes with
four workers and ≈20 GB of intermediate PNGs; 30 fps would halve both. Retro
scenes still quantise their own animation to 8–12 Hz.

## Licensing

- p5.js 2.3.4 is LGPL-2.1; the minified build and its license are vendored in
  `public/vendor/`. See `THIRD_PARTY_NOTICES.md`.
- p5.brush 2.2.3 is MIT. It was evaluated for the ink eras but is not used yet:
  it requires a WEBGL canvas, while the film uses one 2D canvas for deterministic
  text and pixel work. We use a small seeded 2D brush kit instead.
- No frames, video, audio, cover art, brief text or gag compositions from the
  reference project are used. See `NOTICE.md`.
- Historical artworks referenced are public domain. Software, game and app UIs
  are fictional and original.
