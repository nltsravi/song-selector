#!/usr/bin/env python3
"""
Generates all brand logos, favicons, PWA icons, Android adaptive/launcher icons,
iOS AppIcon.appiconset icons, Android & iOS splash screens, PDF/DOCX watermarks,
and Google Play Store & Apple App Store graphic artifacts.
Also removes all legacy omkaarssl images.
"""

import base64
import glob
import io
import json
import math
import os
from PIL import Image, ImageDraw, ImageFont, ImageFilter

ROOT_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
ARTIFACT_DIR = "/Users/ravij/.gemini/antigravity/brain/d8d63264-5757-4dff-a69e-01e80650d0eb"

MASTER_ICON_SRC = os.path.join(ARTIFACT_DIR, "song_selector_master_icon_bleed_1794419178766.jpg")
EMBLEM_WHITE_SRC = os.path.join(ARTIFACT_DIR, "song_selector_emblem_white_1794419202413.jpg")


def remove_legacy_omkaarssl_files():
    patterns = [
        os.path.join(ROOT_DIR, "public/images/omkaar*"),
        os.path.join(ROOT_DIR, "src/images/omkaar*"),
        os.path.join(ROOT_DIR, "android/app/src/main/assets/public/images/omkaar*"),
        os.path.join(ROOT_DIR, "ios/App/App/public/images/omkaar*"),
    ]
    removed = []
    for pat in patterns:
        for f in glob.glob(pat):
            if os.path.isfile(f):
                os.remove(f)
                removed.append(os.path.relpath(f, ROOT_DIR))
    # Also remove default Capacitor vector foreground/background xmls that override mipmap PNGs
    for xml_rel in [
        "android/app/src/main/res/drawable-v24/ic_launcher_foreground.xml",
        "android/app/src/main/res/drawable/ic_launcher_background.xml",
    ]:
        p = os.path.join(ROOT_DIR, xml_rel)
        if os.path.isfile(p):
            os.remove(p)
            removed.append(xml_rel)
    print(f"Removed {len(removed)} legacy omkaarssl / template icon files.")


def extract_transparent_emblem(emblem_jpg_path):
    """
    Converts the white-background emblem into a clean RGBA image with transparent background.
    Crops around the emblem with a balanced margin so it fills icons/headers nicely.
    """
    img = Image.open(emblem_jpg_path).convert("RGBA")
    datas = img.getdata()
    new_data = []
    for r, g, b, a in datas:
        # Distance from pure white (255, 255, 255)
        luminance = (r * 0.299 + g * 0.587 + b * 0.114)
        if luminance > 246:
            new_data.append((r, g, b, 0))
        elif luminance > 220:
            # Smooth anti-aliased alpha transition
            alpha = int(255 * (246 - luminance) / (246 - 220))
            new_data.append((r, g, b, max(0, min(255, alpha))))
        else:
            new_data.append((r, g, b, 255))
    img.putdata(new_data)

    # Find bounding box of non-transparent pixels
    bbox = img.getbbox()
    if bbox:
        cropped = img.crop(bbox)
    else:
        cropped = img

    return cropped


def make_square_with_padding(img_rgba, size, pad_ratio=0.10):
    """Places an RGBA image centered inside a square transparent canvas of `size x size`."""
    canvas = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    inner = int(size * (1.0 - 2 * pad_ratio))
    w, h = img_rgba.size
    scale = min(inner / w, inner / h)
    nw, nh = max(1, int(w * scale)), max(1, int(h * scale))
    resized = img_rgba.resize((nw, nh), Image.Resampling.LANCZOS)
    ox = (size - nw) // 2
    oy = (size - nh) // 2
    canvas.paste(resized, (ox, oy), resized)
    return canvas


def make_rect_with_padding(img_rgba, width, height, pad_ratio=0.08):
    """Places an RGBA image centered inside a rectangular transparent canvas."""
    canvas = Image.new("RGBA", (width, height), (0, 0, 0, 0))
    inner_w = int(width * (1.0 - 2 * pad_ratio))
    inner_h = int(height * (1.0 - 2 * pad_ratio))
    w, h = img_rgba.size
    scale = min(inner_w / w, inner_h / h)
    nw, nh = max(1, int(w * scale)), max(1, int(h * scale))
    resized = img_rgba.resize((nw, nh), Image.Resampling.LANCZOS)
    ox = (width - nw) // 2
    oy = (height - nh) // 2
    canvas.paste(resized, (ox, oy), resized)
    return canvas


