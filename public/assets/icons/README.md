# KhelGrid SVG icon assets

Reusable, monochrome SVG symbols for the KhelGrid UI are collected in `khelgrid-icons.svg`. Icons use a consistent 24×24 viewBox, currentColor strokes, rounded line joins, and a default 1.8 stroke width.

## Included icons

Menu and navigation: `menu`, `close`, `home`, `chevron-down`, `chevron-left`, `chevron-right`, `arrow-up-right`, `external-link`.

Header and actions: `search`, `bell`, `settings`, `user`, `star`, `plus`, `calendar-check`, `more-horizontal`, `more-vertical`.

Sports and discovery: `trophy`, `calendar`, `map-pin`, `building`, `users`, `sport`, `activity`, `chart`, `filter`.

Content and utility: `bookmark`, `share`, `mail`, `phone`, `clock`, `check`, `alert-circle`, `info`, `upload`, `image`, `file-text`, `play`, `refresh`, `heart`, `message`, `help-circle`, `wallet`, `credit-card`, `shield-check`, `lock`.

## Usage

The sprite is an asset catalogue, while the existing React `SiteIcon` component remains the app's inline icon renderer. That keeps existing screens and accessibility behavior unchanged. For a sprite consumer, reference a symbol by its stable ID, for example:

```html
<svg aria-hidden="true" width="20" height="20">
  <use href="/assets/icons/khelgrid-icons.svg#settings"></use>
</svg>
```

Icons inherit the consuming element's `color`. Do not use these icons to imply functionality that is not implemented; notifications and login can remain marked as coming soon until backed by real services.
