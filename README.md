# [Universe Scales](https://ethannguyenuser.github.io/universe-scales/)

An interactive visualization of the universe's dimensions, from quantum to cosmic scales.

## Features

- **Interactive Plots**: Visualize items across many dimensions on logarithmic or linear scales, depending on the quantity
- **Dimension Browser**: Expand a grouped selector with search instead of using a long dropdown
- **Multiple Dimensions**: Length, Duration, Mass, Area, Volume, Density, Current, Temperature, Counts, Brightness, and many more
- **Pan & Zoom**: Drag to pan horizontally, scroll to zoom in/out, double-click to reset zoom
- **Item Editor**: Visual editor to add, edit, and delete items with image upload support
- **YAML Import/Export**: Import and export YAML files for easy data management
- **Canonical Dataset Pipeline**: Build a normalized SQLite corpus and derive the site YAML from it
- **Content Overrides**: Store longer museum-style descriptions and structured source notes separately from the core values
- **Unit Conversion**: Switch between different units (meters/feet, seconds/minutes, etc.)
- **Number Notation Toggle**: Switch between scientific notation (1e10) and standard notation
- **Dark Mode**: Toggle between light and dark themes
- **Background Music**: Optional ambient background music
- **Responsive Design**: Works on desktop and mobile devices
- **URL Management**: Shareable links for specific dimensions and units

## Dimensions Covered

1. **Fundamental scales**: Length, duration, mass, electric current, temperature, counts, luminous intensity
2. **Geometry and scale**: Area, volume
3. **Motion and mechanics**: Speed, acceleration, jerk, force, torque, moment of inertia, angle, angular velocity
4. **Fields and waves**: Brightness, frequency, charge, magnetic field, loudness, sound frequency
5. **Materials and matter**: Pressure, density, viscosity, flow rate, surface tension, salinity, concentration, hardness, strain, thermal conductivity, specific heat
6. **Information and computation**: Information, information rate, FLOPs
7. **Senses and perception**: Scoville heat, odor concentration, roughness, coefficient of friction, visual angle
8. **Global and geography**: Population density, physiological density, agricultural density
9. **Abstract and social**: Costs, historical time, counts, counts per unit time, probability, precision and accuracy, correlation coefficient, effect size, utility, QALYs, micromorts, absorbed dose, disease rarity, cell count, attention

## Data Structure

The project now has two data layers:

- **Canonical dataset** in `dataset/` and `exports/`, where subjects, observations, sources, units, and content overrides are normalized in SQLite and JSON.
- **Frontend payloads** in `exports/frontend/` and `data/`, where the browser reads generated YAML bundles for each dimension.

The site still consumes YAML, but YAML is no longer the source of truth for the pipeline-managed dimensions.

## Usage

1. Click the dimension selector to open the grouped browser, then browse or search for a dimension
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

The project includes a normalized SQLite-backed data pipeline that generates the frontend YAML bundles and supporting JSON exports.

- Build the dataset: `./venv/bin/python scripts/dataset/build_dataset.py`
- Verify the generated artifacts: `./venv/bin/python scripts/dataset/verify_dataset.py`
- Query the dataset: `./venv/bin/python scripts/query_dataset.py between mass 1e-9 1e9 --selected-only`

See [DATASET_PIPELINE.md](DATASET_PIPELINE.md) for the source model, output artifacts, and contributor workflow.

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
├── data/               # Generated frontend YAML files
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
├── dataset/            # Canonical raw inputs and SQLite artifacts
├── exports/            # Generated JSON, YAML, and SQLite exports
├── scripts/            # Python utility scripts
│   ├── download_images.py     # Automatic image downloader
│   ├── generate_thumbnails.py # Generate optimized thumbnails for bandwidth savings
│   └── sort_yaml_items.py     # YAML item sorter
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

**Using the canonical dataset pipeline:**
1. Add or revise structured facts in `dataset/raw/curated/<dimension>.json`
2. Add or revise narrative overrides in `dataset/raw/content/<dimension>.json`
3. Update dimension metadata in `dataset/raw/config/`
4. Rebuild with `./venv/bin/python scripts/dataset/build_dataset.py`
5. Verify with `./venv/bin/python scripts/dataset/verify_dataset.py`
6. Review the generated artifacts in `exports/` and `data/`

**Using YAML Files directly:**
1. Edit a generated YAML file only for quick frontend-only experiments
2. Expect pipeline rebuilds to overwrite managed dimensions
3. Prefer putting durable changes back into `dataset/raw/`

**Utility Scripts:**
- `scripts/download_images.py`: Automatically downloads images for items from public sources
- `scripts/sort_yaml_items.py`: Sorts YAML file items by their value field
- `scripts/generate_thumbnails.py`: Generates optimized thumbnail versions of images to reduce bandwidth usage (see SCALABILITY_ANALYSIS.md)
- `scripts/suppress_broken_pipe.py`: HTTP server wrapper that suppresses harmless BrokenPipeError exceptions for cleaner logs

## Performance & Scalability

The site uses optimized thumbnails by default to reduce bandwidth usage:
- Thumbnails load automatically for faster browsing
- Click thumbnails to view full-resolution images
- See `SCALABILITY_ANALYSIS.md` for detailed scalability analysis and optimization strategies

## License

This project is open source and available under the MIT License.
