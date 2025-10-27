// Universal Scales - Main JavaScript Application

class UniversalScales {
    constructor() {
        this.currentDimension = 'length';
        this.currentUnit = null;
        this.dimensionData = null;
        this.exchangeRates = null;
        
        // D3.js setup
        this.margin = { top: 40, right: 40, bottom: 60, left: 80 };
        this.width = 0;
        this.height = 0;
        this.svg = null;
        this.xScale = null;
        this.yScale = null;
        
        // DOM elements
        this.dimensionSelect = document.getElementById('dimension-select');
        this.unitSelect = document.getElementById('unit-select');
        this.darkModeToggle = document.getElementById('dark-mode-toggle');
        this.tooltip = document.getElementById('tooltip');
        this.bandPopup = document.getElementById('band-popup');
        this.plotContainer = document.getElementById('plot-container');
        this.dimensionDescription = document.getElementById('dimension-description');
        this.unitDescription = document.getElementById('unit-description');
        
        this.init();
    }
    
    async init() {
        // Set up event listeners
        this.setupEventListeners();
        
        // Initialize dark mode
        this.initDarkMode();
        
        // Set up URL management first
        this.setupURLManagement();
        
        // Initialize plot
        this.initPlot();
        
        // Load initial dimension
        await this.loadDimension(this.currentDimension);
        
        // Load exchange rates for cost dimension
        await this.loadExchangeRates();
    }
    
    setupEventListeners() {
        this.dimensionSelect.addEventListener('change', (e) => {
            this.currentDimension = e.target.value;
            this.loadDimension(this.currentDimension);
            this.updateURL();
        });
        
        this.unitSelect.addEventListener('change', (e) => {
            this.currentUnit = e.target.value;
            this.updateUnitDescription();
            this.updateURL();
            this.updatePlot();
        });
        
        this.darkModeToggle.addEventListener('click', () => {
            this.toggleDarkMode();
        });
        
        // Hide tooltips when clicking elsewhere
        document.addEventListener('click', (e) => {
            if (!e.target.closest('.plot-item')) {
                this.hideTooltip();
            }
        });
        
        // Handle window resize
        window.addEventListener('resize', () => {
            this.resizePlot();
        });
    }
    
    initDarkMode() {
        const savedTheme = localStorage.getItem('theme') || 'light';
        document.documentElement.setAttribute('data-theme', savedTheme);
        this.updateDarkModeButton(savedTheme);
    }
    
    toggleDarkMode() {
        const currentTheme = document.documentElement.getAttribute('data-theme');
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
        
        document.documentElement.setAttribute('data-theme', newTheme);
        localStorage.setItem('theme', newTheme);
        this.updateDarkModeButton(newTheme);
        
        // Update plot colors
        this.updatePlotColors();
    }
    
    updateDarkModeButton(theme) {
        this.darkModeToggle.textContent = theme === 'dark' ? '☀️' : '🌙';
    }
    
    setupURLManagement() {
        const urlParams = new URLSearchParams(window.location.search);
        const dimension = urlParams.get('dimension');
        if (dimension && this.dimensionSelect.querySelector(`option[value="${dimension}"]`)) {
            this.currentDimension = dimension;
            this.dimensionSelect.value = dimension;
        }
        
        // Store unit parameter to use after dimension loads
        const unit = urlParams.get('unit');
        if (unit) {
            this.pendingUnit = unit;
        }
    }
    
    updateURL() {
        const url = new URL(window.location);
        url.searchParams.set('dimension', this.currentDimension);
        if (this.currentUnit) {
            url.searchParams.set('unit', this.currentUnit);
        } else {
            url.searchParams.delete('unit');
        }
        window.history.pushState({}, '', url);
    }
    
    async loadDimension(dimension) {
        try {
            const response = await fetch(`data/${dimension}.yaml`);
            const yamlText = await response.text();
            this.dimensionData = jsyaml.load(yamlText);
            
            // Update dimension description
            if (this.dimensionData.dimension_description) {
                this.dimensionDescription.textContent = this.dimensionData.dimension_description;
            } else {
                this.dimensionDescription.textContent = '';
            }
            
            // Update unit selector
            this.updateUnitSelector();
            
            // Update plot
            this.updatePlot();
            
            // Update plot colors based on current theme
            this.updatePlotColors();
            
        } catch (error) {
            console.error('Error loading dimension:', error);
            this.showError(`Failed to load ${dimension} data`);
        }
    }
    
