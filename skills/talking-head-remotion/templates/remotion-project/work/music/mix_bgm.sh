#!/usr/bin/env bash
set -euo pipefail

INPUT="${1:-renders/demo.mp4}"
BGM="${2:-public/assets/music/bgm.mp3}"
OUTPUT="${3:-renders/demo_bgm.mp4}"
BGM_VOLUME="${BGM_VOLUME:-0.22}"

mkdir -p "$(dirname "$OUTPUT")"

ffmpeg -y \
  -i "$INPUT" \
  -stream_loop -1 -i "$BGM" \
  -filter_complex "[1:a]volume=${BGM_VOLUME}[bgm];[bgm][0:a]sidechaincompress=threshold=0.075:ratio=2.4:attack=18:release=170:makeup=1.15[ducked];[0:a][ducked]amix=inputs=2:duration=first:normalize=0,alimiter=limit=0.88[a]" \
  -map 0:v -map "[a]" \
  -c:v copy -c:a aac -b:a 192k -shortest \
  "$OUTPUT"

ffmpeg -hide_banner -i "$OUTPUT" -af volumedetect -f null -
