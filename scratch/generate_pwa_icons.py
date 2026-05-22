import os
from PIL import Image, ImageDraw

def create_pwa_icon(size, is_maskable=False):
    # Create image canvas
    img = Image.new("RGBA", (512, 512), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    
    # 1. Background styling
    if is_maskable:
        # Maskable icons must have solid background extending to edges
        draw.rectangle([0, 0, 512, 512], fill=(10, 12, 16, 255)) # #0a0c10
        # Draw a beautiful dark card in the safe area
        draw.rounded_rectangle([32, 32, 480, 480], radius=80, fill=(14, 17, 24, 255), outline=(139, 92, 246, 255), width=8)
    else:
        # Standard icon is a beautiful rounded squircle with transparent padding
        draw.rounded_rectangle([16, 16, 496, 496], radius=90, fill=(14, 17, 24, 255), outline=(139, 92, 246, 255), width=10)
        
    # Scale factor for drawing the main logo
    # For maskable, we scale down slightly to ensure it sits perfectly in the safe zone
    scale = 0.85 if is_maskable else 1.0
    
    # Coordinates of isometric package (centered around 256, 230)
    cx, cy = 256, 230
    
    # Standard isometric box vectors
    # Top face
    top_face = [
        (cx, cy - int(90 * scale)),           # Top vertex
        (cx + int(140 * scale), cy - int(20 * scale)),  # Right vertex
        (cx, cy + int(50 * scale)),           # Bottom vertex
        (cx - int(140 * scale), cy - int(20 * scale))   # Left vertex
    ]
    
    # Left face
    left_face = [
        (cx - int(140 * scale), cy - int(20 * scale)),
        (cx, cy + int(50 * scale)),
        (cx, cy + int(190 * scale)),
        (cx - int(140 * scale), cy + int(120 * scale))
    ]
    
    # Right face
    right_face = [
        (cx, cy + int(50 * scale)),
        (cx + int(140 * scale), cy - int(20 * scale)),
        (cx + int(140 * scale), cy + int(120 * scale)),
        (cx, cy + int(190 * scale))
    ]
    
    # Fill faces with sleek purple shades matching our color scheme
    draw.polygon(top_face, fill=(167, 139, 250, 255))     # Light violet #a78bfa
    draw.polygon(left_face, fill=(109, 40, 217, 255))     # Dark violet #6d28d9
    draw.polygon(right_face, fill=(124, 58, 237, 255))    # Violet #7c3aed
    
    # Highlight lines on the box edges
    draw.line([top_face[0], top_face[1]], fill=(192, 132, 252, 255), width=3) # Bright violet
    draw.line([top_face[0], top_face[3]], fill=(192, 132, 252, 255), width=3)
    draw.line([top_face[2], top_face[1]], fill=(192, 132, 252, 255), width=3)
    draw.line([top_face[2], top_face[3]], fill=(192, 132, 252, 255), width=3)
    draw.line([left_face[1], left_face[2]], fill=(192, 132, 252, 255), width=3)
    draw.line([left_face[3], left_face[0]], fill=(192, 132, 252, 255), width=3)
    draw.line([right_face[2], right_face[1]], fill=(192, 132, 252, 255), width=3)
    
    # Tape/Strap on the package (gives it the distinct package look)
    # We draw a sleek black or translucent dark stripe down the center of top face and front faces
    stripe_w = int(24 * scale)
    # Top face stripe
    draw.polygon([
        (cx - int(12 * scale), cy - int(84 * scale)),
        (cx + int(12 * scale), cy - int(72 * scale)),
        (cx + int(12 * scale), cy + int(38 * scale)),
        (cx - int(12 * scale), cy + int(26 * scale))
    ], fill=(40, 40, 40, 200))
    
    # Left front face stripe
    draw.polygon([
        (cx - int(12 * scale), cy + int(26 * scale)),
        (cx, cy + int(32 * scale)),
        (cx, cy + int(172 * scale)),
        (cx - int(12 * scale), cy + int(166 * scale))
    ], fill=(40, 40, 40, 200))
    
    # Magnifying glass representing "search" (overlapping on the right side)
    # Center of magnifying glass ring
    mx = cx + int(60 * scale)
    my = cy + int(80 * scale)
    mr = int(45 * scale) # Radius
    
    # Outer ring
    draw.ellipse([mx - mr, my - mr, mx + mr, my + mr], outline=(217, 70, 239, 255), width=int(12 * scale)) # Magenta #d946ef
    # Lens highlight
    draw.ellipse([mx - mr + int(6*scale), my - mr + int(6*scale), mx + mr - int(6*scale), my + mr - int(6*scale)], fill=(217, 70, 239, 40))
    # Handle
    hx1 = mx + int(30 * scale)
    hy1 = my + int(30 * scale)
    hx2 = mx + int(85 * scale)
    hy2 = my + int(85 * scale)
    draw.line([hx1, hy1, hx2, hy2], fill=(217, 70, 239, 255), width=int(14 * scale))
    # Handle rounded end cap
    draw.ellipse([hx2 - int(7*scale), hy2 - int(7*scale), hx2 + int(7*scale), hy2 + int(7*scale)], fill=(217, 70, 239, 255))
    
    # Resize to requested output size
    resized_img = img.resize((size, size), Image.Resampling.LANCZOS)
    return resized_img

def main():
    icons_dir = "../static/icons"
    os.makedirs(icons_dir, exist_ok=True)
    
    # Standard icons
    print("Genererar standardikoner...")
    icon_192 = create_pwa_icon(192, is_maskable=False)
    icon_192.save(os.path.join(icons_dir, "icon-192.png"), "PNG")
    
    icon_512 = create_pwa_icon(512, is_maskable=False)
    icon_512.save(os.path.join(icons_dir, "icon-512.png"), "PNG")
    
    # Maskable icons (needed for Android splash / adaptive launcher icons)
    print("Genererar maskable-ikoner...")
    maskable_192 = create_pwa_icon(192, is_maskable=True)
    maskable_192.save(os.path.join(icons_dir, "icon-192-maskable.png"), "PNG")
    
    maskable_512 = create_pwa_icon(512, is_maskable=True)
    maskable_512.save(os.path.join(icons_dir, "icon-512-maskable.png"), "PNG")
    
    print("Generering klar! Alla ikoner sparade i static/icons/.")

if __name__ == "__main__":
    main()
