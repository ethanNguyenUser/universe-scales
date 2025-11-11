// Universal Scales - Item Editor Module
// Handles visual editing of items, image uploads, and YAML import/export

class ItemEditor {
    constructor(app) {
        this.app = app; // Reference to main UniversalScales instance
        
        // DOM elements
        this.editorToggle = document.getElementById('editor-toggle');
        this.editorContent = document.getElementById('editor-content');
        this.itemsList = document.getElementById('items-list');
        this.addItemBtn = document.getElementById('add-item-btn');
        this.importYamlBtn = document.getElementById('import-yaml-btn');
        this.exportYamlBtn = document.getElementById('export-yaml-btn');
        
        this.setupEventListeners();
        this.loadCustomItems();
    }
    
    setupEventListeners() {
        this.editorToggle.addEventListener('click', () => {
            this.toggleEditor();
        });
        
        this.addItemBtn.addEventListener('click', () => {
            this.addNewItem();
        });
        
        this.importYamlBtn.addEventListener('click', () => {
            this.showYamlImportModal();
        });
        
        this.exportYamlBtn.addEventListener('click', () => {
            this.exportToYaml();
        });
        
        // Setup save button
        this.setupSaveButton();
        // Setup undo button
        this.setupUndoButton();
    }
    
    setupSaveButton() {
        // Check if button already exists
        let saveButton = document.getElementById('editor-save-all-btn');
        
        if (!saveButton) {
            // Create save button and add it to the header
            saveButton = document.createElement('button');
            saveButton.id = 'editor-save-all-btn';
            saveButton.className = 'btn btn-primary';
            saveButton.textContent = 'Save All Changes';
            saveButton.onclick = () => this.saveAllItems();
            
            // Add to editor-actions div
            const editorActions = document.querySelector('.editor-actions');
            if (editorActions) {
                editorActions.appendChild(saveButton);
            }
        }
    }
    
    setupUndoButton() {
        // Check if button already exists
        let undoButton = document.getElementById('editor-undo-all-btn');
        
        if (!undoButton) {
            // Create undo button and add it to the header
            undoButton = document.createElement('button');
            undoButton.id = 'editor-undo-all-btn';
            undoButton.className = 'btn btn-secondary';
            undoButton.textContent = 'Undo All Changes';
            undoButton.onclick = () => this.undoAllChanges();
            
            // Add to editor-actions div (before save button)
            const editorActions = document.querySelector('.editor-actions');
            if (editorActions) {
                const saveButton = document.getElementById('editor-save-all-btn');
                if (saveButton) {
                    editorActions.insertBefore(undoButton, saveButton);
                } else {
                    editorActions.appendChild(undoButton);
                }
            }
        }
    }
    
    undoAllChanges() {
        if (!confirm('Are you sure you want to undo all changes? This will remove all custom items, edits, and deletions for this dimension.')) {
            return;
        }
        
        // Clear all custom items for the current dimension
        if (this.app.customItems[this.app.currentDimension]) {
            this.app.customItems[this.app.currentDimension] = [];
        }
        
        // Save to localStorage
        this.saveCustomItems();
        
        // Refresh the editor display
        this.renderEditorItems();
        
        // Update the plot
        this.app.plot.updatePlot();
        
        alert('All changes have been undone!');
    }
    
    toggleEditor() {
        const isExpanded = this.editorContent.style.display !== 'none';
        this.editorContent.style.display = isExpanded ? 'none' : 'block';
        this.editorToggle.classList.toggle('expanded', !isExpanded);
        
        if (!isExpanded) {
            this.renderEditorItems();
        }
    }
    
