# Vidor Design System

Notion-inspired design system with blue gradient accents for Vidor video conferencing.

## 🎨 Design Principles

1. **Clarity** - Clean, readable interfaces with generous whitespace
2. **Simplicity** - Minimal visual noise, focus on content
3. **Consistency** - Unified components and patterns
4. **Accessibility** - WCAG 2.1 AA compliant colors and interactions

## 🎨 Color Palette

### Background Colors

| Token | Light Mode | Dark Mode | Usage |
|-------|------------|-----------|-------|
| `--color-bg-primary` | `#ffffff` | `#1a1a1a` | Main background |
| `--color-bg-secondary` | `#f8f9fa` | `#2a2a2a` | Cards, panels |
| `--color-bg-tertiary` | `#eff0f1` | `#333333` | Inputs, borders |
| `--color-bg-hover` | `#e8e9ea` | `#3a3a3a` | Hover states |

### Text Colors

| Token | Light Mode | Dark Mode | Usage |
|-------|------------|-----------|-------|
| `--color-text-primary` | `#111827` | `#f9fafb` | Headings, body |
| `--color-text-secondary` | `#6b7280` | `#9ca3af` | Subtitles, meta |
| `--color-text-tertiary` | `#9ca3af` | `#6b7280` | Placeholders |
| `--color-text-inverse` | `#ffffff` | `#ffffff` | On dark bg |

### Accent Colors (Blue)

| Token | Value | Usage |
|-------|-------|-------|
| `--color-accent-50` | `#eff6ff` | Light backgrounds |
| `--color-accent-100` | `#dbeafe` | Hover states |
| `--color-accent-500` | `#3b82f6` | Primary actions |
| `--color-accent-600` | `#2563eb` | Brand color |
| `--color-accent-700` | `#1d4ed8` | Active states |

### Gradient

```css
/* Primary Blue Gradient */
--gradient-blue: linear-gradient(135deg, #2563EB 0%, #0EA5E9 50%, #06B6D4 100%);

/* Hover State */
--gradient-blue-hover: linear-gradient(135deg, #1d4ed8 0%, #0284c7 50%, #0891b2 100%);

/* Subtle Background */
--gradient-blue-subtle: linear-gradient(135deg, rgba(37, 99, 235, 0.1) 0%, rgba(14, 165, 233, 0.1) 50%, rgba(6, 182, 212, 0.1) 100%);
```

## 📐 Spacing

Based on 4px grid system:

```
4px    (0.25rem)  --space-1
8px    (0.5rem)   --space-2
12px   (0.75rem)  --space-3
16px   (1rem)     --space-4
20px   (1.25rem)  --space-5
24px   (1.5rem)   --space-6
32px   (2rem)     --space-8
40px   (2.5rem)   --space-10
48px   (3rem)     --space-12
64px   (4rem)     --space-16
```

## 🔤 Typography

### Font Family

```css
--font-sans: 'Inter', system-ui, -apple-system, sans-serif;
--font-mono: 'SF Mono', 'Fira Code', monospace;
```

### Font Sizes

| Name | Size | Line Height | Usage |
|------|------|-------------|-------|
| xs | 0.75rem (12px) | 1rem | Captions, labels |
| sm | 0.875rem (14px) | 1.25rem | Small text |
| base | 1rem (16px) | 1.5rem | Body text |
| lg | 1.125rem (18px) | 1.75rem | Lead text |
| xl | 1.25rem (20px) | 1.75rem | H4 |
| 2xl | 1.5rem (24px) | 2rem | H3 |
| 3xl | 1.875rem (30px) | 2.25rem | H2 |
| 4xl | 2.25rem (36px) | 2.5rem | H1 |

### Font Weights

```
400 - Normal
500 - Medium
600 - Semibold
700 - Bold
```

## 🎭 Shadows

Notion-style soft, diffused shadows:

```css
--shadow-xs: 0 1px 2px rgba(0, 0, 0, 0.03);
--shadow-sm: 0 1px 3px rgba(0, 0, 0, 0.05), 0 1px 2px rgba(0, 0, 0, 0.03);
--shadow-md: 0 4px 6px rgba(0, 0, 0, 0.05), 0 10px 15px rgba(0, 0, 0, 0.03);
--shadow-lg: 0 10px 15px rgba(0, 0, 0, 0.05), 0 20px 25px rgba(0, 0, 0, 0.04);
--shadow-xl: 0 20px 25px rgba(0, 0, 0, 0.05), 0 40px 50px rgba(0, 0, 0, 0.04);
--shadow-glow: 0 0 20px rgba(37, 99, 235, 0.3);
```

## 🔲 Border Radius

```
--radius-sm: 6px    (small buttons, badges)
--radius-md: 8px    (cards, inputs)
--radius-lg: 12px   (modals, large cards)
--radius-xl: 16px   (featured elements)
--radius-full: 9999px (avatars, pills)
```

## 🎬 Animations

### Duration

```
--transition-fast: 100ms
--transition-base: 150ms
--transition-slow: 200ms
--transition-slower: 300ms
```

### Easing

