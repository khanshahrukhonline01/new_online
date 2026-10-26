# KhelGrid sport icon assets

The local SVG sprite for the development frontend lives at `public/assets/sports/sport-icons.svg`.

A typed React component and lookup manifest live at `src/shared/sports/sportIcons.tsx`.

## Use

```tsx
import { SportIcon } from '../../shared/sports/sportIcons'

<SportIcon name="Cricket" size={40} />
<SportIcon name="table-tennis" size={32} title="Table tennis" />
```

## Current coverage

Football, cricket, basketball, tennis, badminton, volleyball, hockey, athletics, swimming, boxing, cycling, chess, table tennis, golf, rugby, gymnastics, handball, rowing, weightlifting, wrestling, karate, taekwondo, skating, kabaddi, futsal, pickleball, squash, shooting, yoga and martial arts.

## Maintenance

- Add a new `symbol` to the sprite and a matching ID/label to `sportIconManifest`.
- Keep names lowercase kebab-case and add common aliases only when useful.
- These are local SVG assets; no remote image service or runtime request to an icon vendor is required.
- Pictograms currently use Unicode emoji glyphs inside consistent SVG tiles, so the glyph artwork may vary by operating system. Replace with custom vector paths if exact cross-platform pictogram rendering becomes a requirement.
- The list is a practical starter catalogue, not a claim of exhaustive worldwide sport coverage.