def apply_opacity(img_rgba, opacity_percent):
    """Scales the alpha channel of an RGBA image by opacity_percent (0..100)."""
    out = img_rgba.copy()
    r, g, b, a = out.split()
    factor = opacity_percent / 100.0
    a = a.point(lambda p: int(p * factor))
    out.putalpha(a)
    return out


def make_rounded_icon(master_rgb, size, radius_ratio=0.22):
    """Creates a rounded-rectangle RGBA launcher icon from the master square icon."""
    resized = master_rgb.resize((size, size), Image.Resampling.LANCZOS).convert("RGBA")
    mask = Image.new("L", (size, size), 0)
    draw = ImageDraw.Draw(mask)
    radius = int(size * radius_ratio)
    draw.rounded_rectangle([(0, 0), (size - 1, size - 1)], radius=radius, fill=255)
    out = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    out.paste(resized, (0, 0), mask)
    return out


def make_circle_icon(master_rgb, size):
    """Creates a circular RGBA launcher icon from the master square icon."""
    resized = master_rgb.resize((size, size), Image.Resampling.LANCZOS).convert("RGBA")
    mask = Image.new("L", (size, size), 0)
    draw = ImageDraw.Draw(mask)
    draw.ellipse([(0, 0), (size - 1, size - 1)], fill=255)
    out = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    out.paste(resized, (0, 0), mask)
    return out


def create_splash_screen(master_icon, width, height):
    """Creates a splash screen of (width x height) with deep indigo background and centered icon."""
    # Sample top-left pixel of master_icon for seamless background color
    bg_color = (34, 34, 115, 255)
    splash = Image.new("RGBA", (width, height), bg_color)
    # Create subtle radial glow in center
    min_dim = min(width, height)
    logo_size = int(min_dim * 0.42)
    icon_resized = master_icon.resize((logo_size, logo_size), Image.Resampling.LANCZOS).convert("RGBA")
    # Circular feather mask so master_icon blends smoothly into splash background
    mask = Image.new("L", (logo_size, logo_size), 0)
    draw = ImageDraw.Draw(mask)
    draw.ellipse([(int(logo_size * 0.05), int(logo_size * 0.05)), (int(logo_size * 0.95), int(logo_size * 0.95))], fill=255)
    mask = mask.filter(ImageFilter.GaussianBlur(radius=max(4, int(logo_size * 0.04))))
    ox = (width - logo_size) // 2
    oy = (height - logo_size) // 2
    splash.paste(icon_resized, (ox, oy), mask)
    return splash.convert("RGB")


