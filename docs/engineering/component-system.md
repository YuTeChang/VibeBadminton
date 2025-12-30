# Component System & Design Tokens

## Overview

This document describes the centralized component system and design tokens used throughout the VibeBadminton app. The system is designed to:

1. **Centralize styling** - All design decisions live in one place
2. **Enable flexibility** - Easy to override or extend when needed
3. **Maintain consistency** - Same components = same look everywhere
4. **Support evolution** - Change the design system without touching every page

## Architecture

### Base UI Components (`components/ui/`)

Reusable, styled components that encapsulate the design system:

- **Button** - Primary, secondary, ghost, danger variants
- **Card** - Default, elevated, outlined variants
- **Input** - Form inputs with labels and error states
- **Select** - Dropdown selects with labels and error states
- **Page** - Page wrapper with background and container
- **Container** - Content container with max-width
- **Section** - Section wrapper with spacing
- **Heading** - Typography component (h1-h6)
- **Text** - Typography component with variants

### Layout Components

- **Page** - Full page wrapper (`min-h-screen`, background)
- **Container** - Content container (max-width, padding)
- **Section** - Section spacing wrapper

### Design Tokens

Defined in `tailwind.config.ts`:

```typescript
japandi: {
  background: { primary, card }
  accent: { primary, hover }
  text: { primary, secondary, muted }
  border: { light }
}
```

### Utility Classes

Defined in `app/globals.css` using Tailwind's `@layer components`:

- `.btn-base`, `.btn-primary`, `.btn-secondary`
- `.card-base`
- `.input-base`
- `.page-container`
- `.content-container`

## Usage Patterns

### Pattern 1: Use Base Components (Recommended)

```tsx
import { Button, Card, Input, Page, Heading } from '@/components/ui';

export default function MyPage() {
  return (
    <Page>
      <Heading level={1}>My Page</Heading>
      <Card>
        <Input label="Name" />
        <Button variant="primary">Submit</Button>
      </Card>
    </Page>
  );
}
```

### Pattern 2: Use Utility Classes (For Custom Components)

```tsx
export default function CustomComponent() {
  return (
    <div className="page-container">
      <div className="content-container">
        <div className="card-base p-6">
          <button className="btn-primary">Click</button>
        </div>
      </div>
    </div>
  );
}
```

### Pattern 3: Extend Base Components (For Flexibility)

```tsx
import { Button } from '@/components/ui';
import { cn } from '@/lib/utils';

export default function CustomButton() {
  return (
    <Button 
      variant="primary" 
      className={cn("custom-class", "another-class")}
    >
      Custom Button
    </Button>
  );
}
```

## Component Variants

### Button Variants

- `primary` - Camel accent, white text, shadow
- `secondary` - Card background, border, hover effect
- `ghost` - Transparent, hover background
- `danger` - For destructive actions

### Card Variants

- `default` - Shadow + border
- `elevated` - Shadow only
- `outlined` - Border only

### Text Variants

- `primary` - Main text color
- `secondary` - Secondary text color
- `muted` - Muted text color

## Best Practices

### ✅ DO

1. **Use base components** for common UI patterns
2. **Extend with className** when you need custom styling
3. **Use design tokens** (japandi colors) directly in Tailwind classes
4. **Create new base components** for repeated patterns
5. **Document variants** when adding new ones

### ❌ DON'T

1. **Don't duplicate styles** - Use components or utilities
2. **Don't hardcode colors** - Use design tokens
3. **Don't create one-off components** - Extract to base if reused
4. **Don't override base styles globally** - Use className prop

## Migration Guide

When updating existing components:

1. Replace hardcoded styles with base components
2. Use design tokens instead of color values
3. Use layout components for page structure
4. Keep custom styling in className when needed

## Future Enhancements

- [ ] Add more base components (Badge, Alert, Modal, etc.)
- [ ] Add animation utilities
- [ ] Add responsive breakpoint utilities
- [ ] Add dark mode support (if needed)
- [ ] Add component composition patterns

