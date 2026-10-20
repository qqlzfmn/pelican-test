import { basePalette, placeholder } from './_placeholder.js';

export default {
  id: 's08',
  number: 8,
  cn: '莫卧儿细密画',
  en: 'Mughal Miniature',
  year: '约1600',
  motif: 'arch',
  palette: basePalette({
    bg: '#efe0c2', bg2: '#e0cca4', motif: '#2f6b4e', accent: '#b78a33',
    ink: '#2a2418', ground: '#d3bd91', road: '#bda578', dash: '#f7e9c8',
    body: '#f9f0d8', beak: '#c1903a', rigInk: '#27200f',
  }),
  draw(g, ctx) {
    placeholder(g, ctx, this);
  },
};
