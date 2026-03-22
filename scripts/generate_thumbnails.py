#!/usr/bin/env python3
"""
Generate optimized thumbnail versions of images for the Universe Scales project.
Thumbnails are optimized for web display (300px width, compressed) to reduce bandwidth usage.
"""

import os
from pathlib import Path
from PIL import Image

def generate_thumbnails(images_dir="images", thumbnails_dir="images/thumbs", max_width=300, quality=85):
    """
    Generate thumbnail versions of all images.
    
    Args:
        images_dir: Directory containing original images
        thumbnails_dir: Directory to save thumbnails
        max_width: Maximum width for thumbnails (height scales proportionally)
        quality: JPEG quality (1-100, higher = better quality but larger file)
    """
    # Get project root (parent of scripts directory)
    script_dir = Path(__file__).parent
    project_root = script_dir.parent
    
    images_path = project_root / images_dir
    thumbs_path = project_root / thumbnails_dir
    
    # Create thumbnails directory if it doesn't exist
    thumbs_path.mkdir(parents=True, exist_ok=True)
    
    # Supported image formats
    image_extensions = {'.jpg', '.jpeg', '.png', '.JPG', '.JPEG', '.PNG'}
    
    # Find all image files
    image_files = [f for f in images_path.iterdir() 
                   if f.is_file() and f.suffix in image_extensions]
    
    if not image_files:
        print(f"No images found in {images_path}")
        return
    
    print(f"Found {len(image_files)} images to process...")
    print(f"Thumbnails will be saved to {thumbs_path}")
    print(f"Thumbnail settings: max_width={max_width}px, quality={quality}\n")
    
    processed = 0
    skipped = 0
    errors = 0
    total_original_size = 0
    total_thumbnail_size = 0
    
    for image_file in image_files:
        try:
            # Skip if thumbnail already exists and is newer than original
            thumb_file = thumbs_path / image_file.name
            if thumb_file.exists():
                if thumb_file.stat().st_mtime >= image_file.stat().st_mtime:
                    print(f"✓ Skipping {image_file.name} (thumbnail up to date)")
                    skipped += 1
                    # Still count sizes for statistics
                    total_original_size += image_file.stat().st_size
                    total_thumbnail_size += thumb_file.stat().st_size
                    continue
            
            # Open and process image
            with Image.open(image_file) as img:
                # Convert to RGB if necessary (handles RGBA, P, etc.)
                if img.mode in ('RGBA', 'LA', 'P'):
                    # Create white background for transparency
                    rgb_img = Image.new('RGB', img.size, (255, 255, 255))
                    if img.mode == 'P':
                        img = img.convert('RGBA')
                    rgb_img.paste(img, mask=img.split()[-1] if img.mode in ('RGBA', 'LA') else None)
                    img = rgb_img
                elif img.mode != 'RGB':
                    img = img.convert('RGB')
                
                # Calculate new dimensions maintaining aspect ratio
                original_width, original_height = img.size
                if original_width <= max_width:
                    # Image is already small enough, just optimize it
                    new_width, new_height = original_width, original_height
                else:
                    aspect_ratio = original_height / original_width
                    new_width = max_width
                    new_height = int(max_width * aspect_ratio)
                
                # Resize image
                resized_img = img.resize((new_width, new_height), Image.Resampling.LANCZOS)
                
                # Save as optimized JPEG
                thumb_file = thumbs_path / f"{image_file.stem}.jpg"
                resized_img.save(thumb_file, 'JPEG', quality=quality, optimize=True)
                
                # Calculate size savings
                original_size = image_file.stat().st_size
                thumbnail_size = thumb_file.stat().st_size
                savings = ((original_size - thumbnail_size) / original_size) * 100
                
                total_original_size += original_size
                total_thumbnail_size += thumbnail_size
                
                print(f"✓ Processed {image_file.name}: {original_size/1024:.1f}KB → {thumbnail_size/1024:.1f}KB ({savings:.1f}% reduction)")
                processed += 1
                
        except Exception as e:
            print(f"✗ Error processing {image_file.name}: {e}")
            errors += 1
    
    print(f"\n{'='*60}")
    print(f"Processing complete!")
    print(f"  Processed: {processed}")
    print(f"  Skipped (up to date): {skipped}")
    print(f"  Errors: {errors}")
    print(f"\nSize statistics:")
    print(f"  Original total: {total_original_size/1024/1024:.2f} MB")
    print(f"  Thumbnail total: {total_thumbnail_size/1024/1024:.2f} MB")
    if total_original_size > 0:
        total_savings = ((total_original_size - total_thumbnail_size) / total_original_size) * 100
        print(f"  Total savings: {total_savings:.1f}%")
        print(f"  Bandwidth reduction: {(total_original_size - total_thumbnail_size)/1024/1024:.2f} MB per full load")

if __name__ == "__main__":
    import sys
    
    # Check if PIL/Pillow is installed
    try:
        from PIL import Image
    except ImportError:
        print("Error: PIL (Pillow) is required. Install it with:")
        print("  pip install Pillow")
        sys.exit(1)
    
    generate_thumbnails()
