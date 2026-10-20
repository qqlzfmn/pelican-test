# Third-party notices

This project is an original work. It uses the following third-party software.

## p5.js 2.3.4

- License: LGPL-2.1
- Source: https://github.com/processing/p5.js
- Vendored file: `public/vendor/p5.min.js`
- License text: `public/vendor/LICENSE-p5.txt`
- Installed via npm as `p5@2.3.4`; the minified library is copied into
  `public/vendor/` so the film renders offline.

## p5.brush 2.2.3 (evaluated, not used)

- License: MIT
- Source: https://github.com/acamposuribe/p5.brush
- Not vendored and not imported. It requires a WEBGL canvas; phase 1 uses a
  seeded 2D brush kit. If it is added to the ink scenes later, its MIT notice
  will be copied here and its license file vendored alongside it.

## puppeteer 25.15.0

- License: Apache-2.0
- Used only as a development dependency for frame capture and contact sheets.
- Chrome for Testing is downloaded by Puppeteer and is not redistributed here.

## ffmpeg

- License: LGPL/GPL depending on build
- Used as an external tool to encode the rendered frames. Not bundled.

## Fonts

No font files are bundled. The visuals use fonts installed on the machine
(Songti SC, STSong, Helvetica Neue, Bodoni 72, Didot) with generic serif/sans
fallbacks. Those fonts are not redistributed. If the film is rendered on another
machine, install equivalent open fonts and update the stacks in
`src/kit/cards.js` and `src/scenes/_placeholder.js`.

## Historical works

All referenced artworks are in the public domain. No images of them are used;
every mark is generated procedurally. Software, game, chat and video-app
interfaces are fictional and original, with no real logos, mascots or sounds.
