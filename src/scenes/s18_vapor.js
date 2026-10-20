import { basePalette, placeholder } from './_placeholder.js';

export default {
  id: 's18',
  number: 18,
  cn: '蒸汽波',
  en: 'Vaporwave',
  year: '2010s',
  motif: 'pyramid',
  palette: basePalette({
    bg: '#2b1b4d', bg2: '#3b2270', motif: '#ff6fb5', accent: '#61e8e1',
    ink: '#120a24', titleInk: '#ffe8f7', scrim: '#0d0618', ground: '#241441',
    road: '#35205c', dash: '#8ff2ea', body: '#f7d8ef', beak: '#ff8a5c',
    rigInk: '#160b2a',
  }),
  draw(g, ctx) {
    placeholder(g, ctx, this);
  },
};
