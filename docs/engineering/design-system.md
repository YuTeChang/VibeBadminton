# Japandi / Scandi Minimal UI – Design Style Guide

> **Purpose:** This document defines the *visual style only* (colors, typography, shapes, layout, mood).

> It should be applied to **all screens, components, and states** in the app, regardless of features.

---

## 1. Overall Concept

* Visual style: **Japandi / Scandinavian minimalist and modern**.

* Mood: **Calm, cozy, airy**, like a **minimalist Japandi living room translated into UI**.

* The interface should feel:

  * Warm instead of clinical,

  * Simple instead of busy,

  * Confident but not loud.

> Think: soft sunlight on wood floors, clean white walls, a few well-chosen objects – not a cluttered dashboard.

---

## 2. Color System

### Backgrounds

* Main app background: **warm off-white**

  * `#F7F2EA` (can vary slightly but must stay warm, not blue/gray).

* Use extremely subtle gradients or overlapping abstract shapes (slightly darker beiges) for depth, never harsh patterns.

### Primary Accent

* **Warm wood / camel** for key actions and highlights.

  * Approx `#D3A676` (stay within a small range).

* Use for:

  * Primary buttons

  * Key icons / indicators

  * Progress bars / important highlights

* Use **sparingly** – most of the UI should still be off-white and beige.

### Neutrals & Text

* Text color: near-black or very dark warm gray

  * Headings/body: `#222` or similar.

* Secondary text: warm gray-brown (muted).

* Borders & dividers (when needed): very light warm gray with low contrast.

### Avoid

* No bright primary colors (no pure red, neon blue, etc.).

* No full-color photographs as core UI; if used, they must be desaturated and subtle.

* No strong gradients or rainbow effects.

---

## 3. Typography

* Typeface: **clean, soft sans-serif**, similar to *Inter*, *SF Pro*, or *Nunito*.

* Headings:

  * Large, bold or semibold.

  * Plenty of line height (1.2–1.4).

* Body text:

  * Light or regular weight.

  * Minimum 16px on web, larger on mobile.

  * Comfortable line height (1.4–1.6).

**Tone:**

* Language should be simple and friendly, not overly technical.

* Prefer short phrases over long sentences.

---

## 4. Shapes, Cards, and Components

### Cards

* Card background: slightly darker off-white than the page.

* Corner radius: **16–24 px**.

* Soft shadows:

  * Very subtle, just enough to separate from background.

  * No harsh, dark outlines.

### Buttons

* Primary button:

  * Fill: camel / warm wood color.

  * Text: white or very light.

  * Rounded corners (pill or at least 12px radius).

  * Slight shadow to lift it from the surface.

* Secondary button:

  * Either outline or ghost style:

    * Border in warm gray, text in dark gray.

  * Same rounded shape and padding as primary.

### Chips / Pills

* Used for small filters or labels (e.g., "Street & errands").

* Rounded-pill shape, minimal border.

* Selected state uses camel fill or a subtle background tint.

### Icons

* Simple **line icons**, minimal detail.

* Single-color strokes, matching text color or accent color.

* No heavy 3D, gradients, or complex illustration styles.

---

## 5. Layout & Spacing

* **Wide margins** and generous internal spacing.

* Each screen should contain **few elements per section** – nothing should feel cramped.

* Use a clear hierarchy:

  * 1 big headline

  * 1–2 CTA buttons

  * 1 supporting section (cards, list, or stats)

* Vertical rhythm:

  * More space between sections than between elements *within* a section.

### Responsive behavior

* Mobile-first:

  * Single column layout.

  * Cards stacked vertically with full-width, rounded edges.

* Larger screens:

  * Introduce 2-column layouts for hero sections and dashboards.

  * Maintain plenty of whitespace on left/right.

---

## 6. Imagery & Vibe

* Visual references: **Japandi living rooms**, **soft light on wood**, simple abstract art.

