# Audio

`audio/score.wav` is the film's original 137.0 s score and sound-effects bed:
48 kHz, stereo, 16-bit PCM, peak −1.4 dBFS. Every sound is synthesised offline
by `tools/score.mjs` from additive/FM oscillators, filtered noise, a Schroeder
reverb, seeded jitter and a small master chain. No samples, no network audio,
and no material from any other film or recording.

## Render

```bash
node tools/score.mjs
```

This writes `audio/score.wav` and prints the duration, peak, RMS and a per-cue
level report. Noise seeds and event order are fixed, so reruns produce the same
bytes. Mux it with the picture via the existing encoder:

```bash
AUDIO=audio/score.wav bash tools/encode.sh
```

## What is in it

One two-note D–E motif at 120 BPM in 4/4 (half-bar pickup, one chord per
two-second bar in D minor/Dorian) is re-orchestrated for each era: Sahara bone
flute, hand drum and voice; Egyptian harp and reed; Han stone chimes and low
drum; Tang guqin and pipa; Song xiao and soft strings; Qingming pipa, dizi,
river and gong; Maya ocarina and log drum; Mughal sitar, tabla and tanpura;
Bada qin and brush; Wayang gamelan and gong; Ukiyo-e shamisen and woodblocks;
Van Gogh oboe, warm strings and harp; Munch detuned strings, bell and a bent
scream; Nosferatu piano, organ, tremolo strings and projector; oscilloscope
sine beeps, CRT hum and a Lissajous pitch gag; four-channel chiptune with an
original coin/1UP arpeggio; MIDI-style ringtones, message blips and a window-
shake thump; a 151.2 BPM smooth-jazz source (FM electric piano, fretless bass,
sax-ish lead, gated drums) rendered in F-sharp and played back at 0.7937
through a 4 kHz tape chain with wow, hiss and a half-beat stutter; a vertical-
video pop beat; and a piano/synth code finale.

A quiet D pedal and air run under the whole film; bicycle bell and chain ticks
are recurring percussion. Every 6 s frame crossing at 5 + 6n gets a short
whoosh plus an era-specific cue (chisel, page, gong, projector, electrify, CRT,
tape click, shutter, keys). Cue automation and gentle compression shape a
restrained first half, a build from 71 s, a peak across the 8-bit and chat cues
at 98–104 s, a tape-flattened strip-back, and a resolve into the outro. The
final D chord lands at 135 s, a single bicycle bell answers it, and the tail
fades to zero by 137 s.
