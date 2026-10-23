"""
Story film frames  ->  story/frames/0000.webp, 0001.webp, ...
                       story/frames.js        (frame list read by js/story.js)
                       story/film.mp4         (the film itself, for the Play button)
                       images/story-poster.jpg (the film's card in the gallery)

story.html plays the invitation video as you scroll: instead of a <video>,
it draws one still frame of the film per scroll position on a <canvas>
(the same trick as Apple's product pages). This script cuts those frames.
"Play with music" plays film.mp4, the real video at full smoothness.

HOW TO USE
  Needs ffmpeg, numpy and Pillow:
      pip install numpy pillow imageio-ffmpeg      (imageio-ffmpeg brings ffmpeg)
  Then, in the project folder:
      python scripts/build-story-frames.py
  Run it again after changing the video or the SETTINGS below. It replaces
  everything in story/frames/, and the page picks up the new frames
  (the version in story/frames.js changes, so phones don't keep old ones).

The original video (AbuSachin-invite-video.mp4) stays out of git: it is over
GitHub's 100 MB limit. Only the frames, film.mp4 and the poster are committed.
"""
import hashlib
import os
import shutil
import subprocess
import sys
import tempfile

import numpy as np
from PIL import Image

# =============================== SETTINGS ===============================

VIDEO = 'AbuSachin-invite-video.mp4'   # in the project folder

# Frames per second of film. More = smoother when scrolling slowly, but more
# to download (each second of film costs FPS x ~27 KB).
#   10 -> ~27 MB    12 -> ~33 MB    15 -> ~41 MB    (whole 1:54 film)
FPS = 12

# Frame width in px (the height follows the video's 2:3 shape: 540 -> 810).
# 540 is sharp on phones; 720 is crisper on large desktop screens but ~1.7x
# the download.
WIDTH = 540

# WebP quality 0-100. 50 looks the same as 60 for these paintings and saves ~10%.
QUALITY = 50

# Frames that barely change from the last kept frame (title cards, pauses) are
# stored once and reused. Higher = more frames merged. A frame is merged only
# if its AVERAGE change is below STILL_MEAN and its STRONGEST change
# (99th percentile, so a small caption fading in still counts) is below STILL_PEAK.
# Both are in grey levels out of 255. 0 / 0 = keep every frame.
STILL_MEAN = 0.6
STILL_PEAK = 6

# The video the Play button plays (H.264 + AAC .mp4 plays everywhere, incl. iPhone).
# VIDEO_CRF: lower = sharper and bigger.  26 -> ~23 MB   28 -> ~19 MB  (720 px)
VIDEO_WIDTH = 720
VIDEO_CRF = 28
AUDIO_BITRATE = '128k'

# Gallery card picture: the film at POSTER_AT seconds, cut to 4:3 starting
# POSTER_TOP of the way down the frame (0 = top). 2.1 s = the title over the beach.
POSTER_AT = 2.1
POSTER_TOP = 0.345

# ========================================================================

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, 'story')
FRAMES = os.path.join(OUT, 'frames')


def find_ffmpeg():
    exe = os.environ.get('FFMPEG') or shutil.which('ffmpeg')
    if exe:
        return exe
    try:
        import imageio_ffmpeg
        return imageio_ffmpeg.get_ffmpeg_exe()
    except ImportError:
        sys.exit('ffmpeg not found: install it, or  pip install imageio-ffmpeg,'
                 '  or set FFMPEG=path\\to\\ffmpeg.exe')


def run(ffmpeg, *args):
    subprocess.run([ffmpeg, '-hide_banner', '-loglevel', 'error', '-y', *args], check=True)


