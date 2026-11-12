#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
# Original generated stills; two-second looping camera movement, not animated robot actions.
for name in welcome learning artist; do
  ffmpeg -hide_banner -loglevel error -y -i "assets/kids-ai/$name.webp" -filter_complex "scale=960:540,zoompan=z='1.04+0.025*sin(on*2*PI/16)':x='iw/2-iw/zoom/2':y='ih/2-ih/zoom/2':d=16:s=400x225:fps=8,split[a][b];[a]palettegen=max_colors=64[p];[b][p]paletteuse=dither=bayer:bayer_scale=3" -frames:v 16 -loop 0 "assets/kids-ai/$name-motion.gif"
  ffmpeg -hide_banner -loglevel error -y -i "assets/kids-ai/$name.webp" -vf "scale=1280:720,zoompan=z='1.04+0.025*sin(on*2*PI/16)':x='iw/2-iw/zoom/2':y='ih/2-ih/zoom/2':d=16:s=960x540:fps=8" -frames:v 16 -c:v libwebp_anim -lossless 0 -q:v 72 -loop 0 -an "assets/kids-ai/$name-motion.webp"
done