def create_store_feature_graphic(master_icon, width=1024, height=500):
    """Creates a 1024x500 Google Play Store Feature Graphic."""
    bg = Image.new("RGB", (width, height), (30, 27, 75))
    draw = ImageDraw.Draw(bg)
    # Smooth gradient backdrop
    for y in range(height):
        r = int(28 + (67 - 28) * (y / height))
        g = int(25 + (56 - 25) * (y / height))
        b = int(90 + (160 - 90) * (y / height))
        draw.line([(0, y), (width, y)], fill=(r, g, b))

    # Place rounded master icon on left
    icon_size = 340
    rounded_icon = make_rounded_icon(master_icon, icon_size, radius_ratio=0.22)
    bg_rgba = bg.convert("RGBA")
    bg_rgba.paste(rounded_icon, (70, (height - icon_size) // 2), rounded_icon)
    draw = ImageDraw.Draw(bg_rgba)

    # Load system font or default
    font_title = None
    font_sub = None
    font_badge = None
    for font_candidate in [
        "/System/Library/Fonts/Supplemental/Arial Bold.ttf",
        "/System/Library/Fonts/Helvetica.ttc",
        "/System/Library/Fonts/SFNS.ttf",
    ]:
        if os.path.exists(font_candidate):
            try:
                font_title = ImageFont.truetype(font_candidate, 44)
                font_sub = ImageFont.truetype(font_candidate, 24)
                font_badge = ImageFont.truetype(font_candidate, 18)
                break
            except Exception:
                pass
    if font_title is None:
        font_title = ImageFont.load_default()
        font_sub = ImageFont.load_default()
        font_badge = ImageFont.load_default()

    text_x = 450
    draw.text((text_x, 130), "Song Collection &", fill=(255, 255, 255, 255), font=font_title)
    draw.text((text_x, 185), "Lyrics Library", fill=(253, 224, 71, 255), font=font_title)
    draw.text((text_x, 260), "Multi-Lingual Devotional Songbook", fill=(224, 231, 255, 255), font=font_sub)
    draw.text((text_x, 296), "Tamil  •  English  •  Devanagari", fill=(199, 210, 254, 255), font=font_sub)

    # Pill badge
    draw.rounded_rectangle([(text_x, 350), (text_x + 340, 392)], radius=21, fill=(79, 70, 229, 255), outline=(253, 224, 71, 200), width=2)
    draw.text((text_x + 24, 361), "PDF & DOCX Songbook Export", fill=(255, 255, 255, 255), font=font_badge)

    return bg_rgba.convert("RGB")


def create_store_screenshot(master_icon, emblem_rgba, width, height, variant=1):
    """Creates clean, high-resolution App Store / Play Store showcase screenshots at exact required dimensions."""
    img = Image.new("RGB", (width, height), (15, 23, 42))
    draw = ImageDraw.Draw(img)

    # Top banner gradient
    header_h = int(height * 0.22)
    for y in range(header_h):
        r = int(49 + (30 - 49) * (y / header_h))
        g = int(46 + (27 - 46) * (y / header_h))
        b = int(129 + (75 - 129) * (y / header_h))
        draw.line([(0, y), (width, y)], fill=(r, g, b))

    # Load fonts scaled to width
    title_sz = max(24, int(width * 0.042))
    sub_sz = max(16, int(width * 0.025))
    card_title_sz = max(18, int(width * 0.028))
    body_sz = max(14, int(width * 0.022))

    font_title = ImageFont.load_default()
    font_sub = ImageFont.load_default()
    font_card = ImageFont.load_default()
    font_body = ImageFont.load_default()
    for fc in [
        "/System/Library/Fonts/Supplemental/Arial Bold.ttf",
        "/System/Library/Fonts/Helvetica.ttc",
    ]:
        if os.path.exists(fc):
            try:
                font_title = ImageFont.truetype(fc, title_sz)
                font_sub = ImageFont.truetype(fc, sub_sz)
                font_card = ImageFont.truetype(fc, card_title_sz)
                font_body = ImageFont.truetype(fc, body_sz)
                break
            except Exception:
                pass

    # App icon + title in header
    icon_sz = int(width * 0.11)
    rounded = make_rounded_icon(master_icon, icon_sz, 0.22)
    img_rgba = img.convert("RGBA")
    pad_x = int(width * 0.07)
    top_y = int(height * 0.05)
    img_rgba.paste(rounded, (pad_x, top_y), rounded)
    draw = ImageDraw.Draw(img_rgba)

    if variant == 1:
        headline = "Song Collection & Lyrics Library"
        subline = "Browse, Search & Organize Multi-Lingual Songs"
    else:
        headline = "Custom Songbooks & Instant Export"
        subline = "Export Printable PDF & DOCX in Tamil, English & Hindi"

    draw.text((pad_x + icon_sz + int(width * 0.03), top_y + int(icon_sz * 0.12)), headline, fill=(255, 255, 255, 255), font=font_title)
    draw.text((pad_x + icon_sz + int(width * 0.03), top_y + int(icon_sz * 0.62)), subline, fill=(253, 224, 71, 255), font=font_sub)

    # Mock UI container card
    ui_top = int(height * 0.20)
    ui_bottom = int(height * 0.94)
    draw.rounded_rectangle([(pad_x, ui_top), (width - pad_x, ui_bottom)], radius=int(width * 0.03), fill=(248, 250, 252, 255))

    # App bar inside mock UI
    bar_h = int(height * 0.065)
    draw.rounded_rectangle([(pad_x, ui_top), (width - pad_x, ui_top + bar_h)], radius=int(width * 0.03), fill=(30, 41, 59, 255))
    draw.text((pad_x + int(width * 0.04), ui_top + int(bar_h * 0.28)), "Song Library  •  75 Devotional Songs", fill=(255, 255, 255, 255), font=font_card)

    sample_songs = [
        ("Ganesha Sharanam Sharanam Ganesha", "கணேசா சரணம் சரணம் கணேசா", "Deity: Ganesha  •  Tamil | English | Devanagari"),
        ("Govinda Krishna Jai Gopala Krishna Jai", "கோவிந்தா கிருஷ்ணா ஜெய்", "Deity: Krishna  •  Bhajan | Classical"),
        ("Om Namah Shivaya Shivaya Namah Om", "ஓம் நம சிவாய சிவாய நம ஓம்", "Deity: Shiva  •  Panchakshari Mantra"),
        ("Manasa Bhajare Guru Charanam", "மானஸ பஜரே குரு சரணம்", "Deity: Guru  •  Devotional | Chorus"),
    ]

    card_y = ui_top + bar_h + int(height * 0.03)
    card_h = int((ui_bottom - card_y - int(height * 0.04)) / 4.3)
    card_margin = int(width * 0.04)

    for idx, (eng, tam, meta) in enumerate(sample_songs):
        cy1 = card_y + idx * (card_h + int(height * 0.015))
        cy2 = cy1 + card_h
        draw.rounded_rectangle(
            [(pad_x + card_margin, cy1), (width - pad_x - card_margin, cy2)],
            radius=int(width * 0.02),
            fill=(255, 255, 255, 255),
            outline=(203, 213, 225, 255),
            width=2,
        )
        # Small emblem thumbnail on left of song card
        thumb_sz = int(card_h * 0.64)
        thumb = make_rounded_icon(master_icon, thumb_sz, 0.2)
        tx = pad_x + card_margin + int(width * 0.025)
        ty = cy1 + (card_h - thumb_sz) // 2
        img_rgba.paste(thumb, (tx, ty), thumb)
        draw = ImageDraw.Draw(img_rgba)

        text_left = tx + thumb_sz + int(width * 0.025)
        draw.text((text_left, cy1 + int(card_h * 0.16)), eng, fill=(15, 23, 42, 255), font=font_card)
        draw.text((text_left, cy1 + int(card_h * 0.56)), meta, fill=(79, 70, 229, 255), font=font_body)

    return img_rgba.convert("RGB")


def main():
    remove_legacy_omkaarssl_files()

    os.makedirs(os.path.join(ROOT_DIR, "src/images"), exist_ok=True)
    os.makedirs(os.path.join(ROOT_DIR, "public/images"), exist_ok=True)

    master_icon = Image.open(MASTER_ICON_SRC).convert("RGB")
    master_icon_1024 = master_icon.resize((1024, 1024), Image.Resampling.LANCZOS)
    master_icon_1024.save(os.path.join(ROOT_DIR, "src/images/song-selector-master-icon.png"), "PNG")

    emblem_cropped_rgba = extract_transparent_emblem(EMBLEM_WHITE_SRC)
    emblem_1024 = make_square_with_padding(emblem_cropped_rgba, 1024, pad_ratio=0.08)
    emblem_1024.save(os.path.join(ROOT_DIR, "src/images/song-selector-emblem.png"), "PNG")

    # 1. Web App Icons, Favicons, Brand Logos & Watermarks
    print("Generating Web App icons, favicons, brand logos & watermarks...")
    app_logo_512 = make_square_with_padding(emblem_cropped_rgba, 512, pad_ratio=0.08)
    app_logo_512.save(os.path.join(ROOT_DIR, "public/images/app-logo.png"), "PNG")
    app_logo_512.save(os.path.join(ROOT_DIR, "src/images/app-logo.png"), "PNG")

    # Header logo (400x312) and Watermarks (800x624)
    header_logo = make_rect_with_padding(emblem_cropped_rgba, 400, 312, pad_ratio=0.06)
    header_logo.save(os.path.join(ROOT_DIR, "public/images/app-logo-header.png"), "PNG")
    header_logo.save(os.path.join(ROOT_DIR, "src/images/app-logo-header.png"), "PNG")

    watermark_base = make_rect_with_padding(emblem_cropped_rgba, 800, 624, pad_ratio=0.06)
    for op in [7, 15, 25, 50]:
        wm = apply_opacity(watermark_base, op)
        wm.save(os.path.join(ROOT_DIR, f"public/images/app-logo-watermark-{op}.png"), "PNG")
        wm.save(os.path.join(ROOT_DIR, f"src/images/app-logo-watermark-{op}.png"), "PNG")

    # Update public/logo-data.js and apps-script/Logo.gs with compact base64 header & 7% watermark
    compact_header = make_rect_with_padding(emblem_cropped_rgba, 220, 172, pad_ratio=0.06)
    buf_h = io.BytesIO()
    compact_header.save(buf_h, format="PNG", optimize=True)
    header_b64 = base64.b64encode(buf_h.getvalue()).decode("ascii")

    compact_wm7 = apply_opacity(make_rect_with_padding(emblem_cropped_rgba, 360, 280, pad_ratio=0.06), 7)
    buf_w = io.BytesIO()
    compact_wm7.save(buf_w, format="PNG", optimize=True)
    wm7_b64 = base64.b64encode(buf_w.getvalue()).decode("ascii")

    logo_js_content = f"""/**
 * Embedded base64 representation of Song Collection & Lyrics Library brand logos
 * - LOGO_IMAGE_BASE64: Header & UI logo
 * - LOGO_IMAGE_WATERMARK_BASE64: 7% opacity light watermark for PDF/DOCX exports
 */
const LOGO_IMAGE_BASE64 = "{header_b64}";
const LOGO_IMAGE_WATERMARK_BASE64 = "{wm7_b64}";
if (typeof window !== 'undefined') {{
  window.LOGO_IMAGE_BASE64 = LOGO_IMAGE_BASE64;
  window.LOGO_IMAGE_WATERMARK_BASE64 = LOGO_IMAGE_WATERMARK_BASE64;
}}
if (typeof module !== 'undefined' && module.exports) {{
  module.exports = {{ LOGO_IMAGE_BASE64, LOGO_IMAGE_WATERMARK_BASE64 }};
}}
"""
    with open(os.path.join(ROOT_DIR, "public/logo-data.js"), "w", encoding="utf-8") as f:
        f.write(logo_js_content)

    logo_gs_content = f"""/**
 * Embedded Base64 representation of Song Collection & Lyrics Library brand logos
 * - LOGO_IMAGE_BASE64: Full color/contrast header logo
 * - LOGO_IMAGE_WATERMARK_BASE64: 7% opacity light watermark for center of pages
 */
const LOGO_IMAGE_BASE64 = "{header_b64}";
const LOGO_IMAGE_WATERMARK_BASE64 = "{wm7_b64}";
"""
    with open(os.path.join(ROOT_DIR, "apps-script/Logo.gs"), "w", encoding="utf-8") as f:
        f.write(logo_gs_content)

    # Web PWA & Favicon sizes from master_icon_1024
    web_icon_sizes = [16, 32, 48, 72, 96, 128, 144, 152, 180, 192, 384, 512]
    for sz in web_icon_sizes:
        ic = make_rounded_icon(master_icon_1024, sz, radius_ratio=0.18)
        if sz in (16, 32):
            ic.save(os.path.join(ROOT_DIR, f"public/images/favicon-{sz}x{sz}.png"), "PNG")
        if sz == 180:
            # Apple touch icon should be opaque RGB
            master_icon_1024.resize((180, 180), Image.Resampling.LANCZOS).save(
                os.path.join(ROOT_DIR, "public/images/apple-touch-icon.png"), "PNG"
            )
        if sz in (72, 96, 128, 144, 152, 192, 384, 512):
            # Save both opaque/maskable and rounded
            master_icon_1024.resize((sz, sz), Image.Resampling.LANCZOS).save(
                os.path.join(ROOT_DIR, f"public/images/icon-{sz}x{sz}.png"), "PNG"
            )

    # Multi-size favicon.ico in public/favicon.ico
    ico_16 = make_rounded_icon(master_icon_1024, 16, 0.18)
    ico_32 = make_rounded_icon(master_icon_1024, 32, 0.18)
    ico_48 = make_rounded_icon(master_icon_1024, 48, 0.18)
    ico_48.save(
        os.path.join(ROOT_DIR, "public/favicon.ico"),
        format="ICO",
        sizes=[(16, 16), (32, 32), (48, 48)],
        append_images=[ico_16, ico_32],
    )

    # 2. Android Mipmap Launcher Icons & Adaptive Foreground Icons
    print("Generating Android launcher icons & splash screens...")
    android_mipmaps = {
        "mipmap-mdpi": (48, 108),
        "mipmap-hdpi": (72, 162),
        "mipmap-xhdpi": (96, 216),
        "mipmap-xxhdpi": (144, 324),
        "mipmap-xxxhdpi": (192, 432),
    }
    # For adaptive foreground, extract the glowing gold/white emblem or place the emblem inside the 66% safe zone
    for folder, (launcher_px, fg_px) in android_mipmaps.items():
        out_dir = os.path.join(ROOT_DIR, "android/app/src/main/res", folder)
        os.makedirs(out_dir, exist_ok=True)
        # ic_launcher.png (rounded square)
        make_rounded_icon(master_icon_1024, launcher_px, radius_ratio=0.18).save(
            os.path.join(out_dir, "ic_launcher.png"), "PNG"
        )
        # ic_launcher_round.png (circular)
        make_circle_icon(master_icon_1024, launcher_px).save(
            os.path.join(out_dir, "ic_launcher_round.png"), "PNG"
        )
        # ic_launcher_foreground.png (108dp adaptive icon foreground with safe zone)
        master_icon_1024.resize((fg_px, fg_px), Image.Resampling.LANCZOS).convert("RGBA").save(
            os.path.join(out_dir, "ic_launcher_foreground.png"), "PNG"
        )

    # Update android/app/src/main/res/values/ic_launcher_background.xml to #262272
    bg_xml_path = os.path.join(ROOT_DIR, "android/app/src/main/res/values/ic_launcher_background.xml")
    with open(bg_xml_path, "w", encoding="utf-8") as f:
        f.write('<?xml version="1.0" encoding="utf-8"?>\n<resources>\n    <color name="ic_launcher_background">#262272</color>\n</resources>\n')

    # Android Splash Screens
    android_splashes = {
        "drawable": (480, 320),
        "drawable-land-mdpi": (480, 320),
        "drawable-land-hdpi": (800, 480),
        "drawable-land-xhdpi": (1280, 720),
        "drawable-land-xxhdpi": (1600, 960),
        "drawable-land-xxxhdpi": (1920, 1280),
        "drawable-port-mdpi": (320, 480),
        "drawable-port-hdpi": (480, 800),
        "drawable-port-xhdpi": (720, 1280),
        "drawable-port-xxhdpi": (960, 1600),
        "drawable-port-xxxhdpi": (1280, 1920),
    }
    for folder, (sw, sh) in android_splashes.items():
        s_dir = os.path.join(ROOT_DIR, "android/app/src/main/res", folder)
        os.makedirs(s_dir, exist_ok=True)
        create_splash_screen(master_icon_1024, sw, sh).save(os.path.join(s_dir, "splash.png"), "PNG")

    # 3. iOS App Icons & Splash Screens
    print("Generating iOS AppIcon.appiconset & Splash.imageset...")
    ios_icon_dir = os.path.join(ROOT_DIR, "ios/App/App/Assets.xcassets/AppIcon.appiconset")
    os.makedirs(ios_icon_dir, exist_ok=True)

    ios_icon_specs = [
        ("AppIcon-20x20@1x.png", "ipad", "20x20", "1x", 20),
        ("AppIcon-20x20@2x.png", "iphone", "20x20", "2x", 40),
        ("AppIcon-20x20@2x-ipad.png", "ipad", "20x20", "2x", 40),
        ("AppIcon-20x20@3x.png", "iphone", "20x20", "3x", 60),
        ("AppIcon-29x29@1x.png", "ipad", "29x29", "1x", 29),
        ("AppIcon-29x29@2x.png", "iphone", "29x29", "2x", 58),
        ("AppIcon-29x29@2x-ipad.png", "ipad", "29x29", "2x", 58),
        ("AppIcon-29x29@3x.png", "iphone", "29x29", "3x", 87),
        ("AppIcon-40x40@1x.png", "ipad", "40x40", "1x", 40),
        ("AppIcon-40x40@2x.png", "iphone", "40x40", "2x", 80),
        ("AppIcon-40x40@2x-ipad.png", "ipad", "40x40", "2x", 80),
        ("AppIcon-40x40@3x.png", "iphone", "40x40", "3x", 120),
        ("AppIcon-60x60@2x.png", "iphone", "60x60", "2x", 120),
        ("AppIcon-60x60@3x.png", "iphone", "60x60", "3x", 180),
        ("AppIcon-76x76@1x.png", "ipad", "76x76", "1x", 76),
        ("AppIcon-76x76@2x.png", "ipad", "76x76", "2x", 152),
        ("AppIcon-83.5x83.5@2x.png", "ipad", "83.5x83.5", "2x", 167),
        ("AppIcon-512@2x.png", "ios-marketing", "1024x1024", "1x", 1024),
    ]

    contents_images = []
    for filename, idiom, size_str, scale_str, px in ios_icon_specs:
        # iOS icons must be RGB without alpha channel
        master_icon_1024.resize((px, px), Image.Resampling.LANCZOS).convert("RGB").save(
            os.path.join(ios_icon_dir, filename), "PNG"
        )
        contents_images.append({
            "filename": filename,
            "idiom": idiom,
            "scale": scale_str,
            "size": size_str,
        })

    with open(os.path.join(ios_icon_dir, "Contents.json"), "w", encoding="utf-8") as f:
        json.dump({"images": contents_images, "info": {"author": "xcode", "version": 1}}, f, indent=2)

    ios_splash_dir = os.path.join(ROOT_DIR, "ios/App/App/Assets.xcassets/Splash.imageset")
    os.makedirs(ios_splash_dir, exist_ok=True)
    ios_splash_2732 = create_splash_screen(master_icon_1024, 2732, 2732)
    for sname in ["splash-2732x2732.png", "splash-2732x2732-1.png", "splash-2732x2732-2.png"]:
        ios_splash_2732.save(os.path.join(ios_splash_dir, sname), "PNG")

    # 4. Generate Google Play Store & Apple App Store Upload Artifacts
    print("Generating Google Play Store & Apple App Store listing graphics and screenshots...")
    play_dir = os.path.join(ROOT_DIR, "store-artifacts/google-play-store")
    appstore_dir = os.path.join(ROOT_DIR, "store-artifacts/apple-app-store")
    os.makedirs(play_dir, exist_ok=True)
    os.makedirs(appstore_dir, exist_ok=True)

    # Google Play Store High-Res Icon (512x512 32-bit PNG)
    master_icon_1024.resize((512, 512), Image.Resampling.LANCZOS).convert("RGBA").save(
        os.path.join(play_dir, "play-store-icon-512x512.png"), "PNG"
    )
    # Google Play Store Feature Graphic (1024x500 PNG)
    create_store_feature_graphic(master_icon_1024, 1024, 500).save(
        os.path.join(play_dir, "feature-graphic-1024x500.png"), "PNG"
    )
    # Google Play Store Screenshots (Phone 1080x1920, 7" Tablet 1200x1920, 10" Tablet 1600x2560)
    create_store_screenshot(master_icon_1024, emblem_cropped_rgba, 1080, 1920, variant=1).save(
        os.path.join(play_dir, "phone-screenshot-1-1080x1920.png"), "PNG"
    )
    create_store_screenshot(master_icon_1024, emblem_cropped_rgba, 1080, 1920, variant=2).save(
        os.path.join(play_dir, "phone-screenshot-2-1080x1920.png"), "PNG"
    )
    create_store_screenshot(master_icon_1024, emblem_cropped_rgba, 1200, 1920, variant=1).save(
        os.path.join(play_dir, "tablet-7inch-screenshot-1200x1920.png"), "PNG"
    )
    create_store_screenshot(master_icon_1024, emblem_cropped_rgba, 1600, 2560, variant=2).save(
        os.path.join(play_dir, "tablet-10inch-screenshot-1600x2560.png"), "PNG"
    )

    # Apple App Store Icon (1024x1024 RGB PNG without alpha)
    master_icon_1024.convert("RGB").save(
        os.path.join(appstore_dir, "app-store-icon-1024x1024.png"), "PNG"
    )
    # Apple App Store Screenshots:
    # iPhone 6.7" (1290x2796), iPhone 6.5" (1242x2688), iPad Pro 12.9" (2048x2732)
    create_store_screenshot(master_icon_1024, emblem_cropped_rgba, 1290, 2796, variant=1).save(
        os.path.join(appstore_dir, "iphone-6.7-inch-screenshot-1-1290x2796.png"), "PNG"
    )
    create_store_screenshot(master_icon_1024, emblem_cropped_rgba, 1290, 2796, variant=2).save(
        os.path.join(appstore_dir, "iphone-6.7-inch-screenshot-2-1290x2796.png"), "PNG"
    )
    create_store_screenshot(master_icon_1024, emblem_cropped_rgba, 1242, 2688, variant=1).save(
        os.path.join(appstore_dir, "iphone-6.5-inch-screenshot-1242x2688.png"), "PNG"
    )
    create_store_screenshot(master_icon_1024, emblem_cropped_rgba, 2048, 2732, variant=1).save(
        os.path.join(appstore_dir, "ipad-pro-12.9-inch-screenshot-2048x2732.png"), "PNG"
    )

    print("All icons, favicons, splash screens, watermarks, and store graphics generated successfully!")


if __name__ == "__main__":
    main()

