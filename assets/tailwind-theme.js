tailwind.config = {
    darkMode: "class",
    theme: {
        extend: {
            "colors": {
                "on-tertiary": "#313030",
                "surface-container-high": "#292a2a",
                "surface-variant": "#343535",
                "on-tertiary-fixed-variant": "#474646",
                "on-secondary-fixed": "#1c1b1b",
                "inverse-surface": "#e3e2e2",
                "secondary-fixed-dim": "#c8c6c5",
                "secondary": "#c8c6c5",
                "surface-container-lowest": "#0d0e0f",
                "secondary-fixed": "#e5e2e1",
                "primary-container": "#ff544b",
                "tertiary": "#c8c6c5",
                "on-surface-variant": "#e7bcb8",
                "surface": "#0a0a0c",
                "on-primary-fixed-variant": "#93000c",
                "surface-dim": "#050505",
                "primary": "#ff2a4b",
                "on-primary-container": "#5c0005",
                "error-container": "#93000a",
                "secondary-container": "#2a2a2c",
                "on-error-container": "#ffdad6",
                "surface-bright": "#1a1a1c",
                "tertiary-container": "#4a4a4c",
                "on-error": "#690005",
                "background": "#050505",
                "on-secondary": "#313030",
                "on-surface": "#e3e2e2",
                "error": "#ffb4ab",
                "on-secondary-fixed-variant": "#474746",
                "on-primary-fixed": "#410002",
                "primary-fixed": "#ffdad6",
                "tertiary-fixed": "#e5e2e1",
                "primary-fixed-dim": "#ffb4ab",
                "inverse-primary": "#c00014",
                "surface-tint": "#ffb4ab",
                "surface-container-highest": "#343535",
                "surface-container": "#1a1a1a", /* Border color */
                "on-primary": "#000000", /* Text on primary */
                "on-background": "#e3e2e2",
                "outline-variant": "#1a1a1a",
                "inverse-on-surface": "#2f3131",
                "outline": "#1a1a1a",
                "surface-container-low": "#1a1c1c",
                "tertiary-fixed-dim": "#c8c6c5",
                "on-tertiary-fixed": "#1c1b1b",
                "on-secondary-container": "#b7b5b4",
                "on-tertiary-container": "#2a2a29"
            },
            "borderRadius": {
                "DEFAULT": "0.75rem",
                "md": "0.5rem",
                "lg": "1rem",
                "xl": "1.5rem",
                "full": "9999px"
            },
            "spacing": {
                "gutter": "24px",
                "section-gap": "80px",
                "margin-mobile": "16px",
                "unit": "4px",
                "container-max": "1280px"
            },
            "fontFamily": {
                "code-sm": ["JetBrains Mono", "monospace"],
                "label-mono": ["JetBrains Mono", "monospace"],
                "headline-md-mobile": ["Inter", "sans-serif"],
                "body-base": ["JetBrains Mono", "monospace"],
                "display-lg": ["Inter", "sans-serif"],
                "headline-md": ["Inter", "sans-serif"]
            },
            "fontSize": {
                "code-sm": ["12px", { "lineHeight": "1.5", "fontWeight": "400" }],
                "label-mono": ["14px", { "lineHeight": "1.4", "letterSpacing": "0.05em", "fontWeight": "500" }],
                "headline-md-mobile": ["24px", { "lineHeight": "1.2", "fontWeight": "600" }],
                "body-base": ["14px", { "lineHeight": "1.6", "fontWeight": "400" }],
                "display-lg": ["56px", { "lineHeight": "1.1", "letterSpacing": "-0.02em", "fontWeight": "700" }],
                "headline-md": ["32px", { "lineHeight": "1.2", "fontWeight": "600" }]
            }
        }
    }
}

// Page Transition Logic
document.addEventListener('DOMContentLoaded', () => {
    // We bind to document to capture all clicks
    document.addEventListener('click', (e) => {
        // Find closest anchor tag
        const link = e.target.closest('a');
        
        // If it's a valid local link (not external, not new tab, not an anchor link)
        if (
            link && 
            link.href && 
            link.host === window.location.host && 
            link.target !== '_blank' &&
            !link.hasAttribute('download') &&
            !link.href.includes('#') &&
            !link.href.startsWith('javascript:')
        ) {
            e.preventDefault();
            const targetUrl = link.href;
            
            // Add exiting animation class
            document.body.classList.add('page-exiting');
            
            // Wait for animation to finish before navigating (0.3s matches CSS)
            setTimeout(() => {
                window.location.href = targetUrl;
            }, 300);
        }
    });
});
