#!/usr/bin/env python3
"""
Image Download Script for Universal Scales
Downloads images for each item in the YAML data files automatically.
Images are named based on dimension and item name (e.g., length_Planck_Length.jpg)
"""

import os
import json
import time
from urllib.parse import urlparse, unquote
from pathlib import Path
import re
import urllib.request
import urllib.error

# Simple YAML parser for basic YAML files
def parse_yaml_simple(file_path):
    """Simple YAML parser that handles basic YAML structure."""
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # This is a very basic parser - for production use, install PyYAML
    data = {}
    lines = content.split('\n')
    
    current_section = None
    items = []
    current_item = None
    
    for line in lines:
        line = line.strip()
        if not line or line.startswith('#'):
            continue
            
        if line.startswith('dimension:'):
            data['dimension'] = line.split(':', 1)[1].strip().strip('"\'')
        elif line.startswith('items:'):
            current_section = 'items'
        elif current_section == 'items' and line.startswith('- description:'):
            # Start of new item
            if current_item:
                items.append(current_item)
            current_item = {'description': line.split(':', 1)[1].strip().strip('"\'')}
        elif current_section == 'items' and line.startswith('name:'):
            # Add name to current item
            if current_item:
                current_item['name'] = line.split(':', 1)[1].strip().strip('"\'')
        elif current_section == 'items' and line.startswith('source:'):
            # Add source to current item
            if current_item:
                current_item['source'] = line.split(':', 1)[1].strip().strip('"\'')
        elif current_section == 'items' and line.startswith('value:'):
            # Add value to current item
            if current_item:
                current_item['value'] = line.split(':', 1)[1].strip().strip('"\'')
    
    # Add the last item if it exists
    if current_item:
        items.append(current_item)
    
    data['items'] = items
    return data