    updateUnitSelector() {
        this.unitSelect.innerHTML = '';
        
        this.dimensionData.units.forEach(unit => {
            const option = document.createElement('option');
            option.value = unit.name;
            option.textContent = `${unit.name} (${unit.symbol})`;
            this.unitSelect.appendChild(option);
        });
        
        // Set unit from URL if pending, otherwise use first unit
        if (this.pendingUnit && this.dimensionData.units.some(u => u.name === this.pendingUnit)) {
            this.currentUnit = this.pendingUnit;
            this.unitSelect.value = this.currentUnit;
            this.pendingUnit = null; // Clear pending unit
        } else {
            this.currentUnit = this.dimensionData.units[0].name;
            this.unitSelect.value = this.currentUnit;
        }
        
        // Update unit description
        this.updateUnitDescription();
    }
    
    initPlot() {
        this.updateDimensions();
        
        this.svg = d3.select('#plot-svg')
            .attr('width', this.width + this.margin.left + this.margin.right)
            .attr('height', this.height + this.margin.top + this.margin.bottom);
        
        // Create main group
        this.mainGroup = this.svg.append('g')
            .attr('transform', `translate(${this.margin.left},${this.margin.top})`);
        
        // Create scales
        this.xScale = d3.scaleLog()
            .range([0, this.width]);
        
        this.yScale = d3.scaleLinear()
            .range([this.height, 0]);
        
        // Add axes
        this.xAxis = this.mainGroup.append('g')
            .attr('class', 'axis')
            .attr('transform', `translate(0,${this.height})`);
        
        this.yAxis = this.mainGroup.append('g')
            .attr('class', 'axis');
        
        // Add grid lines
        this.gridGroup = this.mainGroup.append('g')
            .attr('class', 'grid');
    }
    
    updateDimensions() {
        const containerRect = this.plotContainer.getBoundingClientRect();
        this.width = containerRect.width - this.margin.left - this.margin.right;
        this.height = containerRect.height - this.margin.top - this.margin.bottom;
    }
    
    updatePlot() {
        if (!this.dimensionData) return;
        
        // Clear existing plot elements
        this.mainGroup.selectAll('.item-group').remove();
        
        // Get all items
        const allItems = [];
        
        if (this.dimensionData.items) {
            this.dimensionData.items.forEach(item => {
                allItems.push({
                    ...item,
                    convertedValue: this.convertValue(item.value)
                });
            });
        }
        
        // Update scales
        const values = allItems.map(item => item.convertedValue);
        this.xScale.domain(d3.extent(values));
        
        // Calculate dynamic SVG height based on number of items with fixed spacing
        const fixedVerticalSpacing = 20; // Fixed pixel spacing between items
        const numItems = allItems.length;
        const bottomPadding = 20;
        const topPadding = 20;
        
        // Calculate required height for items using fixed spacing
        const itemsHeight = (numItems > 0) ? bottomPadding + ((numItems - 1) * fixedVerticalSpacing) + topPadding : bottomPadding + topPadding;
        
        // Calculate total SVG height (items + margins)
        const requiredSvgHeight = itemsHeight + this.margin.top + this.margin.bottom;
        const minSvgHeight = 200; // Minimum height
        const svgHeight = Math.max(minSvgHeight, requiredSvgHeight);
        
        // Update SVG height
        this.svg.attr('height', svgHeight);
        
        // Update inner plot height
        this.height = svgHeight - this.margin.top - this.margin.bottom;
        
        // Update yScale range to use the new height
        this.yScale.range([this.height, 0]);
        
        // Set yScale domain to match the itemsHeight so x-axis is at bottom
        this.yScale.domain([0, itemsHeight]);
        
        // Update axes
        const currentUnit = this.dimensionData.units.find(u => u.name === this.currentUnit);
        
        // Position x-axis at the bottom using yScale
        this.xAxis.attr('transform', `translate(0,${this.yScale(0)})`);
        
        this.xAxis.call(d3.axisBottom(this.xScale).tickFormat(d => {
            return d3.format('.0e')(d); // Remove unnecessary zeros
        }));
        
        this.yAxis.call(d3.axisLeft(this.yScale).tickFormat(() => '')); // Hide y-axis labels
        
        // Update grid
        this.updateGrid();
        
        // Draw items only (no bands for now)
        this.drawItems(allItems);
    }
    