    renderEditorItems() {
        if (!this.app.dimensionData) return;
        
        this.itemsList.innerHTML = '';
        
        // Get all items (original + custom)
        const allItems = this.getAllItemsForEditor();
        
        // Sort items by value (smallest to largest) to match the plot order
        const sortedItems = [...allItems].sort((a, b) => {
            const valueA = parseFloat(a.value) || 0;
            const valueB = parseFloat(b.value) || 0;
            return valueA - valueB;
        });
        
        // Update header with total count
        const editorHeader = document.querySelector('.editor-header h3');
        if (editorHeader) {
            editorHeader.textContent = `Item Editor (${sortedItems.length} items)`;
        }
        
        sortedItems.forEach((item, index) => {
            const card = this.createItemEditorCard(item, index + 1); // Use 1-based numbering
            this.itemsList.appendChild(card);
        });
    }
    
    getAllItemsForEditor() {
        const originalItems = this.app.dimensionData.items || [];
        const customItems = this.app.customItems[this.app.currentDimension] || [];
        
        // Merge original and custom items, applying overrides and excluding deleted items
        const allItems = [];
        
        originalItems.forEach((item, index) => {
            // Check if this item is deleted
            const isDeleted = customItems.some(
                custom => custom.originalIndex === index && custom.isDeleted
            );
            
            if (!isDeleted) {
                // Check if there's an override
                const override = customItems.find(
                    custom => custom.originalIndex === index && custom.isOverride && !custom.isDeleted
                );
                
                if (override) {
                    // Merge override with original
                    allItems.push({
                        ...item,
                        ...override,
                        isCustom: false,
                        originalIndex: index
                    });
                } else {
                    allItems.push({
                        ...item,
                        isCustom: false,
                        originalIndex: index
                    });
                }
            }
        });
        
        // Add custom items (not overrides, not deleted)
        customItems.forEach(customItem => {
            if (customItem.isCustom && !customItem.isOverride && !customItem.isDeleted) {
                // Ensure customId exists
                if (!customItem.customId) {
                    customItem.customId = `custom-${Date.now()}-${Math.random()}`;
                }
                allItems.push({
                    ...customItem,
                    isCustom: true,
                    customId: customItem.customId
                });
            }
        });
        
        return allItems;
    }
    
    getCurrentImagePath(item) {
        // First check if there's imageData (custom uploaded image)
        if (item.imageData) {
            return item.imageData;
        }
        
        // Otherwise use the same logic as getImagePath in script.js
        const sanitizedDimension = this.app.currentDimension
            .replace(/[^\w\s-]/g, '')  // Remove special characters
            .replace(/[-\s]+/g, '_')    // Replace spaces and dashes with underscores
            .toLowerCase();
        
        const sanitizedName = (item.name || '')
            .replace(/[^\w\s-]/g, '')  // Remove special characters
            .replace(/[-\s]+/g, '_')    // Replace spaces and dashes with underscores
            .toLowerCase();
        
        const baseFilename = `${sanitizedDimension}_${sanitizedName}`;
        return `images/${baseFilename}.jpg`;
    }
    
