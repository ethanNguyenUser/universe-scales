// Universal Scales - Main JavaScript Application
// Constants are imported from constants.js

class UniversalScales {
    constructor() {
        this.currentDimension = 'length';
        this.currentUnit = null;
        this.dimensionData = null;
        this.exchangeRates = null;
        this.notationMode = 'scientific'; // 'scientific', 'mathematical', 'human'
        
        // Initialize formatter
        this.formatter = new NumberFormatter(this.notationMode);
        
        // D3.js setup - will be initialized by plot renderer
        this.margin = CONFIG.MARGIN;
        this.width = 0;
        this.height = 0;
        this.svg = null;
        this.xScale = null;
        this.yScale = null;
        this.originalXDomain = null; // Store original domain for zoom reset
        this.zoomBehavior = null;
        this.isUpdatingTransform = false; // Flag to prevent recursive zoom updates
        this.dragStartY = null; // Track vertical drag start position for scrolling
        this.dragStartX = null; // Track horizontal drag start position
        this.isVerticalDrag = false; // Track if current drag is primarily vertical
        this.lastScrollDeltaY = null; // Track last scroll delta to prevent double-scrolling
        this.dragStartTransform = null; // Store transform at drag start to restore if vertical
        this.touchStartOnItem = null; // Track if touch started on item/label for mobile drag detection
        this.touchStartPosition = null; // Track initial touch position for drag detection
        this.enableAudioHandler = null; // Store reference to enableAudio handler for cleanup
        this.zoomUpdatePending = false; // Throttle zoom updates for performance
        this.actualItemExtent = null; // Store actual item extent (for zoom limits)
        this.mainGroup = null; // Will be set by plot renderer
        this.zoomBackground = null; // Will be set by setupZoom
        this.tooltipPinned = false; // Track if tooltip is pinned (clicked on desktop)
        
        // DOM elements
        this.dimensionSelect = document.getElementById('dimension-select');
        this.unitSelect = document.getElementById('unit-select');
        this.notationToggle = document.getElementById('notation-toggle');
        this.darkModeToggle = document.getElementById('dark-mode-toggle');
        this.musicToggle = document.getElementById('music-toggle');
        this.backgroundMusic = document.getElementById('background-music');
        this.tooltip = document.getElementById('tooltip');
        this.bandPopup = document.getElementById('band-popup');
        this.plotContainer = document.getElementById('plot-container');
        this.dimensionDescription = document.getElementById('dimension-description');
        this.unitDescription = document.getElementById('unit-description');
        
        // Custom items storage (merged with original data)
        this.customItems = {}; // key: dimension name, value: array of custom items
        
        this.init();
    }
    