class ImageDownloader:
    def __init__(self, data_dir="data", images_dir="images"):
        # Get the project root (parent of scripts directory)
        script_dir = Path(__file__).parent
        project_root = script_dir.parent
        
        # Make paths relative to project root
        self.data_dir = project_root / data_dir
        self.images_dir = project_root / images_dir
        
        # Create images directory if it doesn't exist
        self.images_dir.mkdir(exist_ok=True)
    
    def get_wikipedia_image_url(self, wikipedia_url):
        """Extract Wikipedia page title and try to get the main image URL."""
        try:
            # Extract page title from Wikipedia URL
            parsed_url = urlparse(wikipedia_url)
            page_title = unquote(parsed_url.path.split('/')[-1])
            
            # Use Wikipedia API to get page info
            api_url = "https://en.wikipedia.org/api/rest_v1/page/summary/" + page_title
            
            req = urllib.request.Request(api_url)
            req.add_header('User-Agent', 'Universal Scales Image Downloader (educational project)')
            
            with urllib.request.urlopen(req, timeout=10) as response:
                if response.status == 200:
                    data = json.loads(response.read().decode())
                    if 'thumbnail' in data and 'source' in data['thumbnail']:
                        return data['thumbnail']['source']
            
            return None
            
        except Exception as e:
            print(f"Error getting Wikipedia image for {wikipedia_url}: {e}")
            return None
    
    def search_unsplash_image(self, query):
        """Search for images on Unsplash (free stock photos)."""
        try:
            # URL encode the query
            from urllib.parse import quote
            encoded_query = quote(query)
            search_url = f"https://unsplash.com/napi/search/photos?query={encoded_query}&per_page=1"
            
            req = urllib.request.Request(search_url)
            req.add_header('User-Agent', 'Universal Scales Image Downloader (educational project)')
            
            with urllib.request.urlopen(req, timeout=10) as response:
                if response.status == 200:
                    data = json.loads(response.read().decode())
                    if 'results' in data and len(data['results']) > 0:
                        result = data['results'][0]
                        if 'urls' in result and 'small' in result['urls']:
                            return result['urls']['small']
            
            return None
            
        except Exception as e:
            print(f"Error searching Unsplash for {query}: {e}")
            return None
    
    def generate_placeholder_image(self, filename, text):
        """Generate a simple placeholder image using a placeholder service."""
        try:
            # Use a different placeholder service that's more reliable
            from urllib.parse import quote
            encoded_text = quote(text)
            placeholder_url = f"https://dummyimage.com/400x300/cccccc/666666&text={encoded_text}"
            return placeholder_url
        except Exception as e:
            print(f"Error generating placeholder for {text}: {e}")
            return None
    
    def download_image(self, url, filename):
        """Download an image from URL and save it to the images directory."""
        try:
            req = urllib.request.Request(url)
            req.add_header('User-Agent', 'Universal Scales Image Downloader (educational project)')
            
            with urllib.request.urlopen(req, timeout=30) as response:
                if response.status == 200:
                    filepath = self.images_dir / filename
                    with open(filepath, 'wb') as f:
                        f.write(response.read())
                    
                    print(f"Downloaded: {filename}")
                    return True
            
            return False
            
        except Exception as e:
            print(f"Error downloading {url}: {e}")
            return False
    
    def sanitize_filename(self, dimension, name):
        """Convert dimension and item name to a safe filename."""
        # Remove special characters and replace spaces with underscores
        safe_dimension = re.sub(r'[^\w\s-]', '', dimension)
        safe_dimension = re.sub(r'[-\s]+', '_', safe_dimension)
        
        safe_name = re.sub(r'[^\w\s-]', '', name)
        safe_name = re.sub(r'[-\s]+', '_', safe_name)
        
        return f"{safe_dimension.lower()}_{safe_name.lower()}.jpg"
    
    def find_missing_images(self, yaml_file):
        """Find all images that are missing for items in a YAML file."""
        print(f"\nChecking missing images in {yaml_file.name}...")
        
        data = parse_yaml_simple(yaml_file)
        
        if 'items' not in data or 'dimension' not in data:
            print(f"No items or dimension found in {yaml_file.name}")
            return []
        
        dimension = data['dimension']
        missing_images = []
        
        for item in data['items']:
            item_name = item['name']
            filename = self.sanitize_filename(dimension, item_name)
            image_path = self.images_dir / filename
            
            if not image_path.exists():
                missing_images.append({
                    'name': item_name,
                    'filename': filename,
                    'dimension': dimension,
                    'source': item.get('source', '')
                })
        
        print(f"Found {len(missing_images)} missing images for {dimension}")
        return missing_images
    
    def process_yaml_file(self, yaml_file):
        """Process a single YAML file and download images for its items."""
        print(f"\nProcessing {yaml_file.name}...")
        
        data = parse_yaml_simple(yaml_file)
        
        if 'items' not in data or 'dimension' not in data:
            print(f"No items or dimension found in {yaml_file.name}")
            return 0, 0
        
        dimension = data['dimension']
        downloaded_count = 0
        skipped_count = 0
        
        for item in data['items']:
            item_name = item['name']
            
            # Create filename based on dimension and item name
            filename = self.sanitize_filename(dimension, item_name)
            image_path = self.images_dir / filename
            
            # Skip if image already exists
            if image_path.exists():
                print(f"Image already exists for {dimension}/{item_name}: {filename}")
                skipped_count += 1
                continue
            
            # Try multiple approaches to find an image
            image_url = None
            
            # 1. Try Wikipedia first
            if 'source' in item and 'wikipedia.org' in item['source']:
                image_url = self.get_wikipedia_image_url(item['source'])
            
            # 2. If no Wikipedia image, try Unsplash search
            if not image_url:
                search_query = f"{item_name} {dimension}"
                image_url = self.search_unsplash_image(search_query)
            
            # 3. If still no image, generate a placeholder
            if not image_url:
                image_url = self.generate_placeholder_image(filename, item_name)
            
            if image_url:
                # Download the image
                if self.download_image(image_url, filename):
                    downloaded_count += 1
                    time.sleep(1)  # Be respectful to servers
                else:
                    print(f"Failed to download image for {dimension}/{item_name}")
            else:
                print(f"No image found for {dimension}/{item_name}")
        
        print(f"Summary for {dimension}: {downloaded_count} downloaded, {skipped_count} already existed")
        return downloaded_count, skipped_count
    
    def run(self):
        """Main function to process all YAML files."""
        print("Starting automatic image download process...")
        print("Images will be named as: dimension_item_name.jpg")
        
        # Find all YAML files in the data directory
        yaml_files = list(self.data_dir.glob("*.yaml"))
        
        if not yaml_files:
            print(f"No YAML files found in {self.data_dir}")
            return
        
        print(f"Found {len(yaml_files)} YAML files to process")
        
        total_downloaded = 0
        total_skipped = 0
        
        # First, show missing images summary
        print("\n" + "="*50)
        print("MISSING IMAGES SUMMARY")
        print("="*50)
        
        all_missing = []
        for yaml_file in yaml_files:
            missing = self.find_missing_images(yaml_file)
            all_missing.extend(missing)
        
        if all_missing:
            print(f"\nTotal missing images: {len(all_missing)}")
            for missing in all_missing:
                print(f"  - {missing['dimension']}/{missing['name']} -> {missing['filename']}")
        else:
            print("\nAll images are present!")
        
        print("\n" + "="*50)
        print("DOWNLOADING MISSING IMAGES")
        print("="*50)
        
        for yaml_file in yaml_files:
            downloaded, skipped = self.process_yaml_file(yaml_file)
            total_downloaded += downloaded
            total_skipped += skipped
        
        print(f"\nImage download process completed!")
        print(f"Total images downloaded: {total_downloaded}")
        print(f"Total images already existed: {total_skipped}")

def main():
    downloader = ImageDownloader()
    downloader.run()

if __name__ == "__main__":
    main()