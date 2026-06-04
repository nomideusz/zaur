#!/bin/bash
# Uploads one video file (with sidecar .info.json) to MediaCMS via the REST API,
# tagging it with the channel name so cleanup can find it later. Deletes local
# files on success.
set -u

file="$1"
[ -f "$file" ] || { echo "[upload] no file: $file"; exit 1; }

base="${file%.*}"
info="$base.info.json"
thumb="$base.jpg"

if [ -f "$info" ]; then
    title=$(jq -r '.title // "Untitled"' "$info")
    description=$(jq -r '.description // ""' "$info")
    uploader=$(jq -r '.uploader // ""' "$info")
    video_id=$(jq -r '.id // ""' "$info")
    webpage_url=$(jq -r '.webpage_url // ""' "$info")
    upload_date=$(jq -r '.upload_date // ""' "$info")
else
    title=$(basename "$file" | sed 's/\.[^.]*$//')
    description=""
    uploader=""
    video_id=""
    webpage_url=""
    upload_date=""
fi

# MediaCMS rejects titles longer than 100 characters (HTTP 400).
title=$(printf '%s' "$title" | head -c 100)

# truncate description; MediaCMS handles huge text but keep API payload lean
description=$(printf '%s' "$description" | head -c 4000)
desc_full=$(printf '%s\n\nSource: %s\nChannel: %s\nUploaded: %s' "$description" "$webpage_url" "$uploader" "$upload_date")

# Tag with the channel slug so cleanup can group videos. Slugify: lowercase,
# spaces->dashes, drop non-alnum.
chan_tag=$(printf '%s' "$uploader" | tr '[:upper:]' '[:lower:]' | tr ' ' '-' | tr -cd 'a-z0-9-')

echo "[upload] $title  (chan=$chan_tag id=$video_id $(du -h "$file" | awk '{print $1}'))"

# curl -F treats commas in filenames as multipart-mixed separators, and
# bare special chars can confuse @-syntax. Symlink to a clean name first.
ext="${file##*.}"
clean="$(dirname "$file")/vid_${video_id:-$$}.${ext}"
ln -sf "$file" "$clean"
resp=$(mktemp)
http_code=$(curl -sS -o "$resp" -w "%{http_code}" --max-time 1800 \
    -X POST "${MEDIACMS_URL%/}/api/v1/media" \
    -H "Authorization: Token $MEDIACMS_TOKEN" \
    -F "media_file=@$clean" \
    -F "title=$title" \
    -F "description=$desc_full" \
    -F "tags=$chan_tag,youtube-mirror")
rm -f "$clean"

if [ "$http_code" = "201" ]; then
    token=$(jq -r '.friendly_token // "?"' "$resp")
    echo "[upload]   ok  friendly_token=$token"

    rm -f "$resp" "$file" "$info" "$thumb" "$base.webp" "$base.png"
    # cleanup empty parent dir (the per-uploader subdir yt-dlp made)
    rmdir "$(dirname "$file")" 2>/dev/null || true
else
    echo "[upload]   FAIL http=$http_code"
    head -c 500 "$resp"; echo
    rm -f "$resp"
    exit 1
fi
