# [Universe Scales](https://ethannguyenuser.github.io/universe-scales/)

An interactive logarithmic visualization of the universe's dimensions, from quantum to cosmic scales.

## Features

- **Interactive Logarithmic Plots**: Visualize items across 16 different dimensions on logarithmic scales
- **Multiple Dimensions**: Length, Duration, Speed, Acceleration, Jerk, Brightness, Force, Energy, Costs, Pressure, Young's Modulus, Yield Strength
- **Pan & Zoom**: Drag to pan horizontally, scroll to zoom in/out, double-click to reset zoom
- **Item Editor**: Visual editor to add, edit, and delete items with image upload support
- **YAML Import/Export**: Import and export YAML files for easy data management
- **Unit Conversion**: Switch between different units (meters/feet, seconds/minutes, etc.)
- **Number Notation Toggle**: Switch between scientific notation (1e10) and standard notation
- **Dark Mode**: Toggle between light and dark themes
- **Background Music**: Optional ambient background music
- **Responsive Design**: Works on desktop and mobile devices
- **URL Management**: Shareable links for specific dimensions
- **Canonical Dataset Pipeline**: Build a normalized SQLite corpus and derive the site YAML from it

## Dimensions Covered

1. **Length**: From Planck length to observable universe
2. **Duration**: From Planck time to age of universe
3. **Speed**: From continental drift to speed of light
4. **Acceleration**: From geological processes to black hole gravity
5. **Jerk**: Rate of change of acceleration
6. **Brightness**: From deep space to gamma ray bursts
7. **Force**: From molecular forces to black hole gravity
8. **Energy**: From photon energy to cosmic events
9. **Costs**: From grain of rice to global GDP
10. **Pressure**: From vacuum to black hole pressure
11. **Young's Modulus**: Material stiffness from rubber to neutron stars
12. **Yield Strength**: Material strength from foam to cosmic extremes
13. **Mass**: From electrons to the observable universe
14. **Area**: From particle cross-sections to cosmic boundaries
15. **Volume**: From molecules to cosmological structures
16. **Density**: From intergalactic gas to neutron star matter

## Data Structure

Each dimension is defined in a YAML file with:
- Base unit and conversion factors
- Bands (groupings of related items)
- Items with values, descriptions, and source links

## Usage

1. Select a dimension from the dropdown
2. Choose your preferred unit
3. **Navigate the plot**: Drag to pan horizontally, scroll to zoom in/out, double-click to reset zoom
4. Hover over items for descriptions and source links
5. Hover over bands for detailed sub-scales
6. Click items to open source links in new tabs
7. **Edit items**: Click "Edit Items" to open the visual editor where you can add, edit, or delete items
8. **Import/Export**: Use the editor to import YAML files or export your customizations
9. Toggle number notation with the 1e10 button
10. Toggle dark mode with the moon/sun button
11. Toggle background music with the music button

## Technical Details

- **Frontend**: Vanilla HTML, CSS, JavaScript
- **Visualization**: D3.js for interactive plots
- **Data**: YAML files parsed with js-yaml
- **Currency API**: exchangerate-api.com for live rates
- **Deployment**: GitHub Pages compatible

## Canonical Dataset

The project now includes a normalized SQLite-backed data pipeline for the flagship dimensions `length`, `mass`, `area`, `volume`, `density`, and `duration`.

- Build the dataset: `./venv/bin/python scripts/dataset/build_dataset.py`
- Verify the generated artifacts: `./venv/bin/python scripts/dataset/verify_dataset.py`
- Query the dataset: `./venv/bin/python scripts/query_dataset.py between mass 1e-9 1e9 --selected-only`

See [DATASET_PIPELINE.md](/Users/ethan/Documents/GitHub/universe-scales/DATASET_PIPELINE.md) for the source model, output artifacts, and contributor workflow.

## File Structure

```
/
├── index.html          # Main HTML file
├── css/
│   ├── styles.css      # Main CSS styling with dark mode
│   └── mobile.css      # Mobile-specific styles
├── js/
│   ├── constants.js    # Configuration constants
│   ├── script.js       # Main JavaScript application
│   ├── plot.js         # D3.js plot rendering and zoom/pan handling
│   ├── editor.js       # Item editor functionality
│   ├── formatting.js   # Number formatting utilities
│   └── mobile.js       # Mobile-specific functionality
├── data/               # YAML data files
│   ├── length.yaml
│   ├── duration.yaml
│   ├── speed.yaml
│   ├── acceleration.yaml
│   ├── jerk.yaml
│   ├── brightness.yaml
│   ├── force.yaml
│   ├── energy.yaml
│   ├── costs.yaml
│   ├── pressure.yaml
│   ├── youngs-modulus.yaml
│   └── yield-strength.yaml
├── scripts/            # Python utility scripts
│   ├── download_images.py    # Automatic image downloader
│   ├── sort_yaml_items.py    # YAML item sorter
│   └── generate_thumbnails.py # Generate optimized thumbnails for bandwidth savings
├── images/             # Item images
│   └── thumbs/         # Optimized thumbnail versions (generated)
└── README.md           # This file
```

## Contributing

To add new items or dimensions:

**Using the Visual Editor (Recommended):**
1. Open the "Edit Items" panel in the browser
2. Click "+ Add Item" to create a new item
3. Fill in the item details (name, value, description, source)
4. Upload an image if desired
5. Click "Save All Changes" to persist your edits
6. Export YAML to save your changes to a file

**Using YAML Files:**
1. Edit the appropriate YAML file in the `data/` directory
2. Follow the existing structure with bands and items
3. Include accurate values, descriptions, and source links
4. Use `scripts/sort_yaml_items.py` to automatically sort items by value
5. Test the visualization in the browser

**Utility Scripts:**
- `scripts/download_images.py`: Automatically downloads images for items from Wikipedia and Unsplash
- `scripts/sort_yaml_items.py`: Sorts YAML file items by their value field
- `scripts/generate_thumbnails.py`: Generates optimized thumbnail versions of images to reduce bandwidth usage (see SCALABILITY_ANALYSIS.md)
- `scripts/suppress_broken_pipe.py`: HTTP server wrapper that suppresses harmless BrokenPipeError exceptions for cleaner logs

## Performance & Scalability

The site uses optimized thumbnails by default to reduce bandwidth usage:
- Thumbnails load automatically (faster, lower bandwidth)
- Click thumbnails to view full-resolution images
- See `SCALABILITY_ANALYSIS.md` for detailed scalability analysis and optimization strategies

## License

This project is open source and available under the MIT License.
