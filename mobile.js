// Mobile-only progressive enhancement to avoid cluttering core app

(function () {
    function isMobileLikeEvent(ev) {
        const pointerIsTouch = ev && (ev.pointerType === 'touch' || ev.pointerType === 'pen');
        const hasTouch = 'ontouchstart' in window;
        const hoverNone = window.matchMedia('(hover: none)').matches;
        const narrow = window.matchMedia('(max-width: 768px)').matches;
        return pointerIsTouch || hasTouch || hoverNone || narrow;
    }

    // Light tuning for crowded plots on very small screens
    function applyMobileTuning() {
        const isNarrow = window.matchMedia('(max-width: 480px)').matches;
        if (isNarrow) {
            if (window.CONFIG) {
                window.CONFIG.GRID_TICKS = 6;
                window.CONFIG.LABEL_FONT_SIZE = '8px';
                window.CONFIG.TEXT_WIDTH_ESTIMATE = 5;
                window.CONFIG.AXIS_TICKS = 5; // fewer x-axis ticks to avoid overlap
                window.CONFIG.FIXED_VERTICAL_SPACING = 26; // increase spacing => taller SVG
            }
        } else {
            if (window.CONFIG) {
                window.CONFIG.GRID_TICKS = 10;
                window.CONFIG.LABEL_FONT_SIZE = '9px';
                window.CONFIG.TEXT_WIDTH_ESTIMATE = 6;
                window.CONFIG.AXIS_TICKS = 10;
                window.CONFIG.FIXED_VERTICAL_SPACING = 15;
            }
        }
    }

    document.addEventListener('DOMContentLoaded', () => {
        applyMobileTuning();
        // Apply tuning and re-render on resize so ticks/spacing update live
        // Use debouncing to prevent excessive calls during mobile scrolling
        let mobileResizeTimeout;
        window.addEventListener('resize', () => {
            clearTimeout(mobileResizeTimeout);
            mobileResizeTimeout = setTimeout(() => {
                applyMobileTuning();
                // resizePlot is already debounced in script.js, so we don't need to call it here
                // The resize event in script.js will handle it
            }, 150);
        });

        // Ensure initial render reflects mobile tuning when loading on a small screen
        if (window.app && typeof window.app.updatePlot === 'function') {
            window.app.updatePlot();
        }

        const plotSvg = document.getElementById('plot-svg');
        if (!plotSvg) return;

        // Intercept taps before D3 handlers to show tooltip instead of opening links
        const handler = (event) => {
            if (!isMobileLikeEvent(event)) return;
            const target = event.target;
            if (!target) return;

            // Accept taps on label-hover-area, text, circle, or any child within item-group
            const hoverArea = target.closest('.label-hover-area');
            const itemGroup = target.closest && target.closest('.item-group');
            if (!hoverArea && !itemGroup) return;

            // Avoid double-trigger with D3-managed tap targets/rects
            if (target.classList && (target.classList.contains('label-hover-area') || target.classList.contains('tap-target'))) {
                return; // let D3 handler manage it
            }

            event.preventDefault();
            event.stopPropagation();

            try {
                const node = hoverArea || itemGroup;
                const datum = d3.select(node).datum();
                if (datum && window.app && typeof window.app.showTooltip === 'function') {
                    window.app.showTooltip(event, datum);
                }
            } catch (_) {
                // no-op
            }
        };
        plotSvg.addEventListener('pointerup', handler, { capture: true });
        plotSvg.addEventListener('click', handler, { capture: true });
    });
})();


