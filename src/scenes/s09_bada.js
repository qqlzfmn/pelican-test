import { basePalette, placeholder } from './_placeholder.js';

export default {
  id: 's09',
  number: 9,
  cn: '八大山人写意',
  en: 'Bada Shanren, Expressionist Ink',
  year: '约1690',
  motif: 'blob',
  palette: basePalette({
    bg: '#eee9de', bg2: '#e3ddd0', motif: '#2a2823', accent: '#857e6e',
    ink: '#23211d', ground: '#d6cfc0', road: '#c3baa8', dash: '#f5f0e4',
    body: '#fbf7ee', beak: '#b9a98c', rigInk: '#181612',
  }),
  draw(g, ctx) {
    placeholder(g, ctx, this);
  },
};
