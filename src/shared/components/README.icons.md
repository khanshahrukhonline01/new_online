# Functional icon system

- `src/shared/components/SiteIcon.tsx`: local lightweight inline SVG icon component and typed icon-name registry for navigation, search, filtering, dates, locations, status, profile, documents, media, booking, payments, settings and support actions.
- `src/shared/components/Sidebar.tsx`: navigation now uses consistent SVG icons for Home, Sports, Opportunities, Venues and Sports CV.
- `public/assets/sports/sport-icons.svg` and `src/shared/sports/sportIcons.tsx`: sport-specific pictograms remain separate from functional UI icons.

Example: `<SiteIcon name="calendar-check" size={18} />`

Use icons alongside visible text for actions; icon-only controls must have an accessible name. Do not imply unsupported functionality (for example, a payment icon does not mean payments are enabled). Functional icons are decorative SVGs with `aria-hidden`; surrounding controls provide accessible names.
