#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""生成 Head up 莫兰迪风格图标：鼠尾草绿圆角底 + 白色 H"""
from PIL import Image, ImageDraw, ImageFont
import os

BG = '#65735a'      # 深鼠尾草绿，白字对比度足够
FG = '#ffffff'
SIZES = [192, 512]
OUT_DIR = os.path.dirname(os.path.abspath(__file__))

def make_icon(size):
    img = Image.new('RGB', (size, size), BG)
    d = ImageDraw.Draw(img)
    # 圆角矩形背景（iOS 会自动加 mask，这里也做圆角让非 iOS 平台好看）
    corner = int(size * 0.18)
    d.rounded_rectangle([0, 0, size-1, size-1], radius=corner, fill=BG)

    # 尝试加载系统无衬线字体
    font = None
    for name in ['/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf',
                 '/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf',
                 '/usr/share/fonts/truetype/noto/NotoSans-Bold.ttf',
                 '/System/Library/Fonts/Helvetica.ttc']:
        try:
            font = ImageFont.truetype(name, int(size * 0.55))
            break
        except Exception:
            pass
    if font is None:
        font = ImageFont.load_default()

    text = 'H'
    bbox = d.textbbox((0, 0), text, font=font)
    tw, th = bbox[2] - bbox[0], bbox[3] - bbox[1]
    x = (size - tw) / 2 - bbox[0]
    y = (size - th) / 2 - bbox[1] - size * 0.03  # 视觉居中微调
    d.text((x, y), text, font=font, fill=FG)
    return img

if __name__ == '__main__':
    for s in SIZES:
        icon = make_icon(s)
        out = os.path.join(OUT_DIR, f'icon-{s}.png')
        icon.save(out, 'PNG')
        print(f'saved {out} ({s}x{s})')