    createItemEditorCard(item, itemNumber) {
        const card = document.createElement('div');
        card.className = 'item-editor-card';
        // Store originalIndex for original items (needed for overrides), or use itemNumber for display
        if (item.originalIndex !== undefined) {
            card.dataset.itemIndex = item.originalIndex;
        } else {
            card.dataset.itemIndex = itemNumber - 1; // Fallback for custom items without originalIndex
        }
        card.dataset.isCustom = item.isCustom ? 'true' : 'false';
        // Always set customId for custom items, generate one if missing
        if (item.isCustom) {
            card.dataset.customId = item.customId || `custom-${Date.now()}-${Math.random()}`;
        } else if (item.customId) {
            card.dataset.customId = item.customId;
        }
        
        // Get current image path (either imageData or file path)
        const currentImagePath = this.getCurrentImagePath(item);
        const hasImageData = !!item.imageData;
        const imagePreview = currentImagePath ? `<img src="${currentImagePath}" alt="Preview" class="image-preview" onerror="this.style.display='none'">` : '';
        
        const header = document.createElement('div');
        header.className = 'item-editor-card-header';
        header.innerHTML = `
            <div class="item-editor-card-title-row">
                <h4>${itemNumber}. ${item.name || 'Unnamed Item'}</h4>
                <button class="btn btn-small btn-danger" onclick="window.app.editor.deleteItem(event)">Delete Item</button>
            </div>
        `;
        
        const form = document.createElement('form');
        form.className = 'item-editor-form';
        form.innerHTML = `
            <div class="item-editor-form-left">
                <div class="item-editor-form-group">
                    <label>Name *</label>
                    <input type="text" name="name" value="${this.escapeHtml(item.name || '')}" required>
                </div>
                <div class="item-editor-form-group">
                    <label>Value *</label>
                    <input type="number" name="value" step="any" value="${item.value || ''}" required>
                </div>
                <div class="item-editor-form-group">
                    <label>Description</label>
                    <textarea name="description">${this.escapeHtml(item.description || '')}</textarea>
                </div>
                <div class="item-editor-form-group">
                    <label>Source URL</label>
                    <input type="url" name="source" value="${this.escapeHtml(item.source || '')}">
                </div>
            </div>
            <div class="item-editor-form-right image-upload-section">
                <div class="image-upload-controls">
                    <div class="file-input-wrapper">
                        <input type="file" accept="image/*" onchange="window.app.editor.handleImageUpload(event, ${itemNumber})" id="file-${itemNumber}">
                        <label for="file-${itemNumber}" class="btn btn-small">Choose Image</label>
                    </div>
                    ${currentImagePath ? '<button type="button" class="btn btn-small btn-danger" onclick="window.app.editor.removeImage(event, ' + itemNumber + ')">Delete Image</button>' : ''}
                </div>
                <div class="image-preview-container">
                    ${imagePreview}
                </div>
            </div>
        `;
        
        card.appendChild(header);
        card.appendChild(form);
        
        return card;
    }
    
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
    
    addNewItem() {
        const newItem = {
            name: '',
            value: 0,
            description: '',
            source: '',
            isCustom: true,
            customId: `custom-${Date.now()}-${Math.random()}`
        };
        
        if (!this.app.customItems[this.app.currentDimension]) {
            this.app.customItems[this.app.currentDimension] = [];
        }
        
        this.app.customItems[this.app.currentDimension].push(newItem);
        this.saveCustomItems();
        this.renderEditorItems();
        this.app.plot.updatePlot();
    }
    
    saveAllItems() {
        // Collect all item data from all cards
        const allCards = this.itemsList.querySelectorAll('.item-editor-card');
        const itemsToSave = [];
        const errors = [];
        
        allCards.forEach((card, index) => {
            const form = card.querySelector('.item-editor-form');
            if (!form) return;
            
            const formData = new FormData(form);
            const itemData = {
                name: formData.get('name'),
                value: parseFloat(formData.get('value')),
                description: formData.get('description') || '',
                source: formData.get('source') || ''
            };
            
            // Validate
            if (!itemData.name || isNaN(itemData.value)) {
                errors.push(`Item ${index + 1}: Name and Value are required`);
                return;
            }
            
            const isCustom = card.dataset.isCustom === 'true';
            const originalIndex = parseInt(card.dataset.itemIndex);
            const customId = card.dataset.customId;
            
            itemsToSave.push({
                itemData,
                isCustom,
                originalIndex,
                customId,
                card
            });
        });
        
        if (errors.length > 0) {
            alert('Validation errors:\n' + errors.join('\n'));
            return;
        }
        
        // Initialize custom items array if needed
        if (!this.app.customItems[this.app.currentDimension]) {
            this.app.customItems[this.app.currentDimension] = [];
        }
        
        // Save each item
        itemsToSave.forEach(({ itemData, isCustom, originalIndex, customId, card }) => {
            if (isCustom && customId) {
                // Update existing custom item
                const customItems = this.app.customItems[this.app.currentDimension];
                const itemIndex = customItems.findIndex(item => item.customId === customId);
                
                if (itemIndex !== -1) {
                    // Preserve image data if it exists
                    if (customItems[itemIndex].imageData) {
                        itemData.imageData = customItems[itemIndex].imageData;
                    }
                    // Preserve isDeleted flag if it exists
                    if (customItems[itemIndex].isDeleted) {
                        itemData.isDeleted = customItems[itemIndex].isDeleted;
                    }
                    customItems[itemIndex] = { ...customItems[itemIndex], ...itemData };
                }
            } else {
                // For original items, create or update a custom override
                const existing = this.app.customItems[this.app.currentDimension].find(
                    item => item.originalIndex === originalIndex
                );
                
                if (existing) {
                    // Preserve image data if it exists
                    if (existing.imageData) {
                        itemData.imageData = existing.imageData;
                    }
                    // Update existing override/deletion marker
                    Object.assign(existing, itemData, {
                        isOverride: true,
                        isDeleted: false
                    });
                } else {
                    // Create new override
                    this.app.customItems[this.app.currentDimension].push({
                        ...itemData,
                        originalIndex: originalIndex,
                        isCustom: false,
                        isOverride: true,
                        isDeleted: false
                    });
                }
            }
        });
        
        this.saveCustomItems();
        this.renderEditorItems();
        this.app.plot.updatePlot();
        alert('All changes saved successfully!');
    }
    
