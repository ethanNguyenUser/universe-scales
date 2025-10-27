#!/usr/bin/env python3
"""
Image Download Script for Universal Scales
Downloads images for each item in the YAML data files automatically.
Images are named based on dimension and item name (e.g., length_Planck_Length.jpg)
"""

import os
import yaml
import requests
import time
from urllib.parse import urlparse, unquote
from pathlib import Path
import re

class ImageDownloader:
    def __init__(self, data_dir="data", images_dir="images"):
        self.data_dir = Path(data_dir)
        self.images_dir = Path(images_dir)
        self.session = requests.Session()
        self.session.headers.update({
            'User-Agent': 'Universal Scales Image Downloader (educational project)'
        })
        
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
            response = self.session.get(api_url, timeout=10)
            
            if response.status_code == 200:
                data = response.json()
                if 'thumbnail' in data and 'source' in data['thumbnail']:
                    return data['thumbnail']['source']
            
            return None
            
        except Exception as e:
            print(f"Error getting Wikipedia image for {wikipedia_url}: {e}")
            return None
    
    def download_image(self, url, filename):
        """Download an image from URL and save it to the images directory."""
        try:
            response = self.session.get(url, timeout=30)
            response.raise_for_status()
            
            filepath = self.images_dir / filename
            with open(filepath, 'wb') as f:
                f.write(response.content)
            
            print(f"Downloaded: {filename}")
            return True
            
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
    
    def process_yaml_file(self, yaml_file):
        """Process a single YAML file and download images for its items."""
        print(f"\nProcessing {yaml_file.name}...")
        
        with open(yaml_file, 'r', encoding='utf-8') as f:
            data = yaml.safe_load(f)
        
        if 'items' not in data or 'dimension' not in data:
            print(f"No items or dimension found in {yaml_file.name}")
            return
        
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
            
            # Try to get image from Wikipedia
            image_url = None
            if 'source' in item and 'wikipedia.org' in item['source']:
                image_url = self.get_wikipedia_image_url(item['source'])
            
            if image_url:
                # Download the image
                if self.download_image(image_url, filename):
                    downloaded_count += 1
                    time.sleep(1)  # Be respectful to servers
                else:
                    print(f"Failed to download image for {dimension}/{item_name}")
            else:
                print(f"No Wikipedia image found for {dimension}/{item_name}")
        
        print(f"Summary for {dimension}: {downloaded_count} downloaded, {skipped_count} already existed")
    
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
        
        for yaml_file in yaml_files:
            self.process_yaml_file(yaml_file)
        
        print(f"\nImage download process completed!")
        print(f"Total images downloaded: {total_downloaded}")
        print(f"Total images already existed: {total_skipped}")

def main():
    downloader = ImageDownloader()
    downloader.run()

if __name__ == "__main__":
    main()