```
cubic-bezier(0.4, 0, 0.2, 1)  - Default
cubic-bezier(0, 0, 0.2, 1)    - Ease out
cubic-bezier(0.4, 0, 1, 1)    - Ease in
```

### Keyframe Animations

- `fade-in` - Fade in from opacity 0
- `fade-out` - Fade out to opacity 0
- `slide-up` - Slide up 10px while fading in
- `slide-down` - Slide down 10px while fading in
- `slide-in-from-bottom` - Slide up 20px while fading in
- `slide-in-from-top` - Slide down 20px while fading in
- `zoom-in` - Scale from 0.95 to 1 while fading in
- `zoom-out` - Scale from 1 to 0.95 while fading out

## 🧩 Components

### Buttons

```tsx
// Primary (Gradient)
<button className="btn btn-primary">Click Me</button>

// Secondary (Outline)
<button className="btn btn-secondary">Cancel</button>

// Ghost (Text only)
<button className="btn btn-ghost">Learn More</button>

// Sizes
<button className="btn btn-primary btn-sm">Small</button>
<button className="btn btn-primary btn-lg">Large</button>
```

### Cards

```tsx
// Basic Card
<div className="card p-6">Content</div>

// Hover Effect
<div className="card card-hover p-6">Hoverable</div>

// Clickable
<div className="card card-clickable p-6">Clickable</div>
```

### Inputs

```tsx
<input className="input" placeholder="Enter text..." />

// With error
<input className="input input-error" placeholder="Invalid input" />
```

### Badges

```tsx
<Badge variant="primary">New</Badge>
<Badge variant="success">Active</Badge>
<Badge variant="warning">Pending</Badge>
<Badge variant="danger">Error</Badge>
<Badge variant="neutral">Info</Badge>
```

### Avatars

```tsx
<Avatar name="John Doe" size="md" />
<Avatar name="Jane Smith" src="/avatar.jpg" showStatus isOnline />
```

### Modals

```tsx
<Modal isOpen={open} onClose={setOpen} title="Settings">
  <p>Modal content here...</p>
</Modal>
```

### Toasts

```tsx
const { info, success, warning, error } = useToastActions()

success('Settings saved!', 'Success')
error('Failed to connect', 'Error')
```

### Dropdowns

```tsx
<Dropdown
  trigger={<button>Menu</button>}
  align="right"
>
  <DropdownHeader>Options</DropdownHeader>
  <DropdownItem icon={<SettingsIcon />}>Settings</DropdownItem>
  <DropdownDivider />
  <DropdownItem destructive>Delete</DropdownItem>
</Dropdown>
```

## 📱 Responsive Breakpoints

```
sm: 640px   (mobile landscape)
md: 768px   (tablet)
lg: 1024px  (laptop)
xl: 1280px  (desktop)
2xl: 1536px (large desktop)
```

## ♿ Accessibility

### Color Contrast

All text meets WCAG 2.1 AA requirements:
- Normal text: 4.5:1 minimum
- Large text: 3:1 minimum

### Focus States

```css
:focus-visible {
  outline: none;
  ring: 2px solid var(--color-accent-500);
  ring-offset: 2px;
}
```

### ARIA Labels

All interactive elements include appropriate ARIA labels:

```tsx
<button aria-label="Close modal">
  <svg>...</svg>
</button>
```

## 🎨 Dark Mode

Enable dark mode by adding `dark` class to html:

```tsx
<html className="dark">
```

Or use the ThemeContext:

```tsx
const { theme, toggleTheme } = useTheme()
```

## 📦 CSS Variables

All design tokens are available as CSS variables for runtime customization:

```css
:root {
  --color-bg-primary: #ffffff;
  --color-text-primary: #111827;
  /* ... all other tokens */
}
```

## 🚀 Usage Examples

### Landing Page Hero

```tsx
<section className="py-24 bg-bg-primary">
  <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
    <h1 className="text-5xl font-bold text-text-primary mb-6">
      <span className="gradient-text">Crystal-Clear</span> Conferencing
    </h1>
    <p className="text-xl text-text-secondary max-w-2xl mx-auto mb-8">
      Experience seamless video meetings with AI-powered transcription
    </p>
    <button className="btn btn-primary btn-lg px-8">
      Start a Meeting
    </button>
  </div>
</section>
```

### Video Card

```tsx
<div className="video-container group">
  <video ref={videoRef} autoPlay playsInline muted />
  <div className="absolute bottom-3 left-3 px-2 py-1 bg-black/50 backdrop-blur-sm rounded text-white text-sm">
    {participant.name}
  </div>
  <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
    <span className="px-2 py-1 bg-black/50 backdrop-blur-sm rounded text-white text-xs">
      HD
    </span>
  </div>
</div>
```

### Control Bar

```tsx
<div className="h-20 bg-bg-primary border-t border-border-primary flex items-center justify-center px-4">
  <div className="flex items-center space-x-3">
    <button className="control-btn control-btn-inactive">
      <MicIcon />
    </button>
    <button className="control-btn control-btn-active">
      <VideoIcon />
    </button>
    <button className="control-btn control-btn-danger">
      <PhoneHangupIcon />
    </button>
  </div>
</div>
```

---

**Vidor Design System** - Built with ❤️ for modern web conferencing