    deleteItem(event) {
        if (!confirm('Are you sure you want to delete this item?')) {
            return;
        }
        
        const card = event.target.closest('.item-editor-card');
        const isCustom = card.dataset.isCustom === 'true';
        const customId = card.dataset.customId;
        
        if (!this.app.customItems[this.app.currentDimension]) {
            this.app.customItems[this.app.currentDimension] = [];
        }
        
        if (isCustom && customId) {
            // Delete custom item completely
            const customItems = this.app.customItems[this.app.currentDimension];
            const index = customItems.findIndex(item => item.customId === customId);
            if (index !== -1) {
                customItems.splice(index, 1);
            }
        } else {
            // For original items, mark as deleted
            const originalIndex = parseInt(card.dataset.itemIndex);
            
            // Check if there's already an override or deletion marker
            const existing = this.app.customItems[this.app.currentDimension].find(
                item => item.originalIndex === originalIndex
            );
            
            if (existing) {
                // Mark as deleted, preserve any override data
                existing.isDeleted = true;
            } else {
                // Create a deletion marker
                this.app.customItems[this.app.currentDimension].push({
                    originalIndex: originalIndex,
                    isCustom: false,
                    isOverride: false,
                    isDeleted: true
                });
            }
        }
        
        this.saveCustomItems();
        this.renderEditorItems();
        this.app.plot.updatePlot();
    }
    
    compressImage(file, maxWidth = 800, maxHeight = 800, quality = 0.7) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                const img = new Image();
                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    let width = img.width;
                    let height = img.height;
                    
                    // Calculate new dimensions
                    if (width > height) {
                        if (width > maxWidth) {
                            height = (height * maxWidth) / width;
                            width = maxWidth;
                        }
                    } else {
                        if (height > maxHeight) {
                            width = (width * maxHeight) / height;
                            height = maxHeight;
                        }
                    }
                    
                    canvas.width = width;
                    canvas.height = height;
                    
                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(img, 0, 0, width, height);
                    
