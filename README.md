# Universal Scales

An interactive logarithmic visualization of the universe's dimensions, from quantum to cosmic scales.

## Features

- **Interactive Logarithmic Plots**: Visualize items across 12 different dimensions on logarithmic scales
- **Multiple Dimensions**: Length, Duration, Speed, Acceleration, Jerk, Brightness, Force, Energy, Costs, Pressure, Young's Modulus, Yield Strength
- **Unit Conversion**: Switch between different units (meters/feet, seconds/minutes, etc.)
- **Live Currency Conversion**: Real-time exchange rates for cost comparisons
- **Band System**: Hover over bands to see detailed sub-scales
- **Dark Mode**: Toggle between light and dark themes
- **Responsive Design**: Works on desktop and mobile devices
- **URL Management**: Shareable links for specific dimensions

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

## Data Structure

Each dimension is defined in a YAML file with:
- Base unit and conversion factors
- Bands (groupings of related items)
- Items with values, descriptions, and source links

## Usage

1. Select a dimension from the dropdown
2. Choose your preferred unit
3. Hover over items for descriptions and source links
4. Hover over bands for detailed sub-scales
5. Click items to open source links in new tabs
6. Toggle dark mode with the moon/sun button

## Technical Details

- **Frontend**: Vanilla HTML, CSS, JavaScript
- **Visualization**: D3.js for interactive plots
- **Data**: YAML files parsed with js-yaml
- **Currency API**: exchangerate-api.com for live rates
- **Deployment**: GitHub Pages compatible

## File Structure

```
/
├── index.html          # Main HTML file
├── styles.css          # CSS styling with dark mode
├── script.js           # Main JavaScript application
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
└── README.md           # This file
```

## Contributing

To add new items or dimensions:
1. Edit the appropriate YAML file in the `data/` directory
2. Follow the existing structure with bands and items
3. Include accurate values, descriptions, and source links
4. Test the visualization in the browser

## License

This project is open source and available under the MIT License.
