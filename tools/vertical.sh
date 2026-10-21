#!/usr/bin/env bash
# Build the separate 1000x1000 vertical cut.
#
# It selects eight eras whose title card and rider sit in the left half, crops
# the 1920x1080 frames to a 1080-square for those eras, letterboxes the intro/outro
# full-frame, scales to 1000, and muxes the matching slice of audio/score.wav.
# The result is a standalone montage; it is not part of the 137 s horizontal film.
#
#   AUDIO=audio/score.wav bash tools/vertical.sh
#
# Output: out/pelican_test_vertical.mp4
set -euo pipefail

AUDIO="${AUDIO:-audio/score.wav}"
OUT="${OUT:-out/pelican_test_vertical.mp4}"
FPS="${FPS:-60}"
CRF="${CRF:-18}"
FRAMES="${FRAMES:-frames/f%05d.png}"
TMP="${TMP:-out/vertical-segments}"

[[ -f "$AUDIO" ]] || { echo "missing audio: $AUDIO" >&2; exit 1; }
[[ -f frames/f00000.png ]] || { echo "missing frames" >&2; exit 1; }

rm -rf "$TMP"
mkdir -p "$TMP"
: > "$TMP/list.txt"

# label: start seconds, duration, crop x (0 = preserve the bottom-left title card)
segments=(
  "00-intro 1 4 letterbox"
  "01-sahara 5 6 left"
  "02-egypt 11 6 left"
  "03-hanstone 17 6 left"
  "07-maya 41 6 left"
  "08-mughal 47 6 left"
  "10-wayang 59 6 left"
  "12-vangogh 71 6 left"
  "14-nosferatu 83 6 left"
  "99-outro 125 12 letterbox"
)

i=0
for spec in "${segments[@]}"; do
  read -r name start dur cropmode <<< "$spec"
  i=$((i + 1))

  if [[ "$cropmode" == "center" ]]; then
    crop="crop=1080:1080:420:0"
  elif [[ "$cropmode" == "letterbox" ]]; then
    crop="scale=1000:562:flags=lanczos,pad=1000:1000:0:219:black"
  else
    crop="crop=1080:1080:0:0"
  fi

  if [[ "$name" == "00-intro" || "$name" == "99-outro" ]]; then
    f0=$((start * FPS))
    frames=$((dur * FPS))
    a0=$start
    adur=$dur
  else
    # Trim 0.25 s from both ends so the cut never includes the aperture transition.
    f0=$((start * FPS + 15))
    frames=$((dur * FPS - 30))
    a0=$(awk "BEGIN { printf \"%.3f\", $start + 0.25 }")
    adur=$(awk "BEGIN { printf \"%.3f\", $dur - 0.5 }")
  fi

  seg=$(printf "%s/seg%02d-%s.mp4" "$TMP" "$i" "$name")
  echo "  $name  video ${f0}..$((f0 + frames - 1))  audio ${a0}s +${adur}s"

  ffmpeg -y -hide_banner -loglevel error \
    -framerate "$FPS" -start_number "$f0" -i "$FRAMES" \
    -ss "$a0" -t "$adur" -i "$AUDIO" \
    -frames:v "$frames" \
    -vf "${crop},scale=1000:1000:flags=lanczos" \
    -r "$FPS" -c:v libx264 -preset medium -crf "$CRF" -pix_fmt yuv420p \
    -c:a aac -b:a 192k -ar 48000 -ac 2 -shortest \
    "$seg"

  echo "file '$PWD/$seg'" >> "$TMP/list.txt"
done

ffmpeg -y -hide_banner -loglevel error \
  -f concat -safe 0 -i "$TMP/list.txt" \
  -c copy -movflags +faststart "$OUT"

ffprobe -v error \
  -show_entries format=duration,size -show_entries stream=width,height,r_frame_rate,codec_name \
  -of default=noprint_wrappers=1 "$OUT"