                    // Convert to JPEG (smaller than PNG) with quality setting
                    const compressedDataUrl = canvas.toDataURL('image/jpeg', quality);
                    resolve(compressedDataUrl);
                };
                img.onerror = reject;
                img.src = e.target.result;
            };
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
    }
    
    async handleImageUpload(event, index) {
        const file = event.target.files[0];
        if (!file) return;
        
        if (!file.type.startsWith('image/')) {
            alert('Please select an image file');
            return;
        }
        
        try {
            // Compress image before storing
            const imageData = await this.compressImage(file);
            
            const card = event.target.closest('.item-editor-card');
            const isCustom = card.dataset.isCustom === 'true';
            const customId = card.dataset.customId;
            
            if (isCustom && customId) {
                const customItems = this.app.customItems[this.app.currentDimension] || [];
                let item = customItems.find(item => item.customId === customId);
                if (!item) {
                    // Item not found, create a new custom item entry
                    item = {
                        name: '',
                        value: 0,
                        description: '',
                        source: '',
                        isCustom: true,
                        customId: customId,
                        imageData: imageData
                    };
                    customItems.push(item);
                } else {
                    item.imageData = imageData;
                }
                this.saveCustomItems();
                this.renderEditorItems();
            } else {
                // For original items, create an override
                const originalIndex = parseInt(card.dataset.itemIndex);
                if (!this.app.customItems[this.app.currentDimension]) {
                    this.app.customItems[this.app.currentDimension] = [];
                }
                
                const existingOverride = this.app.customItems[this.app.currentDimension].find(
                    item => item.originalIndex === originalIndex
                );
                
                if (existingOverride) {
                    existingOverride.imageData = imageData;
                } else {
                    this.app.customItems[this.app.currentDimension].push({
                        originalIndex: originalIndex,
                        isCustom: false,
                        isOverride: true,
                        imageData: imageData
                    });
                }
                this.saveCustomItems();
                this.renderEditorItems();
            }
        } catch (error) {
            console.error('Error processing image:', error);
            alert('Error processing image. Please try a different image file.');
        }
    }
    
    removeImage(event, index) {
        const card = event.target.closest('.item-editor-card');
        const isCustom = card.dataset.isCustom === 'true';
        const customId = card.dataset.customId;
        
        if (isCustom && customId) {
            const customItems = this.app.customItems[this.app.currentDimension] || [];
            const item = customItems.find(item => item.customId === customId);
            if (item) {
                delete item.imageData;
                this.saveCustomItems();
                this.renderEditorItems();
            }
        } else {
            const originalIndex = parseInt(card.dataset.itemIndex);
            const override = this.app.customItems[this.app.currentDimension]?.find(
                item => item.originalIndex === originalIndex
            );
            if (override) {
                delete override.imageData;
                this.saveCustomItems();
                this.renderEditorItems();
            }
        }
    }
    
    exportToYaml() {
        if (!this.app.dimensionData) return;
        
        // Create YAML structure with custom items merged
        const allItems = this.getAllItemsForEditor();
        
        // Sort items by value (smallest to largest) to match the plot order
        const sortedItems = [...allItems].sort((a, b) => {
            const valueA = parseFloat(a.value) || 0;
            const valueB = parseFloat(b.value) || 0;
            return valueA - valueB;
        });
        
        const yamlData = {
            dimension_description: this.app.dimensionData.dimension_description,
            units: this.app.dimensionData.units,
            items: sortedItems.map(item => {
                const itemData = {
                    name: item.name,
                    value: item.value,
                    description: item.description || '',
                    source: item.source || ''
                };
                // Note: imageData (base64) is too large for YAML, so we exclude it
                // Users would need to save images separately
                return itemData;
            })
        };
        
        const yamlText = jsyaml.dump(yamlData, { indent: 2 });
        this.showYamlModal('Export YAML', yamlText, false);
    }
    
    showYamlImportModal() {
        this.showYamlModal('Import YAML', '', true);
    }
    
    showYamlModal(title, content, isImport) {
        // Create modal if it doesn't exist
        let modal = document.getElementById('yaml-modal');
        if (!modal) {
            modal = document.createElement('div');
            modal.id = 'yaml-modal';
            modal.className = 'yaml-modal';
            modal.innerHTML = `
                <div class="yaml-modal-content">
                    <div class="yaml-modal-header">
                        <h3>${title}</h3>
                        <button class="yaml-modal-close" onclick="window.app.editor.closeYamlModal()">&times;</button>
                    </div>
                    <textarea id="yaml-textarea" class="yaml-textarea"></textarea>
                    <div class="yaml-modal-actions">
                        <button class="btn btn-secondary" onclick="window.app.editor.closeYamlModal()">Cancel</button>
                        <button class="btn btn-primary" onclick="window.app.editor.${isImport ? 'importYaml' : 'downloadYaml'}()">${isImport ? 'Import' : 'Download'}</button>
                    </div>
                </div>
            `;
            document.body.appendChild(modal);
            
            // Close modal when clicking outside
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    this.closeYamlModal();
                }
            });
        }
        
        const header = modal.querySelector('.yaml-modal-header h3');
        const textarea = modal.querySelector('#yaml-textarea');
        const actionBtn = modal.querySelector('.yaml-modal-actions .btn-primary');
        
        header.textContent = title;
        textarea.value = content;
        actionBtn.textContent = isImport ? 'Import' : 'Download';
        actionBtn.onclick = () => isImport ? this.importYaml() : this.downloadYaml();
        
        modal.style.display = 'block';
    }
    
    closeYamlModal() {
        const modal = document.getElementById('yaml-modal');
        if (modal) {
            modal.style.display = 'none';
        }
    }
    
    importYaml() {
        const textarea = document.getElementById('yaml-textarea');
        const yamlText = textarea.value;
        
        try {
            const importedData = jsyaml.load(yamlText);
            
            if (!importedData.items || !Array.isArray(importedData.items)) {
                alert('Invalid YAML format: items array is required');
                return;
            }
            
            // Clear existing custom items for this dimension
            this.app.customItems[this.app.currentDimension] = [];
            
            // Add all items as custom items
            importedData.items.forEach(item => {
                this.app.customItems[this.app.currentDimension].push({
                    ...item,
                    isCustom: true,
                    customId: `custom-${Date.now()}-${Math.random()}`
                });
            });
            
            this.saveCustomItems();
            this.closeYamlModal();
            this.renderEditorItems();
            this.app.plot.updatePlot();
            alert('YAML imported successfully!');
        } catch (error) {
            alert('Error parsing YAML: ' + error.message);
        }
    }
    
    downloadYaml() {
        const textarea = document.getElementById('yaml-textarea');
        const yamlText = textarea.value;
        
        const blob = new Blob([yamlText], { type: 'text/yaml' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${this.app.currentDimension}_custom.yaml`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        this.closeYamlModal();
    }
    
    saveCustomItems() {
        try {
            const dataToSave = JSON.stringify(this.app.customItems);
            // Check approximate size (rough estimate: 1 character ≈ 1 byte for ASCII, but base64 is larger)
            const sizeInMB = new Blob([dataToSave]).size / (1024 * 1024);
            
            if (sizeInMB > 4) {
                console.warn(`Custom items data is ${sizeInMB.toFixed(2)}MB. Consider removing some images to avoid quota issues.`);
            }
            
            localStorage.setItem('customItems', dataToSave);
        } catch (error) {
            if (error.name === 'QuotaExceededError') {
                alert('Storage quota exceeded! The image data is too large. Please remove some images or use smaller images. Images are automatically compressed to 800x800px, but you may have too many images stored.');
                console.error('localStorage quota exceeded. Current data size:', new Blob([JSON.stringify(this.app.customItems)]).size / (1024 * 1024), 'MB');
            } else {
                console.error('Error saving custom items:', error);
                alert('Error saving changes. Please try again.');
            }
        }
    }
    
    loadCustomItems() {
        const saved = localStorage.getItem('customItems');
        if (saved) {
            try {
                this.app.customItems = JSON.parse(saved);
            } catch (e) {
                console.error('Error loading custom items:', e);
                this.app.customItems = {};
            }
        }
    }
    
    // Called when dimension changes to refresh editor
    onDimensionChange() {
        if (this.editorContent && this.editorContent.style.display !== 'none') {
            this.renderEditorItems();
        }
    }
}

