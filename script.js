// Universal Scales - Main JavaScript Application
// Constants are imported from constants.js

class UniversalScales {
    constructor() {
        this.currentDimension = 'length';
        this.currentUnit = null;
        this.dimensionData = null;
        this.exchangeRates = null;
        
        // D3.js setup
        this.margin = CONFIG.MARGIN;
        this.width = 0;
        this.height = 0;
        this.svg = null;
        this.xScale = null;
        this.yScale = null;
        this.originalXDomain = null; // Store original domain for zoom reset
        this.zoomBehavior = null;
        this.isUpdatingTransform = false; // Flag to prevent recursive zoom updates
        this.lastTickSet = null; // Store last tick set for stability
        this.lastTickDomain = null; // Store domain when ticks were last calculated
        this.lastTickLogRange = null; // Store log range for zoom level tracking
        
        // DOM elements
        this.dimensionSelect = document.getElementById('dimension-select');
        this.unitSelect = document.getElementById('unit-select');
        this.darkModeToggle = document.getElementById('dark-mode-toggle');
        this.musicToggle = document.getElementById('music-toggle');
        this.backgroundMusic = document.getElementById('background-music');
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
        
        // Initialize music
        this.initMusic();
        
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
        this.dimensionSelect.addEventListener('change', async (e) => {
            this.currentDimension = e.target.value;
            await this.loadDimension(this.currentDimension);
            this.updateURL();
        });
        
        this.unitSelect.addEventListener('change', (e) => {
            this.currentUnit = e.target.value;
            this.updateUnitDescription();
            this.updateURL();
            // Reset tick cache when unit changes
            this.lastTickSet = null;
            this.lastTickDomain = null;
            this.lastTickLogRange = null;
            this.updatePlot();
        });
        
        this.darkModeToggle.addEventListener('click', () => {
            this.toggleDarkMode();
        });
        
        this.musicToggle.addEventListener('click', () => {
            this.toggleMusic();
        });
        
        // Hide tooltips when clicking elsewhere
        document.addEventListener('click', (e) => {
            if (!e.target.closest('.plot-item') && !e.target.closest('.label-hover-area')) {
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
    
    toggleMusic() {
        if (this.backgroundMusic.paused) {
            this.backgroundMusic.play().catch(e => {
                console.log('Audio play failed:', e);
                // Some browsers require user interaction before playing audio
            });
            this.musicToggle.classList.add('playing');
            this.musicToggle.textContent = '🔊';
        } else {
            this.backgroundMusic.pause();
            this.musicToggle.classList.remove('playing');
            this.musicToggle.textContent = '🎵';
        }
    }
    
    initMusic() {
        // Set initial button state to not playing (since autoplay is blocked)
        this.musicToggle.classList.remove('playing');
        this.musicToggle.textContent = '🎵';
        
        // Try to play immediately - this will likely fail due to browser restrictions
        this.backgroundMusic.play().catch(e => {
            console.log('Autoplay blocked by browser:', e);
            // This is expected - we'll wait for user interaction
        });
        
        // Add click listener to any element to enable audio
        this.enableAudioOnInteraction();
    }
    
    enableAudioOnInteraction() {
        const enableAudio = () => {
            // Only try to play if not already playing
            if (this.backgroundMusic.paused) {
                this.backgroundMusic.play().then(() => {
                    this.musicToggle.classList.add('playing');
                    this.musicToggle.textContent = '🔊';
                }).catch(e => {
                    console.log('Play failed:', e);
                });
            }
            // Remove listeners after first successful interaction
            document.removeEventListener('click', enableAudio);
            document.removeEventListener('keydown', enableAudio);
            document.removeEventListener('touchstart', enableAudio);
        };
        
        // Listen for any user interaction
        document.addEventListener('click', enableAudio);
        document.addEventListener('keydown', enableAudio);
        document.addEventListener('touchstart', enableAudio);
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
            
            // Reset zoom when dimension changes
            this.resetZoom();
            
            // Reset tick cache when dimension changes
            this.lastTickSet = null;
            this.lastTickDomain = null;
            this.lastTickLogRange = null;
            
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
            .attr('height', this.height + this.margin.top + this.margin.bottom)
            .style('overflow', 'visible'); // Allow labels to extend beyond SVG bounds
        
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
            .attr('transform', `translate(0,${this.height})`)
            .style('pointer-events', 'none'); // Don't block zoom events
        
        this.xAxisTop = this.mainGroup.append('g')
            .attr('class', 'axis')
            .attr('transform', `translate(0,0)`)
            .style('pointer-events', 'none'); // Don't block zoom events
        
        this.yAxis = this.mainGroup.append('g')
            .attr('class', 'axis')
            .style('pointer-events', 'none'); // Don't block zoom events
        
        // Add grid lines
        this.gridGroup = this.mainGroup.append('g')
            .attr('class', 'grid')
            .style('pointer-events', 'none'); // Don't block zoom events
        
        // Set up zoom behavior (horizontal only)
        // Apply zoom to the main group itself - it will receive events in empty areas
        // Items on top will still receive their own events
        this.setupZoom();
    }
    
    setupZoom() {
        // Store actual item extent (without the 0.1 multiplier) for zoom limits
        this.actualItemExtent = null;
        
        // Create a background rectangle for visual feedback and event capture
        // This will be added to the main group but kept behind everything
        this.zoomBackground = this.mainGroup.insert('rect', ':first-child')
            .attr('class', 'zoom-background')
            .attr('x', 0)
            .attr('y', 0)
            .attr('width', this.width)
            .attr('height', this.height)
            .attr('fill', 'transparent')
            .attr('cursor', 'grab')
            .style('pointer-events', 'all');
        
        // Create zoom behavior that only affects x-axis
        this.zoomBehavior = d3.zoom()
            .scaleExtent([CONFIG.ZOOM_SCALE_MIN, CONFIG.ZOOM_SCALE_MAX]) // Will be constrained further in handleZoom
            .translateExtent([[0, -Infinity], [this.width, Infinity]]) // Allow panning horizontally
            .filter((event) => {
                // Allow wheel events (zooming) anywhere
                if (event.type === 'wheel') return true;
                // For drag events, only allow on background (not on items)
                if (event.type === 'mousedown' || event.type === 'touchstart') {
                    const target = event.target;
                    // Check if clicking on an interactive element
                    if (target.classList && (
                        target.classList.contains('plot-item') || 
                        target.classList.contains('label-hover-area') || 
                        target.classList.contains('tap-target') ||
                        target.classList.contains('item-label')
                    )) {
                        return false;
                    }
                    // Check parent elements
                    let current = target;
                    for (let i = 0; i < 5 && current; i++) {
                        if (current.classList && (
                            current.classList.contains('item-group') || 
                            current.classList.contains('label-group')
                        )) {
                            return false;
                        }
                        current = current.parentNode;
                    }
                }
                return true;
            })
            .on('start', () => {
                // Change cursor when dragging starts
                if (this.zoomBackground) {
                    this.zoomBackground.attr('cursor', 'grabbing');
                }
            })
            .on('end', () => {
                // Change cursor back when dragging ends
                if (this.zoomBackground) {
                    this.zoomBackground.attr('cursor', 'grab');
                }
            })
            .on('zoom', (event) => {
                this.handleZoom(event);
            });
        
        // Apply zoom to the main group - it will receive events
        // Items on top will still receive their own pointer events
        this.mainGroup.call(this.zoomBehavior);
        
        // Add double-click to reset zoom (only on background)
        this.mainGroup.on('dblclick', (event) => {
            // Only reset if not clicking on an item
            const target = event.target;
            let isInteractive = false;
            
            if (target.classList && (
                target.classList.contains('plot-item') || 
                target.classList.contains('label-hover-area') || 
                target.classList.contains('tap-target')
            )) {
                isInteractive = true;
            }
            
            if (!isInteractive) {
                let current = target;
                for (let i = 0; i < 5 && current; i++) {
                    if (current.classList && (
                        current.classList.contains('item-group') || 
                        current.classList.contains('label-group')
                    )) {
                        isInteractive = true;
                        break;
                    }
                    current = current.parentNode;
                }
            }
            
            if (!isInteractive) {
                this.resetZoom();
            }
        });
    }
    
    handleZoom(event) {
        // Skip if we're in the middle of updating the transform to avoid recursion
        if (this.isUpdatingTransform) {
            return;
        }
        
        // Get the transform from the zoom event
        const transform = event.transform;
        
        // Apply transform to xScale domain only (horizontal zoom/pan)
        // For log scales, we need to work in log space
        if (this.originalXDomain && this.actualItemExtent) {
            const [originalMin, originalMax] = this.originalXDomain;
            const [actualMin, actualMax] = this.actualItemExtent;
            
            // Convert to log space for calculations
            const logOriginalMin = Math.log10(originalMin);
            const logOriginalMax = Math.log10(originalMax);
            const logOriginalRange = logOriginalMax - logOriginalMin;
            
            const logActualMin = Math.log10(actualMin);
            const logActualMax = Math.log10(actualMax);
            
            // For log scales: transform.x represents pixel translation
            // We need to convert this to a log-space translation
            // The current visible range in log space determines the translation
            const currentVisibleLogRange = logOriginalRange / transform.k;
            
            // Calculate pan offset: transform.x is pixels, convert to log units
            // Negative because dragging right should move the view left (show higher values)
            const logPan = -(transform.x / this.width) * currentVisibleLogRange;
            
            // Calculate new log domain based on original domain
            let newLogMin = logOriginalMin + logPan;
            let newLogMax = newLogMin + currentVisibleLogRange;
            let constrained = false;
            
            // Constrain to actual item extent (can't zoom out beyond items)
            // First, check if we're trying to zoom out too far
            if (currentVisibleLogRange > (logActualMax - logActualMin)) {
                // Zoomed out to max - show full item range
                newLogMin = logActualMin;
                newLogMax = logActualMax;
                constrained = true;
            } else {
                // TEMPORARILY REMOVED: Constrain panning to keep items visible
                // Only constrain the minimum (left edge) to debug upper limit issue
                
                // Check if we're trying to go below the minimum (left edge)
                if (newLogMin < logActualMin) {
                    newLogMin = logActualMin;
                    newLogMax = newLogMin + currentVisibleLogRange;
                    constrained = true;
                }
                // REMOVED: Maximum constraint to test if there's another limit
                // Allow panning beyond logActualMax to see if there's another constraint
            }
            
            // Convert back to linear space
            const newMin = Math.pow(10, newLogMin);
            const newMax = Math.pow(10, newLogMax);
            
            // Update xScale domain
            this.xScale.domain([newMin, newMax]);
            
            // If we constrained the domain, we need to decide whether to update the transform
            // Only update the transform when zoomed out (to prevent "stored" zoom)
            // When zoomed in at boundaries, don't update transform to allow further panning
            if (constrained) {
                const constrainedLogRange = newLogMax - newLogMin;
                const isZoomedOut = currentVisibleLogRange >= (logActualMax - logActualMin);
                
                // Always update transform to match constrained domain
                // This ensures the transform and domain stay in sync
                const constrainedK = logOriginalRange / constrainedLogRange;
                const constrainedLogPan = newLogMin - logOriginalMin;
                // Use constrainedLogRange to match the constrained domain
                const constrainedX = -(constrainedLogPan / constrainedLogRange) * this.width;
                
                const constrainedTransform = d3.zoomIdentity
                    .translate(constrainedX, 0)
                    .scale(constrainedK);
                
                if (!this.isUpdatingTransform) {
                    this.isUpdatingTransform = true;
                    this.mainGroup.call(this.zoomBehavior.transform, constrainedTransform);
                    this.isUpdatingTransform = false;
                }
            }
            
            // Update the plot
            this.updatePlotAfterZoom();
        }
    }
    
    resetZoom() {
        if (this.originalXDomain && this.zoomBehavior) {
            // Reset xScale to original domain
            this.xScale.domain(this.originalXDomain);
            
            // Reset zoom transform
            this.mainGroup.transition()
                .duration(CONFIG.RESET_ZOOM_TRANSITION_DURATION)
                .call(this.zoomBehavior.transform, d3.zoomIdentity);
            
            // Update the plot
            this.updatePlotAfterZoom();
        }
    }
    
    updatePlotAfterZoom() {
        // Generate ticks that are only powers of 10 (1eX format) for even spacing
        const tickValues = this.generatePowerOfTenTicks();

        this.xAxis.call(
            d3.axisBottom(this.xScale)
                .tickValues(tickValues)
                .tickFormat(d => d3.format(CONFIG.AXIS_FORMAT)(d))
        );
        
        this.xAxisTop.call(
            d3.axisTop(this.xScale)
                .tickValues(tickValues)
                .tickFormat(d => d3.format(CONFIG.AXIS_FORMAT)(d))
        );
        
        // Update grid
        this.updateGrid();
        
        // Update vertical lines and item positions
        const allItems = this.getAllItems();
        const positionedItems = this.positionItems(allItems);
        this.calculateHorizontalOffsets(positionedItems);
        
        // Update item positions based on new scale
        this.mainGroup.selectAll('.item-group')
            .data(positionedItems)
            .attr('transform', d => {
                const x = this.xScale(d.convertedValue);
                const y = this.height - d.yPosition;
                return `translate(${x},${y})`;
            });
        
        // Update vertical lines
        this.mainGroup.selectAll('.vertical-line')
            .data(positionedItems)
            .attr('x1', d => this.xScale(d.convertedValue))
            .attr('x2', d => this.xScale(d.convertedValue))
            .attr('stroke-opacity', d => {
                const xPos = this.xScale(d.convertedValue);
                return xPos >= 0 ? CONFIG.VERTICAL_LINE_OPACITY : 0; // Hide if past left edge
            });
        
        // Update label positions - labels should follow their points
        // The label x position is relative to the item-group transform, so it automatically follows
        // We just need to ensure it uses the correct offset
        this.mainGroup.selectAll('.item-label')
            .attr('x', CONFIG.LABEL_OFFSET_X);
    }
    
    generatePowerOfTenTicks() {
        // Get the current domain
        const [min, max] = this.xScale.domain();
        
        // Convert to log space to find the power-of-10 range
        const logMin = Math.log10(min);
        const logMax = Math.log10(max);
        const logRange = logMax - logMin;
        
        // Check if we should reuse the last tick set (hysteresis to prevent flickering)
        if (this.lastTickSet && this.lastTickDomain && this.lastTickLogRange !== null) {
            const [lastMin, lastMax] = this.lastTickDomain;
            const lastLogMin = Math.log10(lastMin);
            const lastLogMax = Math.log10(lastMax);
            const lastLogRange = lastLogMax - lastLogMin;
            
            // Check if a new power of 10 has entered/exited the visible range
            const currentMinPower = Math.floor(logMin);
            const currentMaxPower = Math.ceil(logMax);
            const lastMinPower = Math.floor(lastLogMin);
            const lastMaxPower = Math.ceil(lastLogMax);
            
            const minPowerChanged = currentMinPower !== lastMinPower;
            const maxPowerChanged = currentMaxPower !== lastMaxPower;
            
            // Check if zoom level has changed significantly
            const zoomLevelChanged = Math.abs(logRange - lastLogRange) / Math.max(logRange, lastLogRange) > CONFIG.TICK_ZOOM_LEVEL_CHANGE_THRESHOLD;
            
            // Check if domain has shifted significantly
            const domainShifted = Math.abs(logMin - lastLogMin) / logRange > CONFIG.TICK_DOMAIN_SHIFT_THRESHOLD || 
                                 Math.abs(logMax - lastLogMax) / logRange > CONFIG.TICK_DOMAIN_SHIFT_THRESHOLD;
            
            // Only update ticks if:
            // 1. A new power of 10 entered/exited the range, OR
            // 2. Zoom level changed significantly, OR
            // 3. Domain shifted significantly
            if (!minPowerChanged && !maxPowerChanged && !zoomLevelChanged && !domainShifted) {
                // Reuse last tick set, but filter to only show ticks in current domain
                const filteredTicks = this.lastTickSet.filter(tick => tick >= min && tick <= max);
                // Only reuse if we still have at least minimum ticks
                if (filteredTicks.length >= CONFIG.TICK_MIN_COUNT) {
                    return filteredTicks;
                }
            }
        }
        
        // Calculate the range of powers of 10 we should consider
        // Use a slightly expanded range to create a buffer for stability
        const expandedLogMin = Math.floor(logMin) - CONFIG.TICK_EXPANDED_RANGE_BUFFER;
        const expandedLogMax = Math.ceil(logMax) + CONFIG.TICK_EXPANDED_RANGE_BUFFER;
        const minPower = Math.floor(expandedLogMin);
        const maxPower = Math.ceil(expandedLogMax);
        
        // Generate all powers of 10 in the expanded range
        const powerOfTenTicks = [];
        for (let power = minPower; power <= maxPower; power++) {
            const value = Math.pow(10, power);
            powerOfTenTicks.push(value);
        }
        
        // Filter to avoid too many ticks based on available width
        const minLabelSpacing = window.matchMedia(`(max-width: ${CONFIG.MOBILE_BREAKPOINT}px)`).matches 
            ? CONFIG.LABEL_SPACING_MOBILE 
            : CONFIG.LABEL_SPACING_DESKTOP;
        const maxByWidth = Math.max(CONFIG.TICK_MIN_COUNT, Math.floor(this.width / minLabelSpacing));
        const targetCount = Math.max(CONFIG.TICK_MIN_COUNT, Math.min(CONFIG.AXIS_TICKS, maxByWidth));
        
        // If we have too many ticks, intelligently skip some
        let filteredTicks = powerOfTenTicks;
        if (powerOfTenTicks.length > targetCount) {
            // Prefer showing every other tick (1e6, 1e8, 1e10) over every third (1e6, 1e9, 1e12)
            // Calculate step to get close to target count
            const step = Math.ceil(powerOfTenTicks.length / targetCount);
            filteredTicks = powerOfTenTicks.filter((_, i) => i % step === 0);
        }
        
        // Store the tick set and domain for next time
        this.lastTickSet = filteredTicks;
        this.lastTickDomain = [min, max];
        this.lastTickLogRange = logRange;
        
        // Return only ticks that are actually visible in the current domain
        return filteredTicks.filter(tick => tick >= min && tick <= max);
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
        this.mainGroup.selectAll('.vertical-lines-group').remove();
        
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
        const extent = d3.extent(values);
        
        // Store actual item extent (for zoom limits)
        this.actualItemExtent = [...extent];
        
        // Extend the lower bound to provide more space for text labels
        const extendedExtent = [extent[0] * CONFIG.EXTENT_LOWER_MULTIPLIER, extent[1] * 1e10];
        
        // Store original domain for zoom reset
        // Reset original domain when dimension/unit changes (check if domain changed significantly)
        const currentDomain = this.xScale.domain();
        if (!this.originalXDomain || 
            Math.abs(currentDomain[1] - extendedExtent[1]) / extendedExtent[1] > CONFIG.DOMAIN_CHANGE_THRESHOLD) {
            // Domain changed significantly, reset zoom
            this.originalXDomain = [...extendedExtent];
            this.xScale.domain(extendedExtent);
            // Reset zoom transform to identity
            if (this.zoomBehavior) {
                this.mainGroup.call(this.zoomBehavior.transform, d3.zoomIdentity);
            }
        } else {
            // Check if currently zoomed
            const isZoomed = Math.abs(currentDomain[0] - this.originalXDomain[0]) / this.originalXDomain[0] > CONFIG.ZOOM_DETECTION_THRESHOLD ||
                           Math.abs(currentDomain[1] - this.originalXDomain[1]) / this.originalXDomain[1] > CONFIG.ZOOM_DETECTION_THRESHOLD;
            
            if (!isZoomed) {
                // Not zoomed, use original domain
                this.xScale.domain(extendedExtent);
            }
            // If zoomed, keep current domain
        }
        
        // Position items with collision avoidance
        const positionedItems = this.positionItems(allItems);
        
        // Calculate horizontal offsets after scale domain is set
        this.calculateHorizontalOffsets(positionedItems);
        
        // Calculate dynamic SVG height based on number of items with fixed spacing
        const numItems = allItems.length;
        
        // Calculate required height for items using fixed spacing
        const itemsHeight = (numItems > 0) ? CONFIG.BOTTOM_PADDING + ((numItems - 1) * CONFIG.FIXED_VERTICAL_SPACING) + CONFIG.TOP_PADDING : CONFIG.BOTTOM_PADDING + CONFIG.TOP_PADDING;
        
        // Calculate total SVG height (items + margins)
        const requiredSvgHeight = itemsHeight + this.margin.top + this.margin.bottom;
        const svgHeight = Math.max(CONFIG.MIN_SVG_HEIGHT, requiredSvgHeight);
        
        // Update SVG height
        this.svg.attr('height', svgHeight);
        
        // Update inner plot height
        this.height = svgHeight - this.margin.top - this.margin.bottom;
        
        // Update yScale range to use the new height
        this.yScale.range([this.height, 0]);
        
        // Set yScale domain to match the itemsHeight so x-axis is at bottom
        this.yScale.domain([0, itemsHeight]);
        
        // Update zoom background rectangle height
        if (this.zoomBackground) {
            this.zoomBackground.attr('height', this.height);
        }
        
        // Update axes
        const currentUnit = this.dimensionData.units.find(u => u.name === this.currentUnit);
        
        // Position x-axis at the bottom using yScale
        this.xAxis.attr('transform', `translate(0,${this.yScale(0)})`);
        
        // Position x-axis at the top
        this.xAxisTop.attr('transform', `translate(0,${this.yScale(itemsHeight)})`);
        
        // Generate ticks that are only powers of 10 (1eX format) for even spacing
        const tickValues = this.generatePowerOfTenTicks();

        this.xAxis.call(
            d3.axisBottom(this.xScale)
                .tickValues(tickValues)
                .tickFormat(d => d3.format(CONFIG.AXIS_FORMAT)(d))
        );
        
        this.xAxisTop.call(
            d3.axisTop(this.xScale)
                .tickValues(tickValues)
                .tickFormat(d => d3.format(CONFIG.AXIS_FORMAT)(d))
        );
        
        this.yAxis.call(d3.axisLeft(this.yScale).tickFormat(() => '')); // Hide y-axis labels
        
        // Update grid
        this.updateGrid();
        
        // Draw items only (no bands for now)
        this.drawItems(positionedItems);
    }
    
    updateGrid() {
        this.gridGroup.selectAll('.grid-line').remove();
        
        // Vertical grid lines
        const xTicks = this.xScale.ticks(CONFIG.GRID_TICKS);
        this.gridGroup.selectAll('.grid-line-x')
            .data(xTicks)
            .enter().append('line')
            .attr('class', 'grid-line')
            .attr('x1', d => this.xScale(d))
            .attr('x2', d => this.xScale(d))
            .attr('y1', this.yScale(this.yScale.domain()[1])) // Top of plot
            .attr('y2', this.yScale(0)) // Bottom of plot (x-axis)
            .style('pointer-events', 'none'); // Don't block zoom events
        
        // Horizontal grid lines (simplified)
        const yTicks = this.yScale.ticks(CONFIG.GRID_TICKS);
        this.gridGroup.selectAll('.grid-line-y')
            .data(yTicks)
            .enter().append('line')
            .attr('class', 'grid-line')
            .attr('x1', 0)
            .attr('x2', this.width)
            .attr('y1', d => this.yScale(d))
            .attr('y2', d => this.yScale(d))
            .style('pointer-events', 'none'); // Don't block zoom events
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
    
    drawItems(positionedItems) {
        // Draw vertical lines first (behind everything else)
        const verticalLinesGroup = this.mainGroup.append('g')
            .attr('class', 'vertical-lines-group');
        
        verticalLinesGroup.selectAll('.vertical-line')
            .data(positionedItems)
            .enter().append('line')
            .attr('class', 'vertical-line')
            .attr('x1', d => this.xScale(d.convertedValue))
            .attr('x2', d => this.xScale(d.convertedValue))
            .attr('y1', 0) // From top axis
            .attr('y2', this.height) // To bottom axis
            .attr('stroke', CONFIG.POINT_FILL_COLOR)
            .attr('stroke-width', CONFIG.VERTICAL_LINE_STROKE_WIDTH)
            .attr('stroke-opacity', d => {
                const xPos = this.xScale(d.convertedValue);
                return xPos >= 0 ? CONFIG.VERTICAL_LINE_OPACITY : 0; // Hide if past left edge
            })
            .attr('stroke-dasharray', CONFIG.VERTICAL_LINE_DASH_ARRAY)
            .attr('pointer-events', 'none'); // Disable pointer events on line
        
        const itemGroup = this.mainGroup.selectAll('.item-group')
            .data(positionedItems)
            .enter().append('g')
            .attr('class', 'item-group')
            .attr('transform', d => {
                const x = this.xScale(d.convertedValue); // Keep points at true position
                const y = this.height - d.yPosition; // Convert from bottom-up to top-down coordinates
                return `translate(${x},${y})`;
            });
        
        // Item circles
        const circle = itemGroup.append('circle')
            .attr('class', 'plot-item')
            .attr('r', CONFIG.POINT_RADIUS)
            .attr('fill', CONFIG.POINT_FILL_COLOR)
            .attr('stroke', CONFIG.POINT_STROKE_COLOR)
            .attr('stroke-width', CONFIG.POINT_STROKE_WIDTH)
            .attr('pointer-events', 'none'); // Disable pointer events on circle

        // On touch devices, add a generous invisible tap target around each item
        if (('ontouchstart' in window) || window.matchMedia('(hover: none)').matches) {
            itemGroup.append('circle')
                .attr('class', 'tap-target')
                .attr('r', CONFIG.TAP_TARGET_RADIUS) // larger hit area for fingers
                .attr('fill', 'transparent')
                .attr('pointer-events', 'all')
                .on('pointerup', (event, d) => {
                    event.preventDefault();
                    event.stopPropagation();
                    this.showTooltip(event, d);
                });
        }
        
        // Item labels with smart positioning and invisible hover area
        const labelGroup = itemGroup.append('g')
            .attr('class', 'label-group');
        
        // Add invisible rectangle for hover/tap detection that encompasses both circle and text
        labelGroup.append('rect')
            .attr('class', 'label-hover-area')
            .attr('x', d => {
                const estimatedTextWidth = d.name.length * CONFIG.TEXT_WIDTH_ESTIMATE;
                // Position to the left of the circle, same as text
                return CONFIG.LABEL_OFFSET_X - estimatedTextWidth;
            })
            .attr('y', () => {
                // Slightly enlarge vertical hitbox on small screens
                return window.matchMedia(`(max-width: ${CONFIG.MOBILE_BREAKPOINT}px)`).matches 
                    ? (CONFIG.LABEL_OFFSET_Y + CONFIG.LABEL_OFFSET_Y_MOBILE_ADJUSTMENT) 
                    : CONFIG.LABEL_OFFSET_Y;
            }) // Start above the circle
            .attr('width', d => {
                const estimatedTextWidth = d.name.length * CONFIG.TEXT_WIDTH_ESTIMATE;
                // Total width: text width + padding + circle diameter + padding
                return estimatedTextWidth + CONFIG.LABEL_PADDING + (CONFIG.POINT_RADIUS * 2) + CONFIG.LABEL_CIRCLE_PADDING;
            })
            .attr('height', () => {
                return window.matchMedia(`(max-width: ${CONFIG.MOBILE_BREAKPOINT}px)`).matches 
                    ? Math.max(CONFIG.LABEL_HEIGHT_MOBILE_MIN, CONFIG.LABEL_HEIGHT) 
                    : CONFIG.LABEL_HEIGHT;
            }) // Height to encompass circle and text
            .attr('fill', 'transparent')
            .attr('cursor', 'pointer')
            .on('pointerenter', (event, d) => {
                if (window.matchMedia('(hover: hover)').matches) {
                    this.showTooltip(event, d);
                    const itemGroupElement = event.target.closest('.item-group');
                    if (itemGroupElement) {
                        d3.select(itemGroupElement).select('circle')
                            .transition()
                            .duration(CONFIG.HOVER_TRANSITION_DURATION)
                            .attr('r', CONFIG.POINT_RADIUS_HOVER)
                            .attr('stroke-width', CONFIG.POINT_STROKE_WIDTH_HOVER);
                    }
                }
            })
            .on('pointerleave', (event) => {
                if (window.matchMedia('(hover: hover)').matches) {
                    this.hideTooltip();
                    const itemGroupElement = event.target.closest('.item-group');
                    if (itemGroupElement) {
                        d3.select(itemGroupElement).select('circle')
                            .transition()
                            .duration(CONFIG.HOVER_TRANSITION_DURATION)
                            .attr('r', CONFIG.POINT_RADIUS)
                            .attr('stroke-width', CONFIG.POINT_STROKE_WIDTH);
                    }
                }
            })
            .on('pointerup', (event, d) => {
                const isTouchPrimary = window.matchMedia('(hover: none)').matches;
                if (isTouchPrimary) {
                    event.preventDefault();
                    event.stopPropagation();
                    this.showTooltip(event, d);
                } else {
                    window.open(d.source, '_blank');
                }
            });
        
        // Add the actual text with smart positioning
        labelGroup.append('text')
            .attr('class', 'item-label')
            .attr('x', CONFIG.LABEL_OFFSET_X) // Keep text at consistent distance from point
            .attr('dy', 0)
            .attr('font-size', CONFIG.LABEL_FONT_SIZE)
            .attr('fill', 'currentColor')
            .attr('text-anchor', 'end') // Right-align text since it's to the left of the point
            .attr('dominant-baseline', 'central')
            .attr('pointer-events', 'none')
            .text(d => d.name);
    }
    
    positionItems(items) {
        // Sort items by value (smallest to largest)
        const sortedItems = [...items].sort((a, b) => a.convertedValue - b.convertedValue);
        
        // Use fixed vertical spacing for consistent visual appearance
        const positionedItems = [];
        
        sortedItems.forEach((item, index) => {
            // Calculate absolute pixel position from bottom
            const yPosition = CONFIG.BOTTOM_PADDING + (index * CONFIG.FIXED_VERTICAL_SPACING);
            
            positionedItems.push({
                ...item,
                yPosition: yPosition,
                xOffset: 0 // Will be calculated later after scale domain is set
            });
        });
        
        return positionedItems;
    }
    
    calculateHorizontalOffsets(positionedItems) {
        // Add horizontal buffer for points near the left edge to prevent text overflow
        positionedItems.forEach(item => {
            const xPosition = this.xScale(item.convertedValue);
            const estimatedTextWidth = item.name.length * CONFIG.TEXT_WIDTH_ESTIMATE;
            const minXPosition = estimatedTextWidth + CONFIG.TEXT_BUFFER;
            
            // Only apply offset if the point would cause text overflow
            // Use a more conservative approach - don't double the buffer for lowest point
            if (xPosition < minXPosition) {
                item.xOffset = minXPosition - xPosition;
            }
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
            this.checkImageExists(imagePath).then(fullImagePath => {
                if (fullImagePath) {
                    tooltipImage.src = fullImagePath;
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
        const formattedValue = d3.format(CONFIG.VALUE_FORMAT)(convertedValue);
        const unitSymbol = unit ? unit.symbol : '';
        this.tooltip.querySelector('.tooltip-value').textContent = `${formattedValue} ${unitSymbol}`;
        
        this.tooltip.querySelector('.tooltip-description').textContent = item.description;
        const sourceLink = this.tooltip.querySelector('.tooltip-source');
        const showSourceText = (event && (event.pointerType === 'touch' || event.pointerType === 'pen'))
            || ('ontouchstart' in window)
            || window.matchMedia('(hover: none)').matches;
        if (item.source) {
            sourceLink.href = item.source;
            sourceLink.textContent = showSourceText ? 'Source' : '';
            sourceLink.style.display = showSourceText ? 'inline' : 'none';
        } else {
            sourceLink.removeAttribute('href');
            sourceLink.textContent = '';
            sourceLink.style.display = 'none';
        }
        
        // Position tooltip
        const isTouchPrimary = (event && (event.pointerType === 'touch' || event.pointerType === 'pen'))
            || ('ontouchstart' in window)
            || window.matchMedia('(hover: none)').matches;
        if (isTouchPrimary) {
            // Pin tooltip to viewport top center on mobile via CSS class
            this.tooltip.classList.add('mobile-pinned');
            // Clear any previous desktop inline positioning that could push it off-screen
            this.tooltip.style.left = '';
            this.tooltip.style.top = '';
            this.tooltip.style.transform = '';
            this.tooltip.style.position = '';
        } else {
            const rect = this.plotContainer.getBoundingClientRect();
            const x = event.clientX - rect.left;
            const y = event.clientY - rect.top;
            
            // Dynamically cap tooltip width to available plot width
            const maxAllowed = Math.max(CONFIG.TOOLTIP_MIN_WIDTH, rect.width - 2 * CONFIG.TOOLTIP_OFFSET_X);
            this.tooltip.style.maxWidth = `${Math.min(CONFIG.TOOLTIP_MAX_WIDTH, maxAllowed)}px`;
            
            // Temporarily make tooltip visible to measure its dimensions
            this.tooltip.style.visibility = 'hidden';
            this.tooltip.style.display = 'block';
            const tooltipWidth = this.tooltip.offsetWidth;
            const tooltipHeight = this.tooltip.offsetHeight;
            this.tooltip.style.visibility = '';
            
            // Prefer right of cursor; fallback left if not enough space
            const spaceOnRight = rect.width - x;
            let desiredLeft;
            if (spaceOnRight < tooltipWidth + CONFIG.TOOLTIP_OFFSET_X * 2) {
                desiredLeft = x - tooltipWidth - CONFIG.TOOLTIP_OFFSET_X;
            } else {
                desiredLeft = x + CONFIG.TOOLTIP_OFFSET_X;
            }
            
            // Clamp horizontally inside plot container
            const minLeft = CONFIG.TOOLTIP_OFFSET_X;
            const maxLeft = rect.width - tooltipWidth - CONFIG.TOOLTIP_OFFSET_X;
            const clampedLeft = Math.max(minLeft, Math.min(maxLeft, desiredLeft));
            this.tooltip.style.left = `${clampedLeft}px`;
            
            // Position tooltip near the cursor's Y position and clamp vertically
            const tooltipTop = y - (tooltipHeight / 2);
            const minTop = CONFIG.TOOLTIP_MIN_TOP;
            const maxTop = rect.height - tooltipHeight - CONFIG.TOOLTIP_OFFSET_Y;
            this.tooltip.style.top = `${Math.max(minTop, Math.min(maxTop, tooltipTop))}px`;
            
            this.tooltip.style.position = 'absolute';
            this.tooltip.style.transform = '';
            this.tooltip.style.pointerEvents = 'none';
        }
        
        this.tooltip.classList.add('visible');
    }
    
    hideTooltip() {
        this.tooltip.classList.remove('visible');
        // Reset mobile-specific class
        this.tooltip.classList.remove('mobile-pinned');
    }
    
    getImagePath(itemName) {
        // Convert item name to filename format: dimension_item_name.jpg or .png
        // First sanitize the dimension name (convert hyphens to underscores)
        const sanitizedDimension = this.currentDimension
            .replace(/[^\w\s-]/g, '')  // Remove special characters
            .replace(/[-\s]+/g, '_')    // Replace spaces and dashes with underscores
            .toLowerCase();
        
        // Then sanitize the item name
        const sanitizedName = itemName
            .replace(/[^\w\s-]/g, '')  // Remove special characters
            .replace(/[-\s]+/g, '_')    // Replace spaces and dashes with underscores
            .toLowerCase();
        
        // Try both JPG and PNG extensions
        const baseFilename = `${sanitizedDimension}_${sanitizedName}`;
        return `images/${baseFilename}`;
    }
    
    async checkImageExists(imagePath) {
        try {
            // Try JPG first
            const jpgResponse = await fetch(`${imagePath}.jpg`, { method: 'HEAD' });
            if (jpgResponse.ok) {
                return `${imagePath}.jpg`;
            }
            
            // Try PNG if JPG doesn't exist
            const pngResponse = await fetch(`${imagePath}.png`, { method: 'HEAD' });
            if (pngResponse.ok) {
                return `${imagePath}.png`;
            }
            
            return null; // Neither exists
        } catch (error) {
            return null;
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
        
        const convertedValue = value * unit.conversion_factor;
        
        // Debug: Log conversion for specific items
        if (value < CONFIG.DEBUG_SMALL_VALUE_THRESHOLD) { // Very small values that might be atomic/molecular forces
            console.log('Converting small value:', {
                originalValue: value,
                convertedValue: convertedValue,
                conversionFactor: unit.conversion_factor,
                unit: unit.name
            });
        }
        
        return convertedValue;
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
        
        // Update zoom background rectangle size
        if (this.zoomBackground) {
            this.zoomBackground
                .attr('width', this.width)
                .attr('height', this.height);
        }
        
        // Update zoom behavior translate extent for new width
        if (this.zoomBehavior) {
            this.zoomBehavior.translateExtent([[0, -Infinity], [this.width, Infinity]]);
        }
        
        this.updatePlot();
    }
    
    updatePlotColors() {
        // Update colors based on current theme
        const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
        const colors = isDark ? CONFIG.COLORS.DARK : CONFIG.COLORS.LIGHT;
        const textColor = colors.TEXT;
        const axisColor = colors.AXIS;
        const strokeColor = colors.STROKE;
        const lineColor = colors.LINE;
        
        this.svg.selectAll('.axis text')
            .attr('fill', axisColor);
        
        this.svg.selectAll('.item-label')
            .attr('fill', textColor);
        
        // Update point stroke color
        this.svg.selectAll('.plot-item')
            .attr('stroke', strokeColor);
        
        // Update vertical line color
        this.svg.selectAll('.vertical-line')
            .attr('stroke', lineColor);
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
    window.app = new UniversalScales();
});