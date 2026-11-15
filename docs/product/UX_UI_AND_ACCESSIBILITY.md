# UX/UI, Responsive Design and Accessibility

**Status:** Draft baseline

## Design principles
Use KhelGrid's established navy/green identity, consistent typography and spacing, clear hierarchy, and reusable components. Avoid fake counters, sample listings presented as current, deceptive badges, or controls that do nothing.

## Responsive behaviour
Design for narrow mobile screens first. Navigation, search, cards, forms, footer links and tables must remain usable without horizontal page overflow. Ensure visible focus, touch-friendly controls and sensible content order.

## Accessibility baseline
Target WCAG 2.2 AA as a project goal, subject to audit. Use semantic landmarks/headings, accessible names, keyboard-operable navigation, visible focus, sufficient contrast, reduced-motion support, labelled errors and status announcements. Do not use colour alone to convey status.

## Required UI states
For asynchronous content, show loading, ready, empty, unconfigured and unavailable/error states as appropriate. Provide retry where safe. Distinguish “no records” from “service unavailable.”

## Content and media
Use licensed, owned, or permissioned media. Provide meaningful alternative text; decorative imagery uses empty alt text. Avoid hotlinking assets without permission or stability guarantees.

## Acceptance
Test keyboard-only operation, mobile layouts, zoom/reflow, contrast, accessible names, focus order and representative screen-reader output. Record known gaps before release.