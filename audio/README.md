# Audio

Phase 1 is silent. Phase 4 adds a fully synthesized score:

- one original theme, re-orchestrated per era (hand drum + voice, harp, bells,
  pipa, guqin, dizi + gongs, ocarina + wood drum, sitar + tabla, xiao, gamelan,
  shamisen, strings, detuned strings, silent-film piano + organ, sine buzz,
  four-channel chiptune, MIDI-style ringtones, vaporwave tape, short pop beat,
  piano + synth);
- bicycle bell and chain as recurring percussion;
- 120 BPM, with the vaporwave insert rendered at 151.2 BPM / +4 semitones and
  played back at 0.7937 through a tape chain;
- offline Web Audio render to WAV, then `AUDIO=audio/mix.wav bash tools/encode.sh`.

No external audio files are used.