* If backgrounds include shapes:

  * Large, soft-edged blobs/rounded rectangles in pale beige.

  * Very low contrast; they should never compete with text.

* No realistic wood textures in main components.

  * Wood is expressed through **color**, not photo textures.

---

## 7. Motion & Micro-Interactions (Optional, if implemented)

* Motion should be:

  * Subtle, smooth, and slow-ish.

  * Fades and gentle slides, not bounces.

* Examples:

  * Buttons slightly darken and lift on hover.

  * Cards fade in and slide up gently on first load.

---

## 8. Do / Don't Summary

### Do

* Use warm off-white (`#F7F2EA`) as the primary canvas.

* Use camel/wood accent sparingly for primary actions.

* Keep typography big, legible, and airy.

* Use rounded cards with soft shadows.

* Maintain lots of whitespace and visual breathing room.

### Don't

* Don't introduce bright, saturated accent colors.

* Don't use harsh borders or sharp corners.

* Don't add heavy wood textures or skeuomorphic elements.

* Don't overload a single screen with too many components or dense tables.

---

## 9. Tailwind CSS Implementation

### Color Palette

```javascript
// Add to tailwind.config.ts
colors: {
  background: {
    primary: '#F7F2EA',    // Warm off-white
    card: '#F9F5F0',        // Slightly darker off-white for cards
  },
  accent: {
    primary: '#D3A676',    // Warm wood / camel
    hover: '#C49666',       // Slightly darker for hover states
  },
  text: {
    primary: '#222222',     // Near-black
    secondary: '#6B5D4F',   // Warm gray-brown
    muted: '#9B8E7F',       // Muted warm gray
  },
  border: {
    light: '#E8E0D5',       // Very light warm gray
  },
}
```

### Typography

```javascript
fontFamily: {
  sans: ['Inter', 'SF Pro Display', 'Nunito', 'system-ui', 'sans-serif'],
},
fontSize: {
  // Ensure minimum 16px for body text
  base: ['16px', { lineHeight: '1.6' }],
  lg: ['18px', { lineHeight: '1.5' }],
  xl: ['20px', { lineHeight: '1.4' }],
  // ... larger sizes for headings
},
```

### Component Examples

**Card:**
```tsx
<div className="bg-background-card rounded-2xl p-6 shadow-sm">
  {/* content */}
</div>
```

**Primary Button:**
```tsx
<button className="bg-accent-primary text-white rounded-full px-6 py-3 shadow-sm hover:bg-accent-hover transition-colors">
  {/* text */}
</button>
```

**Secondary Button:**
```tsx
<button className="border border-border-light text-text-primary rounded-full px-6 py-3 hover:bg-background-card transition-colors">
  {/* text */}
</button>
```

---

## 10. AI Designer Prompt

When working with AI assistants (Cursor Designer, etc.), use this prompt:

> You are a UI/UX designer and front-end helper.
>
> Always follow the **design style guide** in `docs/engineering/design-system.md` when creating layouts, components, or CSS/Tailwind for this project.
>
> **Design Style Guide (Japandi / Scandinavian Minimal):**
>
> [Reference the full style doc above]
>
> Requirements for all designs you produce:
>
> 1. Strictly use the defined color system (warm off-white background, camel/wood accent, neutral warm grays).
> 2. Use clean, soft sans-serif type with generous line height; keep text sizes readable and airy.
> 3. Use rounded cards (16–24 px radius) with subtle shadows; no sharp corners and no strong borders.
> 4. Maintain lots of whitespace and simple layouts with few elements per section.
> 5. Avoid bright, saturated colors, heavy textures, and skeuomorphic wood; express warmth through flat color and spacing.
>
> When I ask you to design a page or component (e.g., "create a landing page hero," "make a session summary card," "show a form for logging games"), you must:
>
> * Respect the style guide above.
> * Explain briefly how the layout and styling choices match this Japandi / Scandi minimal aesthetic.
> * Generate HTML/CSS or React/Tailwind code that visually aligns with this system.