    updateGrid() {
        this.gridGroup.selectAll('.grid-line').remove();
        
        // Vertical grid lines
        const xTicks = this.xScale.ticks(10);
        this.gridGroup.selectAll('.grid-line-x')
            .data(xTicks)
            .enter().append('line')
            .attr('class', 'grid-line')
            .attr('x1', d => this.xScale(d))
            .attr('x2', d => this.xScale(d))
            .attr('y1', this.yScale(this.yScale.domain()[1])) // Top of plot
            .attr('y2', this.yScale(0)); // Bottom of plot (x-axis)
        
        // Horizontal grid lines (simplified)
        const yTicks = this.yScale.ticks(10);
        this.gridGroup.selectAll('.grid-line-y')
            .data(yTicks)
            .enter().append('line')
            .attr('class', 'grid-line')
            .attr('x1', 0)
            .attr('x2', this.width)
            .attr('y1', d => this.yScale(d))
            .attr('y2', d => this.yScale(d));
    }
    
    
    getAllItems() {
        const allItems = [];
        
        if (this.dimensionData.items) {
            this.dimensionData.items.forEach(item => {
                allItems.push({
                    ...item,
                    convertedValue: this.convertValue(item.value)
                });
            });
        }
        
        return allItems;
    }
    
    drawItems(items) {
        // Position items with collision avoidance
        const positionedItems = this.positionItems(items);
        
        const itemGroup = this.mainGroup.selectAll('.item-group')
            .data(positionedItems)
            .enter().append('g')
            .attr('class', 'item-group')
            .attr('transform', d => {
                const x = this.xScale(d.convertedValue) + (d.xOffset || 0);
                const y = this.height - d.yPosition; // Convert from bottom-up to top-down coordinates
                return `translate(${x},${y})`;
            });
        
        // Item circles
        itemGroup.append('circle')
            .attr('class', 'plot-item')
            .attr('r', 6)
            .attr('fill', '#007bff')
            .attr('stroke', '#000000')
            .attr('stroke-width', 1.5)
            .on('mouseenter', (event, d) => this.showTooltip(event, d))
            .on('mouseleave', () => this.hideTooltip())
            .on('click', (event, d) => window.open(d.source, '_blank'));
        
        // Item labels with smart positioning
        itemGroup.append('text')
            .attr('class', 'item-label')
            .attr('x', d => {
                // Position labels to the left for items on the right half of the plot
                const xPos = this.xScale(d.convertedValue);
                return xPos > this.width / 2 ? -10 : 10;
            })
            .attr('dy', 0)
            .attr('font-size', '9px')
            .attr('fill', 'currentColor')
            .attr('text-anchor', d => {
                const xPos = this.xScale(d.convertedValue);
                return xPos > this.width / 2 ? 'end' : 'start';
            })
            .attr('dominant-baseline', 'central')
            .text(d => d.name);
    }
    
    positionItems(items) {
        // Sort items by value (smallest to largest)
        const sortedItems = [...items].sort((a, b) => a.convertedValue - b.convertedValue);
        
        // Use fixed vertical spacing for consistent visual appearance
        const fixedVerticalSpacing = 20; // Same as in updatePlot
        const bottomPadding = 20; // Same as in updatePlot
        const positionedItems = [];
        
        sortedItems.forEach((item, index) => {
            // Calculate absolute pixel position from bottom
            const yPosition = bottomPadding + (index * fixedVerticalSpacing);
            
            positionedItems.push({
                ...item,
                yPosition: yPosition,
                xOffset: 0
            });
        });
        
        return positionedItems;
    }
    
