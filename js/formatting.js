// Universal Scales - Number Formatting Utilities

class NumberFormatter {
    constructor(notationMode) {
        this.notationMode = notationMode;
    }
    
    setNotationMode(mode) {
        this.notationMode = mode;
    }
    
    formatNumber(value, precision = 0, forTooltip = false) {
        if (value === 0) return '0';
        
        const absValue = Math.abs(value);
        const sign = value < 0 ? '-' : '';
        
        switch (this.notationMode) {
            case 'scientific':
                // Use d3 format for scientific notation
                return d3.format(`.${precision}e`)(value);
            
            case 'mathematical':
                // Format as 1×10^10 or 1×10⁻¹⁰
                const exponent = Math.floor(Math.log10(absValue));
                const mantissa = absValue / Math.pow(10, exponent);
                
                // Round mantissa to appropriate precision
                const roundedMantissa = Math.round(mantissa * Math.pow(10, precision)) / Math.pow(10, precision);
                
                if (forTooltip) {
                    // For tooltips and buttons, return HTML with superscripts
                    return this.formatMathematicalHTML(sign, roundedMantissa, exponent);
                } else {
                    // For axes, return a special format that we'll process into SVG tspan elements
                    // Format: "mantissa×10|exponent" where | is a delimiter
                    return `${sign}${roundedMantissa}×10|${exponent}`;
                }
            
            case 'human':
                // Format as human-readable numbers (billion, million, etc.)
                return this.formatHumanReadable(value, precision);
            
            default:
                return d3.format(`.${precision}e`)(value);
        }
    }
    
    formatMathematicalHTML(sign, mantissa, exponent) {
        // Format as HTML with superscript: 1×10<sup>-22</sup>
        const exponentStr = exponent.toString();
        return `${sign}${mantissa}×10<sup>${exponentStr}</sup>`;
    }
    
    formatHumanReadable(value, precision = 2) {
        if (value === 0) return '0';
        
        const absValue = Math.abs(value);
        const sign = value < 0 ? '-' : '';
        
        // For very small numbers (< 0.001), use scientific notation format (e.g., 1.5e-10)
        if (absValue < 0.001 && absValue > 0) {
            return d3.format(`.${precision}e`)(value);
        }
        
        // For very large numbers (> 1e15), use scientific notation format (e.g., 1.5e15)
        if (absValue >= 1e15) {
            return d3.format(`.${precision}e`)(value);
        }
        
        // Define thresholds and labels for human-readable format
        const units = [
            { value: 1e12, label: 'T' }, // Trillion
            { value: 1e9, label: 'B' },  // Billion
            { value: 1e6, label: 'M' },   // Million
            { value: 1e3, label: 'K' },  // Thousand
            { value: 1, label: '' }
        ];
        
        // Find appropriate unit
        let unit = units[units.length - 1];
        for (let i = 0; i < units.length; i++) {
            if (absValue >= units[i].value) {
                unit = units[i];
                break;
            }
        }
        
        // Format with unit
        const scaledValue = absValue / unit.value;
        const roundedValue = Math.round(scaledValue * Math.pow(10, precision)) / Math.pow(10, precision);
        
        // Remove trailing zeros, but keep at least one digit after decimal if precision > 0
        let formatted;
        if (precision > 0) {
            formatted = roundedValue.toFixed(precision).replace(/\.?0+$/, '');
            // Ensure at least one decimal place for values < 1
            if (absValue < 1 && !formatted.includes('.')) {
                formatted = roundedValue.toFixed(1);
            }
        } else {
            formatted = Math.round(scaledValue).toString();
        }
        
        return `${sign}${formatted}${unit.label}`;
    }
    
    processMathematicalLabels(axis) {
        // Process all text elements in the axis to convert mathematical notation
        // from "mantissa×10|exponent" format to proper SVG with tspan superscripts
        axis.selectAll('text').each(function() {
            const textElement = d3.select(this);
            const originalText = textElement.text();
            
            // Check if this is a mathematical notation label (contains "|")
            if (originalText.includes('|')) {
                const parts = originalText.split('|');
                if (parts.length === 2) {
                    const base = parts[0];
                    const exponent = parts[1];
                    
                    // Clear the text content
                    textElement.text('');
                    
                    // Add the base text
                    textElement.append('tspan')
                        .text(base);
                    
                    // Add the exponent as a superscript tspan
                    const isNegative = exponent.startsWith('-');
                    const expValue = isNegative ? exponent.substring(1) : exponent;
                    
                    // Combine negative sign and exponent digits in one tspan for proper alignment
                    const exponentText = isNegative ? `-${expValue}` : expValue;
                    textElement.append('tspan')
                        .attr('baseline-shift', 'super')
                        .attr('font-size', '0.7em')
                        .text(exponentText);
                }
            }
        });
    }
}

