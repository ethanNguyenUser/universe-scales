#!/usr/bin/env python3
"""
Script to automatically sort YAML file items by their values.
This script reads a YAML file, sorts the items by their 'value' field,
and writes the sorted result back to the file.
"""

import yaml
import sys
import argparse
from pathlib import Path


def sort_yaml_items(file_path):
    """
    Sort items in a YAML file by their 'value' field.
    
    Args:
        file_path (str): Path to the YAML file to sort
    """
    file_path = Path(file_path)
    
    if not file_path.exists():
        print(f"Error: File '{file_path}' does not exist.")
        return False
    
    try:
        # Read the YAML file
        with open(file_path, 'r', encoding='utf-8') as file:
            data = yaml.safe_load(file)
        
        if not isinstance(data, dict):
            print(f"Error: YAML file '{file_path}' does not contain a dictionary.")
            return False
        
        # Check if 'items' key exists
        if 'items' not in data:
            print(f"Error: No 'items' key found in '{file_path}'.")
            return False
        
        items = data['items']
        if not isinstance(items, list):
            print(f"Error: 'items' is not a list in '{file_path}'.")
            return False
        
        # Sort items by their 'value' field
        def get_value(item):
            """Extract the value for sorting, handling different formats."""
            if isinstance(item, dict) and 'value' in item:
                return float(item['value'])
            return 0.0
        
        sorted_items = sorted(items, key=get_value)
        
        # Update the data with sorted items
        data['items'] = sorted_items
        
        # Write the sorted data back to the file
        with open(file_path, 'w', encoding='utf-8') as file:
            yaml.dump(data, file, default_flow_style=False, sort_keys=False, 
                     allow_unicode=True, width=1000)
        
        print(f"Successfully sorted {len(sorted_items)} items in '{file_path}'")
        
        # Print a summary of the sorted order
        print("\nSorted order (first 10 items):")
        for i, item in enumerate(sorted_items[:10]):
            name = item.get('name', 'Unknown')
            value = item.get('value', 'Unknown')
            print(f"  {i+1:2d}. {name}: {value}")
        
        if len(sorted_items) > 10:
            print(f"  ... and {len(sorted_items) - 10} more items")
        
        return True
        
    except yaml.YAMLError as e:
        print(f"Error parsing YAML file '{file_path}': {e}")
        return False
    except Exception as e:
        print(f"Error processing file '{file_path}': {e}")
        return False


def main():
    """Main function to handle command line arguments and execute sorting."""
    parser = argparse.ArgumentParser(
        description="Sort YAML file items by their 'value' field",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  python sort_yaml_items.py data/duration.yaml
  python sort_yaml_items.py data/length.yaml
  python sort_yaml_items.py --backup data/duration.yaml
        """
    )
    
    parser.add_argument(
        'file_path',
        help='Path to the YAML file to sort'
    )
    
    parser.add_argument(
        '--backup',
        action='store_true',
        help='Create a backup of the original file before sorting'
    )
    
    parser.add_argument(
        '--dry-run',
        action='store_true',
        help='Show what would be sorted without making changes'
    )
    
    args = parser.parse_args()
    
    file_path = Path(args.file_path)
    
    if args.backup:
        backup_path = file_path.with_suffix(f'{file_path.suffix}.backup')
        try:
            import shutil
            shutil.copy2(file_path, backup_path)
            print(f"Created backup: {backup_path}")
        except Exception as e:
            print(f"Error creating backup: {e}")
            return 1
    
    if args.dry_run:
        # Read and show what would be sorted without writing
        try:
            with open(file_path, 'r', encoding='utf-8') as file:
                data = yaml.safe_load(file)
            
            items = data.get('items', [])
            sorted_items = sorted(items, key=lambda x: float(x.get('value', 0)))
            
            print(f"Would sort {len(sorted_items)} items in '{file_path}':")
            print("\nSorted order:")
            for i, item in enumerate(sorted_items):
                name = item.get('name', 'Unknown')
                value = item.get('value', 'Unknown')
                print(f"  {i+1:2d}. {name}: {value}")
            
        except Exception as e:
            print(f"Error in dry run: {e}")
            return 1
    else:
        # Actually sort the file
        success = sort_yaml_items(file_path)
        return 0 if success else 1


if __name__ == '__main__':
    sys.exit(main())
