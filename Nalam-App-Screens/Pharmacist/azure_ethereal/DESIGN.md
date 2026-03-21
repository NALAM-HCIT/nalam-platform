# Azure Ethereal Design System

### 1. Overview & Creative North Star
**Creative North Star: "The Clinical Sanctuary"**
Azure Ethereal is designed to transform the high-stress environment of healthcare into a space of digital serenity. It moves away from the sterile, rigid layouts of traditional medical software toward an editorial, "breathable" interface. By utilizing high-transparency glass layers and a soft blue-to-white gradient, the system prioritizes psychological comfort and clarity. It breaks the grid through floating, frosted containers and oversized iconography, creating a sense of weightlessness and modern sophistication.

### 2. Colors
The palette is rooted in medical trust (`#1A73E8`) but softened by an ethereal background architecture.
- **Surface Hierarchy & Nesting:** Hierarchy is built through transparency rather than solid fills. The background transitions from `surface` (#F0F7FF) to `surface_bright` (#FFFFFF). Interactive modules use `surface_container` (70% opacity white) to lift content from the background.
- **The "No-Line" Rule:** Sectioning is achieved through the transition of backdrop blurs and subtle background shifts. 1px solid borders are strictly prohibited for structural layout; use tonal depth instead.
- **The "Glass & Gradient" Rule:** All elevated components (cards, floating logos) must utilize a backdrop blur (12px to 16px).
- **Signature Textures:** Primary CTAs use a 180-degree linear gradient from #257DF1 to #1A73E8, providing a tactile, "clickable" depth.

### 3. Typography
The system uses **Inter** exclusively to maintain a clean, technical yet humanistic feel. 
- **Display/Headline:** Utilizes `3rem` (48px) with `font-extrabold` and tight tracking to create a dominant brand anchor.
- **Titles:** `1.25rem` (20px) semi-bold for secondary greetings, providing a clear entry point.
- **Body:** `1rem` (16px) for main interactions and `1.125rem` (18px) for sub-headers.
- **Labels:** `0.875rem` (14px) with `font-light` and increased tracking (`0.05em`) to create a sophisticated, editorial "caption" feel.
The typographic rhythm relies on high contrast between massive, bold headings and light, airy subtext.

### 4. Elevation & Depth
Depth is expressed through "Luminous Layering" rather than harsh shadows.
- **The Layering Principle:** Stack `surface_container_low` (Logo) on top of the main gradient, and `surface_container` (Main Card) for user input areas.
- **Ambient Shadows:** The system uses two specific shadow tiers:
    - *Tier 1 (Focus):* `0 4px 12px rgba(26, 115, 232, 0.25)` for buttons to make them feel pressurized and interactive.
    - *Tier 2 (Presence):* Large, diffused shadows (`shadow-2xl`) using a tinted blue base (`blue-900/5`) to ground glass elements without adding "dirt."
- **Glassmorphism:** Elements must include `backdrop-filter: blur(16px)` and a semi-transparent white border (`rgba(255, 255, 255, 0.5)`) to simulate physical glass edges.

### 5. Components
- **Buttons:**
    - *Primary:* Rounded-full (pill-shaped), using the `btn-gradient`. Must include an inner white 1px highlight `inset 0 1px 0 rgba(255,255,255,0.15)`.
    - *Secondary:* Transparent with a `1.5px` border in `outline` color. Subtle hover state transition to 50% blue tint.
- **Glass Cards:** Large `1.5rem` (24px) corner radius. Padding is generous (`2rem` / 32px) to maintain the "Editorial" feel.
- **Icons:** Use Material Symbols Outlined. Primary icons in branding should be oversized (`text-8xl`) and housed within a glass container.
- **Input Fields:** Should mimic the "Doctor/Staff" button style—refined outlines, high roundedness, and clear, light-weight labels.

### 6. Do's and Don'ts
- **Do:** Use large amounts of whitespace (Spacing Level 3) to reduce cognitive load.
- **Do:** Use soft blue radial blurs in the background to create focal points.
- **Don't:** Use solid grey colors for text; always use a navy-tinted slate (`midnight` #0B1B3D or `slate-500`) to maintain the blue-spectrum harmony.
- **Don't:** Use sharp corners. The minimum radius is `1rem`, with the standard being `1.5rem` for large containers.
- **Don't:** Overlap text on busy background areas without a glass container for legibility.