    async init() {
        // Set up event listeners
        this.setupEventListeners();
        
        // Initialize dark mode
        this.initDarkMode();
        
        // Initialize music
        this.initMusic();
        
        // Initialize notation
        this.initNotation();
        
        // Initialize editor
        this.editor = new ItemEditor(this);
        
        // Initialize plot renderer
        this.plot = new PlotRenderer(this);
        
        // Set up URL management first
        this.setupURLManagement();
        
        // Initialize plot
        this.plot.initPlot();
        
        // Set up zoom after plot is initialized
        this.setupZoom();
        
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
            this.plot.lastTickSet = null;
            this.plot.lastTickDomain = null;
            this.plot.lastTickLogRange = null;
            this.plot.updatePlot();
        });
        
        this.darkModeToggle.addEventListener('click', () => {
            this.toggleDarkMode();
        });
        
        this.musicToggle.addEventListener('click', () => {
            this.toggleMusic();
        });
        
        this.notationToggle.addEventListener('click', () => {
            this.toggleNotation();
        });
        
        // Hide tooltips when clicking elsewhere (but allow clicks on tooltip itself)
        document.addEventListener('click', (e) => {
            if (!e.target.closest('.plot-item') && !e.target.closest('.label-hover-area') && !e.target.closest('.tooltip')) {
                this.hideTooltip();
            }
        });
        
        // Handle window resize with debouncing to prevent zoom reset on mobile scroll
        let resizeTimeout;
        window.addEventListener('resize', () => {
            clearTimeout(resizeTimeout);
            resizeTimeout = setTimeout(() => {
                this.plot.updateDimensions();
                this.resizePlot();
            }, CONFIG.RESIZE_DEBOUNCE_MS);
        });
    }
    
    initDarkMode() {
        const savedTheme = localStorage.getItem('theme') || 'light';
        document.documentElement.setAttribute('data-theme', savedTheme);
        this.updateDarkModeButton(savedTheme);
    }
    
    initNotation() {
        const savedMode = localStorage.getItem('notationMode') || 'scientific';
        this.notationMode = savedMode;
        this.formatter.setNotationMode(savedMode);
        
        // Update button text to show current mode
        this.updateNotationButton();
    }
    
    updateNotationButton() {
        if (this.notationMode === 'mathematical') {
            // For mathematical notation, use HTML with superscript
            this.notationToggle.innerHTML = '1×10<sup>10</sup>';
        } else {
            // For other modes, use plain text
            this.notationToggle.textContent = CONFIG.NOTATION_BUTTON_TEXTS[this.notationMode];
        }
    }
    
    toggleDarkMode() {
        const currentTheme = document.documentElement.getAttribute('data-theme');
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
        
        document.documentElement.setAttribute('data-theme', newTheme);
        localStorage.setItem('theme', newTheme);
        this.updateDarkModeButton(newTheme);
        
        // Update plot colors
        this.plot.updatePlotColors();
    }
    
    updateDarkModeButton(theme) {
        this.darkModeToggle.textContent = theme === 'dark' ? '☀️' : '🌙';
    }
    
    toggleMusic() {
        // Remove enableAudio listeners if they exist (user is explicitly toggling)
        if (this.enableAudioHandler) {
            document.removeEventListener('click', this.enableAudioHandler);
            document.removeEventListener('keydown', this.enableAudioHandler);
            document.removeEventListener('touchstart', this.enableAudioHandler);
            this.enableAudioHandler = null;
        }
        
        if (this.backgroundMusic.paused) {
            this.backgroundMusic.play().catch(e => {
                console.log('Audio play failed:', e);
                // Some browsers require user interaction before playing audio
            });
            this.musicToggle.classList.add('playing');
            this.musicToggle.textContent = '🔊';
            // Save music state to localStorage
            localStorage.setItem('musicEnabled', 'true');
        } else {
            this.backgroundMusic.pause();
            this.musicToggle.classList.remove('playing');
            this.musicToggle.textContent = '🎵';
            // Save music state to localStorage
            localStorage.setItem('musicEnabled', 'false');
        }
    }
    
    toggleNotation() {
        const modes = ['scientific', 'mathematical', 'human'];
        const currentIndex = modes.indexOf(this.notationMode);
        this.notationMode = modes[(currentIndex + 1) % modes.length];
        this.formatter.setNotationMode(this.notationMode);
        
        // Update button text to show current mode
        this.updateNotationButton();
        
        // Save to localStorage
        localStorage.setItem('notationMode', this.notationMode);
        
        // Update plot to reflect new notation
        this.plot.updatePlotAfterZoom();
    }
    
    formatNumber(value, precision = 0, forTooltip = false) {
        return this.formatter.formatNumber(value, precision, forTooltip);
    }
    
    formatMathematicalHTML(sign, mantissa, exponent) {
        return this.formatter.formatMathematicalHTML(sign, mantissa, exponent);
    }
    
    formatHumanReadable(value, precision = 2) {
        return this.formatter.formatHumanReadable(value, precision);
    }
    
    processMathematicalLabels(axis) {
        this.formatter.processMathematicalLabels(axis);
    }
    
    initMusic() {
        // Load saved music state from localStorage
        // Default to true (music on) if no saved state exists
        const savedMusicState = localStorage.getItem('musicEnabled');
        const musicWasEnabled = savedMusicState === null || savedMusicState === 'true';
        
        if (musicWasEnabled) {
            // Music should be on - set button state to "on"
            this.musicToggle.classList.add('playing');
            this.musicToggle.textContent = '🔊';
            
            // Try to play immediately - this will likely fail due to browser restrictions
            this.backgroundMusic.play().catch(e => {
                console.log('Autoplay blocked by browser:', e);
                // This is expected - we'll wait for user interaction
            });
            
            // Add click listener to any element to enable audio on first interaction
            this.enableAudioOnInteraction(true);
        } else {
            // Music was explicitly turned off - set button state to "off"
            this.musicToggle.classList.remove('playing');
            this.musicToggle.textContent = '🎵';
            // Don't try to autoplay
        }
    }
    
    enableAudioOnInteraction(shouldPlay = false) {
        const enableAudio = (event) => {
            // Don't handle clicks on the music toggle button - let toggleMusic handle it
            if (event.target === this.musicToggle || this.musicToggle.contains(event.target)) {
                return;
            }
            
            // Only try to play if music should be enabled and is not already playing
            if (shouldPlay && this.backgroundMusic.paused) {
                this.backgroundMusic.play().then(() => {
                    // Button state should already be correct, but ensure it is
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
            this.enableAudioHandler = null;
        };
        
        // Store reference for cleanup
        this.enableAudioHandler = enableAudio;
        
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
            if (this.originalXDomain && this.zoomBehavior) {
                // Reset xScale to original domain
                this.xScale.domain(this.originalXDomain);
                
                // Reset zoom transform
                this.mainGroup.transition()
                    .duration(CONFIG.RESET_ZOOM_TRANSITION_DURATION)
                    .call(this.zoomBehavior.transform, d3.zoomIdentity);
                
                // Update the plot
                this.plot.updatePlotAfterZoom();
            }
            
            // Reset tick cache when dimension changes
            this.plot.lastTickSet = null;
            this.plot.lastTickDomain = null;
            this.plot.lastTickLogRange = null;
            
            // Update dimension description (check for overrides)
            const dimensionDescOverride = this.editor?.dimensionOverrides[this.currentDimension]?.description;
            const dimensionDesc = dimensionDescOverride !== undefined 
                ? dimensionDescOverride 
                : (this.dimensionData.dimension_description || '');
            
            if (dimensionDesc) {
                this.dimensionDescription.textContent = dimensionDesc;
                this.dimensionDescription.style.display = '';
            } else {
                this.dimensionDescription.textContent = '';
                this.dimensionDescription.style.display = 'none'; // Hide when empty
            }
            
            // Update unit selector
            this.updateUnitSelector();
            
            // Update plot
            this.plot.updatePlot();
            
            // Update plot colors based on current theme
            this.plot.updatePlotColors();
            
            // Refresh editor if it's open
            if (this.editor) {
                this.editor.onDimensionChange();
            }
            
        } catch (error) {
            console.error('Error loading dimension:', error);
            this.showError(`Failed to load ${dimension} data`);
        }
    }
    
    updateUnitSelector() {
        this.unitSelect.innerHTML = '';
        
        // Filter out deleted units
        const visibleUnits = [];
        if (this.editor && this.editor.unitOverrides[this.currentDimension]) {
            this.dimensionData.units.forEach((unit, index) => {
                const isDeleted = this.editor.unitOverrides[this.currentDimension]?.[index]?.isDeleted;
                if (!isDeleted) {
                    visibleUnits.push({ unit, index });
                }
            });
        } else {
            // No overrides, all units are visible
            this.dimensionData.units.forEach((unit, index) => {
                visibleUnits.push({ unit, index });
            });
        }
        
        visibleUnits.forEach(({ unit }) => {
            const option = document.createElement('option');
            option.value = unit.name;
            // Capitalize first letter for display
            const unitNameCapitalized = unit.name.charAt(0).toUpperCase() + unit.name.slice(1).toLowerCase();
            option.textContent = `${unitNameCapitalized} (${unit.symbol})`;
            this.unitSelect.appendChild(option);
        });
        
        // Set unit from URL if pending, otherwise use first visible unit
        if (this.pendingUnit && visibleUnits.some(({ unit }) => unit.name === this.pendingUnit)) {
            this.currentUnit = this.pendingUnit;
            this.unitSelect.value = this.currentUnit;
            this.pendingUnit = null; // Clear pending unit
        } else if (visibleUnits.length > 0) {
            this.currentUnit = visibleUnits[0].unit.name;
            this.unitSelect.value = this.currentUnit;
        }
        
        // Update unit description
        this.updateUnitDescription();
    }
    
    showTooltip(event, item, pinned = false) {
        const unit = this.dimensionData.units.find(u => u.name === this.currentUnit);
        const convertedValue = this.convertValue(item.value);
        
        // Set pinned state
        this.tooltipPinned = pinned;
        
        this.tooltip.querySelector('.tooltip-title').textContent = item.name;
        
        // Handle image - check if image exists before displaying
        const tooltipImage = this.tooltip.querySelector('.tooltip-image');
        const imagePath = this.getImagePath(item.name);
        
        // Immediately hide the image and clear src to prevent showing previous image
        tooltipImage.style.display = 'none';
        tooltipImage.src = '';
        tooltipImage.alt = '';
        tooltipImage.draggable = false; // Prevent native image dragging
        
        // Format and display the exact value (use forTooltip=true to get HTML superscripts in tooltips)
        const formattedValue = this.formatNumber(convertedValue, 2, true);
        const unitSymbol = unit ? unit.symbol : '';
        const tooltipValueElement = this.tooltip.querySelector('.tooltip-value');
        if (this.notationMode === 'mathematical') {
            // Use innerHTML for mathematical notation to render superscripts
            tooltipValueElement.innerHTML = `${formattedValue} ${unitSymbol}`;
        } else {
            // Use textContent for other notations
            tooltipValueElement.textContent = `${formattedValue} ${unitSymbol}`;
        }
        
        this.tooltip.querySelector('.tooltip-description').textContent = item.description;
        const sourceLink = this.tooltip.querySelector('.tooltip-source');
        const isTouchPrimary = (event && (event.pointerType === 'touch' || event.pointerType === 'pen'))
            || ('ontouchstart' in window)
            || window.matchMedia('(hover: none)').matches;
        const showSourceText = isTouchPrimary || pinned; // Show source on mobile or when pinned on desktop
        if (item.source) {
            sourceLink.href = item.source;
            sourceLink.textContent = showSourceText ? 'Source' : '';
            sourceLink.style.display = showSourceText ? 'inline' : 'none';
        } else {
            sourceLink.removeAttribute('href');
            sourceLink.textContent = '';
            sourceLink.style.display = 'none';
        }
        
        // Position tooltip (will be repositioned after image loads if image exists)
        const positionTooltip = () => {
            if (isTouchPrimary) {
                // Pin tooltip to viewport top center on mobile via CSS class
                this.tooltip.classList.add('mobile-pinned');
                // Clear any previous desktop inline positioning that could push it off-screen
                // But explicitly set position: fixed for mobile to ensure it's positioned relative to viewport
                this.tooltip.style.left = '';
                this.tooltip.style.top = '';
                this.tooltip.style.transform = '';
                this.tooltip.style.position = 'fixed';
            } else {
                // Use viewport coordinates for robust clamping
                const clientX = event.clientX;
                const clientY = event.clientY;
                
                // Measure tooltip dimensions once (avoid multiple layout recalculations)
                // Use a single measurement by setting display and visibility together
                const wasVisible = this.tooltip.style.display === 'block';
                if (!wasVisible) {
                    this.tooltip.style.display = 'block';
                    this.tooltip.style.visibility = 'hidden';
                    this.tooltip.style.position = 'fixed';
                    this.tooltip.style.left = '-9999px';
                    this.tooltip.style.top = '-9999px';
                }
                
                // Set maxWidth to full width to measure natural size
                this.tooltip.style.maxWidth = `${CONFIG.TOOLTIP_MAX_WIDTH}px`;
                
                // Force a single layout calculation by reading dimensions
                const naturalTooltipWidth = this.tooltip.offsetWidth;
                const naturalTooltipHeight = this.tooltip.offsetHeight;
                
                // Check if tooltip would be cut off on the right when positioned to the right of cursor
                const spaceOnRight = window.innerWidth - clientX - CONFIG.TOOLTIP_OFFSET_X;
                const wouldBeCutOff = spaceOnRight < naturalTooltipWidth;
                
                // If it would be cut off, move to left of cursor (don't squish)
                // Otherwise, position to the right and potentially reduce width if needed
                let desiredLeftVp;
                let finalTooltipWidth = naturalTooltipWidth;
                let finalTooltipHeight = naturalTooltipHeight;
                
                if (wouldBeCutOff) {
                    // Position to the left of cursor
                    desiredLeftVp = clientX - naturalTooltipWidth - CONFIG.TOOLTIP_OFFSET_X;
                    // Keep full width - don't squish
                    this.tooltip.style.maxWidth = `${CONFIG.TOOLTIP_MAX_WIDTH}px`;
                } else {
                    // Position to the right of cursor
                    desiredLeftVp = clientX + CONFIG.TOOLTIP_OFFSET_X;
                    // Dynamically cap tooltip width to available space
                    const maxAllowed = Math.max(CONFIG.TOOLTIP_MIN_WIDTH, spaceOnRight);
                    const newMaxWidth = Math.min(CONFIG.TOOLTIP_MAX_WIDTH, maxAllowed);
                    this.tooltip.style.maxWidth = `${newMaxWidth}px`;
                    // Only remeasure if width actually changed
                    if (newMaxWidth < CONFIG.TOOLTIP_MAX_WIDTH) {
                        finalTooltipWidth = this.tooltip.offsetWidth;
                        finalTooltipHeight = this.tooltip.offsetHeight;
                    }
                    // Ensure it doesn't go off the right edge
                    if (desiredLeftVp + finalTooltipWidth > window.innerWidth - CONFIG.TOOLTIP_OFFSET_X) {
                        desiredLeftVp = window.innerWidth - finalTooltipWidth - CONFIG.TOOLTIP_OFFSET_X;
                    }
                }
                
                // Clamp horizontal position to ensure it doesn't go off the left edge
                const minLeftVp = CONFIG.TOOLTIP_OFFSET_X;
                desiredLeftVp = Math.max(minLeftVp, desiredLeftVp);
                
                // Default vertical position: below cursor
                let desiredTopVp = clientY + CONFIG.TOOLTIP_OFFSET_Y;
                
                // Clamp vertical position to keep tooltip within viewport
                const minTopVp = CONFIG.TOOLTIP_MIN_TOP;
                const maxTopVp = window.innerHeight - CONFIG.TOOLTIP_VIEWPORT_BOTTOM_MARGIN - finalTooltipHeight;
                desiredTopVp = Math.max(minTopVp, Math.min(maxTopVp, desiredTopVp));
                
                // Apply all styles at once to minimize layout recalculations
                this.tooltip.style.left = `${desiredLeftVp}px`;
                this.tooltip.style.top = `${desiredTopVp}px`;
                this.tooltip.style.position = 'fixed';
                this.tooltip.style.transform = '';
                // Enable pointer events when pinned so source link is clickable
                // Also increase z-index when pinned to ensure it's on top
                this.tooltip.style.pointerEvents = pinned ? 'auto' : 'none';
                this.tooltip.style.zIndex = pinned ? '2000' : '1000';
                if (!wasVisible) {
                    this.tooltip.style.visibility = '';
                }
            }
        };
        
        // Position tooltip initially
        positionTooltip();
        
        // Handle image loading - reposition tooltip after image loads to account for image height
        if (imagePath) {
            // Check if image exists before setting src
            this.checkImageExists(imagePath).then(fullImagePath => {
                if (fullImagePath) {
                    // Create a new image object to preload and only show when loaded
                    const img = new Image();
                    img.onload = () => {
                        // Only set the image if this tooltip is still showing the same item
                        // Check by comparing the current tooltip title
                        if (this.tooltip.querySelector('.tooltip-title').textContent === item.name) {
                            tooltipImage.src = fullImagePath;
                            tooltipImage.alt = item.name;
                            tooltipImage.style.display = 'block';
                            // Reposition tooltip now that image is loaded and height has changed
                            if (!isTouchPrimary) {
                                positionTooltip();
                            }
                        }
                    };
                    img.onerror = () => {
                        // Image failed to load, keep it hidden
                        tooltipImage.style.display = 'none';
                    };
                    // Start loading the image
                    img.src = fullImagePath;
                } else {
                    // Image doesn't exist, keep it hidden
                    tooltipImage.style.display = 'none';
                }
            });
        } else {
            // No image path, keep it hidden
            tooltipImage.style.display = 'none';
        }
        
        this.tooltip.classList.add('visible');
    }
    
    hideTooltip() {
        this.tooltip.classList.remove('visible');
        // Reset mobile-specific class
        this.tooltip.classList.remove('mobile-pinned');
        // Clear pinned state
        this.tooltipPinned = false;
        // Reset z-index to default
        this.tooltip.style.zIndex = '';
        // Reset pointer-events to none so tooltip doesn't block interactions when hidden
        this.tooltip.style.pointerEvents = 'none';
    }
    
    getImagePath(itemName) {
        // First check if there's a custom item with imageData
        if (this.editor) {
            const allItems = this.editor.getAllItemsForEditor();
            const item = allItems.find(i => i.name === itemName);
            
            // Check if imageData is explicitly null (image was removed)
            if (item && item.imageData === null) {
                return null;
            }
            
            if (item && item.imageData) {
                // Return the data URL directly
                return item.imageData;
            }
        }
        
        // Otherwise use the original logic
        const sanitizedDimension = this.currentDimension
            .replace(/[^\w\s-]/g, '')  // Remove special characters
            .replace(/[-\s]+/g, '_')    // Replace spaces and dashes with underscores
            .toLowerCase();
        
        const sanitizedName = itemName
            .replace(/[^\w\s-]/g, '')  // Remove special characters
            .replace(/[-\s]+/g, '_')    // Replace spaces and dashes with underscores
            .toLowerCase();
        
        const baseFilename = `${sanitizedDimension}_${sanitizedName}`;
        return `images/${baseFilename}`;
    }
    
    async checkImageExists(imagePath) {
        // Check if it's a data URL (custom uploaded image)
        if (imagePath.startsWith('data:image')) {
            return imagePath;
        }
        
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
        // Preserve current zoom state before resizing
        const currentDomain = this.xScale.domain();
        const wasZoomed = this.originalXDomain && (
            Math.abs(currentDomain[0] - this.originalXDomain[0]) / this.originalXDomain[0] > CONFIG.ZOOM_DETECTION_THRESHOLD ||
            Math.abs(currentDomain[1] - this.originalXDomain[1]) / this.originalXDomain[1] > CONFIG.ZOOM_DETECTION_THRESHOLD
        );
        
        this.plot.updateDimensions();
        
        // SVG width is now updated in updateDimensions() to match container exactly
        
        // Update xScale range with new width (domain stays the same - preserves data view)
        this.xScale.range([0, this.width]);
        
        // Update zoom behavior translate extent for new width
        if (this.zoomBehavior) {
            this.zoomBehavior.translateExtent([[0, -Infinity], [this.width, Infinity]]);
        }
        
        // Recalculate transform to match current domain with new width
        // This prevents teleportation when panning after resize
        if (wasZoomed && this.zoomBehavior) {
            const newTransform = this.calculateTransformFromDomain(currentDomain);
            if (!this.isUpdatingTransform) {
                this.isUpdatingTransform = true;
                this.mainGroup.call(this.zoomBehavior.transform, newTransform);
                this.isUpdatingTransform = false;
            }
        }
        
        // Only update plot if not zoomed, or update while preserving zoom state
        if (wasZoomed) {
            // Preserve zoom by updating plot without resetting domain
            // But we still need to update SVG height and yScale for proper item positioning
            if (this.dimensionData) {
                const allItems = this.getAllItems();
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
                
                // Update zoom background rectangle to cover full container
                if (this.zoomBackground) {
                    const svgWidth = +this.svg.attr('width') || 0;
                    this.zoomBackground
                        .attr('width', svgWidth)
                        .attr('height', this.height + this.margin.top + this.margin.bottom);
                }
                
                // Update axes positions
                this.xAxis.attr('transform', `translate(0,${this.yScale(0)})`);
                this.xAxisTop.attr('transform', `translate(0,${this.yScale(itemsHeight)})`);
            }
            
            // Now update the visual elements with correct heights
            this.plot.updatePlotAfterZoom();
        } else {
            this.plot.updatePlot();
        }
    }
    
    getAllItems() {
        const allItems = [];
        const customItems = this.customItems[this.currentDimension] || [];
        
        // Get original items with potential overrides or deletions
        if (this.dimensionData.items) {
            this.dimensionData.items.forEach((item, index) => {
                // Check if this item is marked as deleted
                const isDeleted = customItems.some(
                    custom => custom.originalIndex === index && custom.isDeleted
                );
                
                if (isDeleted) {
                    // Skip deleted items
                    return;
                }
                
                // Check if there's an override for this item
                const override = customItems.find(
                    custom => custom.originalIndex === index && custom.isOverride && !custom.isDeleted
                );
                
                if (override) {
                    // Merge override with original - ensure all fields are included
                    const mergedItem = {
                        ...item,
                        name: override.name !== undefined ? override.name : item.name,
                        value: override.value !== undefined ? override.value : item.value,
                        description: override.description !== undefined ? override.description : item.description,
                        source: override.source !== undefined ? override.source : item.source,
                        imageData: override.imageData !== undefined ? override.imageData : undefined
                    };
                    allItems.push({
                        ...mergedItem,
                        convertedValue: this.convertValue(mergedItem.value)
                    });
                } else {
                    allItems.push({
                        ...item,
                        convertedValue: this.convertValue(item.value)
                    });
                }
            });
        }
        
        // Add custom items (not overrides, not deleted)
        customItems.forEach(customItem => {
            if (customItem.isCustom && !customItem.isOverride && !customItem.isDeleted) {
                // Validate item before adding - must have name and valid value
                const value = parseFloat(customItem.value);
                const hasValidName = customItem.name && customItem.name.trim().length > 0;
                const hasValidValue = !isNaN(value) && isFinite(value) && value !== 0;
                
                if (hasValidName && hasValidValue) {
                    allItems.push({
                        ...customItem,
                        convertedValue: this.convertValue(customItem.value)
                    });
                }
            }
        });
        
        // Filter out any items with invalid names or values
        return allItems.filter(item => {
            const value = parseFloat(item.value);
            const hasValidName = item.name && item.name.trim().length > 0;
            const hasValidValue = !isNaN(value) && isFinite(value) && value !== 0;
            return hasValidName && hasValidValue;
        });
    }
    
    updateUnitDescription() {
        if (!this.currentUnit || !this.dimensionData) {
            this.unitDescription.textContent = '';
            this.unitDescription.style.display = 'none'; // Hide when empty
            return;
        }
        
        const unit = this.dimensionData.units.find(u => u.name === this.currentUnit);
        if (!unit) {
            this.unitDescription.textContent = '';
            this.unitDescription.style.display = 'none';
            return;
        }
        
        // Check for unit description override
        const unitIndex = this.dimensionData.units.indexOf(unit);
        const unitDescOverride = this.editor?.unitOverrides[this.currentDimension]?.[unitIndex]?.description;
        const unitDesc = unitDescOverride !== undefined 
            ? unitDescOverride 
            : (unit.description || '');
        
        if (unitDesc) {
            this.unitDescription.textContent = unitDesc;
            this.unitDescription.style.display = '';
        } else {
            this.unitDescription.textContent = '';
            this.unitDescription.style.display = 'none'; // Hide when empty
        }
    }
    
    showError(message) {
        // Simple error display - could be enhanced
        console.error(message);
        alert(message);
    }
    
    setupZoom() {
        // Store actual item extent (without the 0.1 multiplier) for zoom limits
        this.actualItemExtent = null;
        
        // Create a background rectangle for visual feedback and event capture
        // This covers the entire container (including margins) for seamless panning
        // Positioned relative to mainGroup (which is translated by margins)
        const svgWidth = +this.svg.attr('width') || 0;
        this.zoomBackground = this.mainGroup.insert('rect', ':first-child')
            .attr('class', 'zoom-background')
            .attr('x', -this.margin.left)
            .attr('y', -this.margin.top)
            .attr('width', svgWidth)
            .attr('height', this.height + this.margin.top + this.margin.bottom)
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
                
                // For mouse events, only allow on background (not on items)
                if (event.type === 'mousedown') {
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
                    for (let i = 0; i < CONFIG.PARENT_CHECK_DEPTH && current; i++) {
                        if (current.classList && (
                            current.classList.contains('item-group') || 
                            current.classList.contains('label-group')
                        )) {
                            return false;
                        }
                        current = current.parentNode;
                    }
                }
                
                // For touch events on mobile, allow panning even if starting on items/labels
                // We'll detect drag vs tap in the touch handlers
                if (event.type === 'touchstart') {
                    const isMobile = ('ontouchstart' in window) || window.matchMedia('(hover: none)').matches;
                    if (isMobile) {
                        // Always allow touchstart - we'll handle drag detection in touchmove
                        const target = event.target;
                        const isOnItem = target.classList && (
                            target.classList.contains('plot-item') || 
                            target.classList.contains('label-hover-area') || 
                            target.classList.contains('tap-target') ||
                            target.classList.contains('item-label')
                        );
                        
                        // Check parent elements
                        let isOnItemGroup = false;
                        if (!isOnItem) {
                            let current = target;
                            for (let i = 0; i < CONFIG.PARENT_CHECK_DEPTH && current; i++) {
                                if (current.classList && (
                                    current.classList.contains('item-group') || 
                                    current.classList.contains('label-group')
                                )) {
                                    isOnItemGroup = true;
                                    break;
                                }
                                current = current.parentNode;
                            }
                        }
                        
                        // Store that touch started on item for later drag detection
                        if (isOnItem || isOnItemGroup) {
                            this.touchStartOnItem = true;
                            const touch = event.touches && event.touches[0];
                            if (touch) {
                                this.touchStartPosition = { x: touch.clientX, y: touch.clientY };
                            }
                        } else {
                            this.touchStartOnItem = false;
                            this.touchStartPosition = null;
                        }
                        
                        // Always allow touchstart on mobile - we'll handle drag vs tap later
                        return true;
                    } else {
                        // Desktop touch: same as mouse
                        const target = event.target;
                        if (target.classList && (
                            target.classList.contains('plot-item') || 
                            target.classList.contains('label-hover-area') || 
                            target.classList.contains('tap-target') ||
                            target.classList.contains('item-label')
                        )) {
                            return false;
                        }
                        let current = target;
                        for (let i = 0; i < CONFIG.PARENT_CHECK_DEPTH && current; i++) {
                            if (current.classList && (
                                current.classList.contains('item-group') || 
                                current.classList.contains('label-group')
                            )) {
                                return false;
                            }
                            current = current.parentNode;
                        }
                    }
                }
                
                return true;
            })
            .on('start', (event) => {
                // Change cursor when dragging starts
                if (this.zoomBackground) {
                    this.zoomBackground.attr('cursor', 'grabbing');
                }
                // Track initial drag position for vertical scrolling
                const startPosition = this.getSourceEventPosition(event.sourceEvent);
                if (startPosition) {
                    this.dragStartY = startPosition.y;
                    this.dragStartX = startPosition.x;
                } else {
                    this.dragStartY = null;
                    this.dragStartX = null;
                }
                this.lastScrollDeltaY = null;
            })
            .on('zoom', (event) => {
                // Handle vertical scrolling independently from horizontal panning
                const currentPosition = this.getSourceEventPosition(event.sourceEvent);
                if (this.dragStartY !== null && currentPosition) {
                    const deltaY = currentPosition.y - this.dragStartY;
                    if (Math.abs(deltaY) > CONFIG.VERTICAL_SCROLL_THRESHOLD) {
                        const scrollAmount = deltaY - (this.lastScrollDeltaY || 0);
                        window.scrollBy(0, -scrollAmount);
                        this.lastScrollDeltaY = deltaY;
                    }
                }
                
                // Always handle horizontal zoom/pan (works simultaneously with vertical scrolling)
                this.handleZoom(event);
            })
            .on('end', () => {
                // Change cursor back when dragging ends
                if (this.zoomBackground) {
                    this.zoomBackground.attr('cursor', 'grab');
                }
                // Reset drag tracking
                this.dragStartY = null;
                this.dragStartX = null;
                this.lastScrollDeltaY = null;
                this.touchStartOnItem = null;
                this.touchStartPosition = null;
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
                for (let i = 0; i < CONFIG.PARENT_CHECK_DEPTH && current; i++) {
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

    getSourceEventPosition(sourceEvent) {
        if (!sourceEvent) return null;
        
        // Handle touch events (prefer current touches; fall back to changed touches)
        if (sourceEvent.touches) {
            if (sourceEvent.touches.length !== 1) {
                return null; // Ignore multi-touch gestures (pinch zoom, etc.)
            }
            const touch = sourceEvent.touches[0];
            return { x: touch.clientX, y: touch.clientY };
        }
        if (sourceEvent.changedTouches) {
            if (sourceEvent.changedTouches.length !== 1) {
                return null;
            }
            const touch = sourceEvent.changedTouches[0];
            return { x: touch.clientX, y: touch.clientY };
        }
        
        // Pointer and mouse events
        if (typeof sourceEvent.clientX === 'number' && typeof sourceEvent.clientY === 'number') {
            return { x: sourceEvent.clientX, y: sourceEvent.clientY };
        }
        
        return null;
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
            } else if (newLogMin < logActualMin) {
                newLogMin = logActualMin;
                newLogMax = newLogMin + currentVisibleLogRange;
                constrained = true;
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
            
            // Throttle plot updates during zoom for better performance on mobile
            // Use requestAnimationFrame to batch updates
            if (!this.zoomUpdatePending) {
                this.zoomUpdatePending = true;
                requestAnimationFrame(() => {
                    this.plot.updatePlotAfterZoom();
                    this.zoomUpdatePending = false;
                });
            }
        }
    }
    
    // Calculate zoom transform from a domain (used after resize to sync transform with domain)
    calculateTransformFromDomain(domain) {
        if (!this.originalXDomain || !domain) {
            return d3.zoomIdentity;
        }
        
        const [originalMin, originalMax] = this.originalXDomain;
        const [currentMin, currentMax] = domain;
        
        // Convert to log space
        const logOriginalMin = Math.log10(originalMin);
        const logOriginalMax = Math.log10(originalMax);
        const logOriginalRange = logOriginalMax - logOriginalMin;
        
        const logCurrentMin = Math.log10(currentMin);
        const logCurrentMax = Math.log10(currentMax);
        const logCurrentRange = logCurrentMax - logCurrentMin;
        
        // Calculate scale: how much we've zoomed
        const k = logOriginalRange / logCurrentRange;
        
        // Calculate translation: how much we've panned
        // transform.x represents pixel offset, convert from log space
        const logPan = logCurrentMin - logOriginalMin;
        const x = -(logPan / logCurrentRange) * this.width;
        
        return d3.zoomIdentity.translate(x, 0).scale(k);
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
            this.plot.updatePlotAfterZoom();
        }
    }
}

// Initialize the application when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.app = new UniversalScales();
});