def grey(path):
    # small grey copy: enough detail to see a caption appear, cheap to compare
    im = Image.open(path).convert('L').resize((WIDTH // 4, WIDTH * 3 // 8), Image.BILINEAR)
    return np.asarray(im, dtype=np.int16)


def main():
    video = os.path.join(ROOT, VIDEO)
    if not os.path.exists(video):
        sys.exit(f'Video not found: {video}')
    ffmpeg = find_ffmpeg()

    with tempfile.TemporaryDirectory() as tmp:
        # 1. every frame at FPS, scaled, as WebP
        print(f'Cutting frames at {FPS} fps, {WIDTH} px wide ...')
        run(ffmpeg, '-i', video, '-an',
            '-vf', f'fps={FPS},scale={WIDTH}:-2:flags=lanczos',
            '-c:v', 'libwebp', '-quality', str(QUALITY), '-compression_level', '6',
            os.path.join(tmp, '%05d.webp'))
        cut = sorted(f for f in os.listdir(tmp) if f.endswith('.webp'))
        if not cut:
            sys.exit('ffmpeg produced no frames')
        width, height = Image.open(os.path.join(tmp, cut[0])).size

        # 2. merge runs of (nearly) unchanged frames: starts[k] = the first
        #    film frame that stored frame k stands for
        starts, last = [], None
        for i, name in enumerate(cut):
            g = grey(os.path.join(tmp, name))
            if last is not None:
                d = np.abs(g - last)
                if d.mean() < STILL_MEAN and np.percentile(d, 99) < STILL_PEAK:
                    continue
            starts.append(i)
            last = g

        # 3. replace story/frames/ with the kept frames, numbered 0000, 0001, ...
        shutil.rmtree(FRAMES, ignore_errors=True)
        os.makedirs(FRAMES)
        total = 0
        for k, i in enumerate(starts):
            dst = os.path.join(FRAMES, f'{k:04d}.webp')
            shutil.copyfile(os.path.join(tmp, cut[i]), dst)
            total += os.path.getsize(dst)

    # 4. the video for Play: a keyframe every 2 s so it can start anywhere quickly,
    #    and faststart so it begins playing before it has fully downloaded
    print(f'Writing the video ({VIDEO_WIDTH} px) ...')
    film = os.path.join(OUT, 'film.mp4')
    run(ffmpeg, '-i', video, '-vf', f'scale={VIDEO_WIDTH}:-2:flags=lanczos',
        '-c:v', 'libx264', '-preset', 'slow', '-crf', str(VIDEO_CRF), '-profile:v', 'high',
        '-pix_fmt', 'yuv420p', '-g', '60', '-c:a', 'aac', '-b:a', AUDIO_BITRATE,
        '-movflags', '+faststart', film)
    old = os.path.join(OUT, 'soundtrack.m4a')   # earlier versions played music only
    if os.path.exists(old):
        os.remove(old)

    # 5. the gallery card picture
    with tempfile.TemporaryDirectory() as tmp:
        still = os.path.join(tmp, 'poster.png')
        run(ffmpeg, '-ss', str(POSTER_AT), '-i', video, '-frames:v', '1', still)
        im = Image.open(still).convert('RGB')
        top = round(im.height * POSTER_TOP)
        crop_h = round(im.width * 3 / 4)
        im = im.crop((0, top, im.width, min(im.height, top + crop_h))).resize((800, 600), Image.LANCZOS)
        im.save(os.path.join(ROOT, 'images', 'story-poster.jpg'), quality=82, optimize=True, progressive=True)

    # 6. the frame list for the page; the version changes whenever the frames do
    version = hashlib.sha1(f'{os.path.getmtime(video)}|{FPS}|{WIDTH}|{QUALITY}|'
                           f'{STILL_MEAN}|{STILL_PEAK}|{VIDEO_WIDTH}|{VIDEO_CRF}|'
                           f'{starts}'.encode()).hexdigest()[:8]
    with open(os.path.join(OUT, 'frames.js'), 'w', encoding='utf-8') as f:
        f.write('// Generated by scripts/build-story-frames.py. Do not edit.\n')
        f.write('// starts[k] = the first film frame that story/frames/k.webp stands for\n')
        f.write('window.STORY_FILM = {\n')
        f.write(f"  version: '{version}',\n")
        f.write(f'  fps: {FPS},\n')
        f.write(f'  filmFrames: {len(cut)},\n')
        f.write(f'  width: {width},\n')
        f.write(f'  height: {height},\n')
        f.write(f'  starts: [{",".join(map(str, starts))}]\n')
        f.write('};\n')

    print(f'{len(cut)} film frames -> {len(starts)} stored '
          f'({len(cut) - len(starts)} still frames reused), '
          f'{total / 1048576:.1f} MB, {width}x{height}')
    print(f'Video: {os.path.getsize(film) / 1048576:.1f} MB')


if __name__ == '__main__':
    main()
