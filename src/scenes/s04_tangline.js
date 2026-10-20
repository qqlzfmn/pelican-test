import { basePalette, placeholder } from './_placeholder.js';

export default {
  id: 's04',
  number: 4,
  cn: '唐代白描',
  en: 'Tang Line Drawing',
  year: '约750 · 吴带当风',
  motif: 'waves',
  palette: basePalette({
    bg: '#efe6d3', bg2: '#e3d6bd', motif: '#5b5146', accent: '#9c7b4f',
    ink: '#2b2722', ground: '#d3c3a6', road: '#bfae91', dash: '#f7edda',
    body: '#faf3e6', beak: '#c58a44', rigInk: '#2a241e',
  }),
  draw(g, ctx) {
    placeholder(g, ctx, this);
  },
};
