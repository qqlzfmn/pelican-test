import { basePalette, placeholder } from './_placeholder.js';

export default {
  id: 's20',
  number: 20,
  cn: '代码美学',
  en: 'Code Aesthetic',
  year: '2020s · 大模型时代',
  motif: 'grid',
  palette: basePalette({
    bg: '#0d1117', bg2: '#111823', motif: '#58a6ff', accent: '#7ee787',
    ink: '#c9d1d9', titleInk: '#e6edf3', scrim: '#000000', ground: '#0a0f16',
    road: '#131b26', dash: '#58a6ff', body: '#e6edf3', beak: '#ffa657',
    rigInk: '#0b0f14',
  }),
  draw(g, ctx) {
    placeholder(g, ctx, this);
  },
};
