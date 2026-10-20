#!/usr/bin/env bash
# Encode frames/f00000.png... into out/pelican_test.mp4
#   FPS=60 CRF=18 AUDIO=audio/mix.wav bash tools/encode.sh
set -euo pipefail

FPS="${FPS:-60}"
CRF="${CRF:-18}"
OUT="${OUT:-out/pelican_test.mp4}"
FRAMES="${FRAMES:-frames/f%05d.png}"

mkdir -p "$(dirname "$OUT")"

if [[ -n "${AUDIO:-}" ]]; then
  ffmpeg -y -hide_banner \
    -framerate "$FPS" -start_number 0 -i "$FRAMES" \
    -i "$AUDIO" \
    -c:v libx264 -preset slow -crf "$CRF" -pix_fmt yuv420p \
    -c:a aac -b:a 192k -shortest \
    -movflags +faststart "$OUT"
else
  ffmpeg -y -hide_banner \
    -framerate "$FPS" -start_number 0 -i "$FRAMES" \
    -c:v libx264 -preset slow -crf "$CRF" -pix_fmt yuv420p \
    -movflags +faststart "$OUT"
fi

ffprobe -v error -show_entries format=duration,size -show_entries stream=width,height,r_frame_rate,codec_name -of default=noprint_wrappers=1 "$OUT"
