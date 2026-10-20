import { basePalette, placeholder } from './_placeholder.js';

export default {
  id: 's12',
  number: 12,
  cn: '星月夜',
  en: 'The Starry Night',
  year: '1889',
  motif: 'waves',
  palette: basePalette({
    bg: '#17294f', bg2: '#1f3a66', motif: '#e8c14f', accent: '#f2d46a',
    ink: '#0c1526', titleInk: '#f4e7bc', scrim: '#08101f', ground: '#1a3157',
    road: '#24406b', dash: '#f0d879', body: '#f2df9c', beak: '#dfa33f',
    rigInk: '#0a1222',
  }),
  draw(g, ctx) {
    placeholder(g, ctx, this);
  },
};
