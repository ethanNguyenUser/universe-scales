#!/usr/bin/env python3
"""
Script to clean YAML files by:
1. Replacing special characters with their common versions
2. Removing OpenAI content references
"""

import re
import sys
import os

# ============================================================================
# CONFIGURATION: Set the file to clean here (relative to project root)
# ============================================================================
TARGET_FILE = 'data/acceleration.yaml'

# ============================================================================
# Character replacements
# ============================================================================
CHAR_REPLACEMENTS = {
    # Dashes
    '\u2014': '--',  # em dash
    '\u2013': '-',   # en dash
    '\u2015': '--',  # horizontal bar
    
    # Apostrophes and quotes
    '\u2018': "'",   # left single quotation mark
    '\u2019': "'",   # right single quotation mark (apostrophe)
    '\u201C': '"',   # left double quotation mark
    '\u201D': '"',   # right double quotation mark
    '\u201E': '"',   # double low-9 quotation mark
    '\u201F': '"',   # double high-reversed-9 quotation mark
    '\u2032': "'",   # prime (apostrophe-like)
    '\u2033': '"',   # double prime
    
    # Multiplication and other symbols
    '\u00D7': 'x',  # multiplication sign (×)
    '\u2212': '-',  # minus sign
    '\u2010': '-',  # hyphen
    
    # Whitespace characters
    '\u00A0': ' ',  # non-breaking space
    '\u2009': ' ',  # thin space
    '\u200A': ' ',  # hair space
    '\u202F': ' ',  # narrow no-break space
    '\u205F': ' ',  # medium mathematical space
    '\u2000': ' ',  # en quad
    '\u2001': ' ',  # em quad
    '\u2002': ' ',  # en space
    '\u2003': ' ',  # em space
    '\u2004': ' ',  # three-per-em space
    '\u2005': ' ',  # four-per-em space
    '\u2006': ' ',  # six-per-em space
    '\u2007': ' ',  # figure space
    '\u2008': ' ',  # punctuation space
    '\u200B': '',   # zero-width space (remove)
    '\u200C': '',   # zero-width non-joiner (remove)
    '\u200D': '',   # zero-width joiner (remove)
    '\uFEFF': '',   # zero-width no-break space (remove)
    
    # Other common problematic characters
    '\u2026': '...', # horizontal ellipsis
    '\u2022': '*',   # bullet
}

# ============================================================================
# Content reference pattern
# ============================================================================
CONTENT_REF_PATTERN = re.compile(r':contentReference\[oaicite:\d+\]\{index=\d+\}')


def clean_yaml_file(file_path):
    """
    Clean a YAML file by processing description and dimension_description fields.
    """
    try:
        # Read the file
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()
        
        # Create backup first (before any modifications)
        backup_path = file_path + '.backup'
        with open(backup_path, 'w', encoding='utf-8') as f:
            f.write(content)
        print(f"Backup created: {backup_path}")
        
        # First, remove all content references from the entire file
        content = CONTENT_REF_PATTERN.sub('', content)
        
        # Then replace special characters throughout the file
        for old_char, new_char in CHAR_REPLACEMENTS.items():
            content = content.replace(old_char, new_char)
        
        # Write cleaned file
        with open(file_path, 'w', encoding='utf-8') as f:
            f.write(content)
        
        print(f"Cleaned file: {file_path}")
        print("Done!")
        
    except FileNotFoundError:
        print(f"Error: File '{file_path}' not found.")
        sys.exit(1)
    except Exception as e:
        print(f"Error processing file: {e}")
        sys.exit(1)

if __name__ == '__main__':
    # Get the project root directory (parent of scripts directory)
    script_dir = os.path.dirname(os.path.abspath(__file__))
    project_root = os.path.dirname(script_dir)
    file_path = os.path.join(project_root, TARGET_FILE)
    clean_yaml_file(file_path)

