export class ButtonGroup {
    constructor(
        containerSelector,
        dropdownSelector,
        buttonSelector,
        menuItemsSelector,
        iconSelector,
        audioPlayer,
        dataManager
    ) {
        console.log(`Initializing ButtonGroup for selector: "${containerSelector}"`);
        this.audioPlayer = audioPlayer;
        this.dataManager = dataManager || null;

        // Select key elements
        this.container = document.querySelector(containerSelector);
        if (!this.container) {
            console.error(`ButtonGroup Error: No element found for selector "${containerSelector}"`);
            return;
        }
        this.dropdown = this.container.querySelector(dropdownSelector);
        this.button = this.container.querySelector(buttonSelector);
        this.menuItems = this.dropdown.querySelectorAll(menuItemsSelector);
        this.icon = this.button.querySelector(iconSelector);
        this.gridWrapper = document.querySelector('.grid-wrapper'); // Grid wrapper
        this.gridContent = document.querySelector('.grid-content');
        this.closeGridBtn = document.querySelector('.close-grid-btn'); // Close button
        this.collapseElement = document.getElementById('collapseInfoMenu'); // Collapsible menu

        if (!this.dropdown || !this.button || !this.menuItems.length || !this.icon) {
            console.error('ButtonGroup initialization failed: Missing elements.');
            return;
        }

        this.collapseInstance = null;
        if (this.collapseElement) {
            this.collapseInstance = bootstrap.Collapse.getOrCreateInstance(this.collapseElement);
        }

        this.init();
    }

    /**
     * Initialize the ButtonGroup by setting up SVGs and event bindings.
     */
    init() {
        console.log(`ButtonGroup Init: Setting up dynamic SVGs and events.`);
        this.loadDynamicSVGs();
        this.bindEvents();
    }

    /**
     * Load dynamic SVGs for the main button and dropdown menu items.
     */
    loadDynamicSVGs() {
        const src = this.icon.getAttribute('data-src');
        if (src) {
            this.fetchAndSetSVG(src, this.icon, true);
        }

        this.menuItems.forEach(item => {
            const iconImg = item.querySelector('img');
            const src = item.getAttribute('data-icon');
            if (src && iconImg) {
                iconImg.src = src;
                iconImg.alt = item.getAttribute('data-value') || 'Menu Item';
                iconImg.style.filter = 'brightness(0) saturate(100%)';
                iconImg.style.marginRight = '8px';
                iconImg.style.width = '16px';
                iconImg.style.height = '16px';
            }
        });
    }

    /**
     * Fetch and set SVG content.
     */
    fetchAndSetSVG(src, element, isInline = true) {
        if (!isInline) return;

        fetch(src)
            .then(response => {
                if (!response.ok) throw new Error(`Failed to load SVG: ${src}`);
                return response.text();
            })
            .then(svgContent => {
                const parser = new DOMParser();
                const svgDoc = parser.parseFromString(svgContent, 'image/svg+xml');
                const svgElement = svgDoc.documentElement;

                if (svgElement && svgElement.tagName.toLowerCase() === 'svg') {
                    svgElement.setAttribute('fill', 'currentColor');
                    svgElement.setAttribute('role', 'img');
                    svgElement.classList.add('icon-svg');
                    element.innerHTML = '';
                    element.appendChild(svgElement);
                } else {
                    console.error(`Invalid SVG content fetched from: ${src}`);
                }
            })
            .catch(error => console.error(`Error loading SVG from ${src}:`, error));
    }

    /**
     * Bind events to menu items and the close grid button.
     */
    bindEvents() {
        this.menuItems.forEach(item => {
            item.addEventListener('click', (e) => {
                e.preventDefault();
                const newIconPath = item.getAttribute('data-icon');
                const newValue = item.getAttribute('data-value');

                if (newIconPath && newValue) {
                    this.icon.setAttribute('data-src', newIconPath);
                    this.icon.setAttribute('aria-label', newValue);
                    this.fetchAndSetSVG(newIconPath, this.icon, true);
                }

                this.onSelectionChange(newValue);
            });
        });

        if (this.closeGridBtn) {
            this.closeGridBtn.addEventListener('click', () => {
                this.hideGrid();
            });
        }
    }

    /**
     * Handle selection change from the dropdown menu.
     */
    onSelectionChange(selectedValue) {
        console.log(`Button group selection changed to: ${selectedValue}`);
        const groupType = this.container.getAttribute('data-group');

        switch (groupType) {
            case 'information-dropdown':
                this.handleInformationDropdown(selectedValue);
                break;
            case 'transport-dropdown':
                this.handleTransportDropdown(selectedValue);
                break;
            case 'interaction-dropdown':
                this.handleInteractionDropdown(selectedValue);
                break;
            default:
                console.warn(`Unknown group type: ${groupType}`);
        }
    }

    /**
     * Handle information dropdown selection.
     */
    handleInformationDropdown(selectedValue) {
        console.log(`[Information Dropdown] Selected: ${selectedValue}`);
        const typeMap = {
            'Control Monitor': 'monitorInfo',
            'Track': 'trackInfo',
            'Interplanetary Player': 'interplanetaryPlayerInfo',
            'Sound Engine': 'soundEngineInfo',
        };

        const target = typeMap[selectedValue];

        if (target) {
            if (this.dataManager) {
                this.dataManager.populatePlaceholders(target);
                this.showGrid();
            } else {
                console.error('[Information Dropdown] DataManager instance is not defined.');
            }
        } else {
            console.warn(`[Information Dropdown] Unknown selection: ${selectedValue}`);
        }
    }

    /**
     * Show the grid wrapper and expand the collapsible menu.
     */
    showGrid() {
        if (this.gridWrapper) {
            this.gridWrapper.style.display = 'grid';
            console.log('[Grid] Grid is now visible.');
        }

        if (this.collapseInstance) {
            this.collapseInstance.show();
            console.log('[Collapse] Collapsible menu is now expanded.');
        }
    }

    /**
     * Hide the grid wrapper and collapse the menu.
     */
    hideGrid() {
        if (this.gridWrapper) {
            this.gridWrapper.style.display = 'none';
            console.log('[Grid] Grid has been hidden.');
        }

        if (this.collapseInstance) {
            this.collapseInstance.hide();
            console.log('[Collapse] Collapsible menu is now collapsed.');
        }
    }

    /**
     * Handle transport dropdown selection.
     */
    handleTransportDropdown(selectedValue) {
        console.log(`[Transport Dropdown] Selected: ${selectedValue}`);
        switch (selectedValue.toLowerCase()) {
            case 'play':
                this.audioPlayer.play();
                break;
            case 'pause':
                this.audioPlayer.pause();
                break;
            case 'stop':
                this.audioPlayer.stop();
                break;
            default:
                console.warn(`[Transport Dropdown] Unknown action: ${selectedValue}`);
        }
    }

    /**
     * Handle interaction dropdown selection.
     */
    handleInteractionDropdown(selectedValue) {
        console.log(`[Interaction Dropdown] Selected: ${selectedValue}`);
        // Implement interaction logic here if needed
    }
}