    showTooltip(event, item) {
        const unit = this.dimensionData.units.find(u => u.name === this.currentUnit);
        const convertedValue = this.convertValue(item.value);
        
        this.tooltip.querySelector('.tooltip-title').textContent = item.name;
        
        // Handle image - check if image exists before displaying
        const tooltipImage = this.tooltip.querySelector('.tooltip-image');
        const imagePath = this.getImagePath(item.name);
        
        if (imagePath) {
            // Check if image exists before setting src
            this.checkImageExists(imagePath).then(exists => {
                if (exists) {
                    tooltipImage.src = imagePath;
                    tooltipImage.alt = item.name;
                    tooltipImage.style.display = 'block';
                } else {
                    tooltipImage.src = '';
                    tooltipImage.alt = '';
                    tooltipImage.style.display = 'none';
                }
            });
        } else {
            tooltipImage.src = '';
            tooltipImage.alt = '';
            tooltipImage.style.display = 'none';
        }
        
        // Format and display the exact value
        const formattedValue = d3.format('.2e')(convertedValue);
        const unitSymbol = unit ? unit.symbol : '';
        this.tooltip.querySelector('.tooltip-value').textContent = `${formattedValue} ${unitSymbol}`;
        
        this.tooltip.querySelector('.tooltip-description').textContent = item.description;
        this.tooltip.querySelector('.tooltip-source').href = item.source;
        
        // Position tooltip
        const rect = this.plotContainer.getBoundingClientRect();
        const x = event.clientX - rect.left;
        const y = event.clientY - rect.top;
        
        // Temporarily make tooltip visible to measure its width
        this.tooltip.style.visibility = 'hidden';
        this.tooltip.style.display = 'block';
        const tooltipWidth = this.tooltip.offsetWidth;
        this.tooltip.style.visibility = '';
        
        // Check if tooltip will fit on the right, otherwise position on the left
        const spaceOnRight = rect.width - x;
        
        if (spaceOnRight < tooltipWidth + 20) {
            // Position to the left of the cursor
            this.tooltip.style.left = `${x - tooltipWidth - 10}px`;
        } else {
            // Position to the right of the cursor
            this.tooltip.style.left = `${x + 10}px`;
        }
        
        this.tooltip.style.top = `${y - 10}px`;
        this.tooltip.classList.add('visible');
    }
    
    hideTooltip() {
        this.tooltip.classList.remove('visible');
    }
    
    getImagePath(itemName) {
        // Convert item name to filename format: dimension_item_name.jpg
        const sanitizedName = itemName
            .replace(/[^\w\s-]/g, '')  // Remove special characters
            .replace(/[-\s]+/g, '_')    // Replace spaces and dashes with underscores
            .toLowerCase();
        
        const filename = `${this.currentDimension}_${sanitizedName}.jpg`;
        return `images/${filename}`;
    }
    
    async checkImageExists(imagePath) {
        try {
            const response = await fetch(imagePath, { method: 'HEAD' });
            return response.ok;
        } catch (error) {
            return false;
        }
    }
    
    convertValue(value) {
        if (!this.currentUnit) return value;
        
        const unit = this.dimensionData.units.find(u => u.name === this.currentUnit);
        if (!unit) return value;
        
        // For costs, handle currency conversion
        if (this.currentDimension === 'costs' && unit.name !== 'USD') {
            // This would use exchange rates - simplified for now
            return value * unit.conversion_factor;
        }
        
        return value * unit.conversion_factor;
    }
    
    async loadExchangeRates() {
        try {
            const response = await fetch('https://api.exchangerate-api.com/v4/latest/USD');
            this.exchangeRates = await response.json();
        } catch (error) {
            console.warn('Failed to load exchange rates:', error);
        }
    }
    
    resizePlot() {
        this.updateDimensions();
        
        this.svg
            .attr('width', this.width + this.margin.left + this.margin.right);
        
        this.xScale.range([0, this.width]);
        
        this.updatePlot();
    }
    
    updatePlotColors() {
        // Update colors based on current theme
        const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
        const textColor = isDark ? '#ffffff' : '#212529';
        const axisColor = isDark ? '#adb5bd' : '#6c757d';
        const strokeColor = isDark ? '#ffffff' : '#000000';
        
        this.svg.selectAll('.axis text')
            .attr('fill', axisColor);
        
        this.svg.selectAll('.item-label')
            .attr('fill', textColor);
        
        // Update point stroke color
        this.svg.selectAll('.plot-item')
            .attr('stroke', strokeColor);
    }
    
    updateUnitDescription() {
        if (!this.currentUnit || !this.dimensionData) return;
        
        const unit = this.dimensionData.units.find(u => u.name === this.currentUnit);
        if (unit && unit.description) {
            this.unitDescription.textContent = unit.description;
        } else {
            this.unitDescription.textContent = '';
        }
    }
    
    showError(message) {
        // Simple error display - could be enhanced
        console.error(message);
        alert(message);
    }
}

// Initialize the application when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new UniversalScales();
});