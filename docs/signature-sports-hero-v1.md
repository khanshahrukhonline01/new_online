# KhelGrid Signature Sports Hero — V1 Product and Engineering Specification

**Status:** Design direction approved for future implementation; video asset and final browser verification are not yet complete.  
**Applies to:** KhelGrid Platform homepage and future design iterations.  
**Owner:** Homepage / frontend foundation.

## 1. Product intent

Create a distinctive, reusable “KhelGrid Sports Universe” hero: a cinematic, short sports montage that communicates the breadth of sports discovery, athlete opportunities, and places to play. This is a brand/promotional visual, not a live sports broadcast or a live-score feed.

Keep the existing KhelGrid brand, headline, navigation, and calls to action as accessible HTML elements layered over the media. Do not bake text, logos, or buttons into the video.

## 2. Recommended experience

- Use an approximately 8–12 second loop with a visually coherent transition back to the opening.
- Show a diverse mix of sports relevant to KhelGrid, such as football, cricket, athletics, and tennis. Expand the mix as the product evolves.
- Use the existing navy-and-green visual identity and restrained cinematic lighting; avoid effects that reduce text contrast.
- Keep the headline and primary actions readable at all times.
- Use only original, properly licensed, or otherwise authorized footage and imagery. Record provenance and license/permission details for each asset.
- Never imply that promotional footage represents a live match or real-time sports data.

## 3. Media delivery and performance

- Preferred experience: muted autoplay, looping video with `playsInline`; no audio is required.
- Provide a compressed poster image as the initial visual and fallback if playback is unavailable.
- Consider MP4 (H.264) as the broad-compatibility baseline and WebM where useful after browser testing.
- Optimize encoding, resolution, and bitrate; avoid delaying the page's main content or blocking primary interaction.
- Use responsive positioning/cropping and test the focal subject at desktop, tablet, and narrow mobile widths.
- Consider a lighter mobile rendition only if measurements show it materially improves performance.
- Do not preload large media unnecessarily; use a poster and appropriate loading strategy.
- Respect `prefers-reduced-motion`: show the poster instead of automatically playing motion when the user requests reduced motion. Provide a pause/stop control if the final interaction or motion duration makes it necessary.
- Ensure captions or equivalent text are provided if any meaningful spoken content is ever introduced. Decorative, silent footage should not convey essential information unavailable elsewhere.

## 4. Asset organization and reuse

Keep the source media, poster, and any alternative encodings in a clearly named, version-controlled asset location (for example, `public/assets/hero/`) when repository size and licensing allow. For large source masters, document the approved hosting location and keep generated delivery files optimized. Use descriptive filenames and document attribution, source, license, and any expiration/usage restrictions.

The hero should be reusable across future homepage versions and selected promotional surfaces without duplicating implementation. Keep the media source configurable rather than hardcoding it in multiple components.

## 5. Accessibility and resilience

- Keep text contrast sufficient over every frame; use a stable overlay or gradient where needed.
- Preserve semantic headings, keyboard access, visible focus, and accessible names for controls.
- Ensure the hero remains useful with autoplay disabled, media blocked, or a slow connection.
- Avoid flashing transitions and rapid cuts.
- Never rely on video alone to communicate navigation, opportunities, venue information, or other essential content.

## 6. Acceptance checklist

Before calling the hero complete, verify and record actual results for:

- [ ] Footage rights and attribution are documented.
- [ ] Poster loads correctly before video playback.
- [ ] Muted looping playback works on supported desktop and mobile browsers.
- [ ] Reduced-motion preference disables automatic motion.
- [ ] Fallback works when video fails or is unsupported.
- [ ] Headline and calls to action remain legible at all responsive breakpoints.
- [ ] No horizontal overflow or important subject cropping on mobile.
- [ ] Performance is measured on a throttled/slow connection and media does not block primary content.
- [ ] Existing navigation, links, and page behavior remain intact.
- [ ] Typecheck, lint, tests, and production build pass.
- [ ] Vercel preview is visually checked on desktop and mobile; untested devices are explicitly marked “not tested.”

## 7. Current implementation status

This document records the chosen direction and requirements; it does not assert that the video asset has been integrated or that these checks have passed. The current homepage hero work is tracked separately in PR #90. Integrate the approved asset and complete the checklist before merging the visual change.
