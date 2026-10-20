import { basePalette, placeholder } from './_placeholder.js';

export default {
  id: 's11',
  number: 11,
  cn: '浮世绘',
  en: 'Ukiyo-e',
  year: '1830s · 东海道',
  motif: 'waves',
  palette: basePalette({
    bg: '#e7ddc7', bg2: '#d3c4a7', motif: '#254b6b', accent: '#b4452c',
    ink: '#1f2b38', ground: '#c5b18d', road: '#ad9771', dash: '#f2e7ce',
    body: '#f6eedb', beak: '#c07a35', rigInk: '#1b232e',
  }),
  draw(g, ctx) {
    placeholder(g, ctx, this);
  },
};
