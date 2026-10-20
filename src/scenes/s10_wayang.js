import { basePalette, placeholder } from './_placeholder.js';

export default {
  id: 's10',
  number: 10,
  cn: '爪哇皮影戏',
  en: 'Wayang Kulit',
  year: '约1800',
  motif: 'grid',
  palette: basePalette({
    bg: '#191a26', bg2: '#232338', motif: '#d99a3e', accent: '#e0b05a',
    ink: '#f2d99f', titleInk: '#f6e2b4', scrim: '#000000', ground: '#151622',
    road: '#202132', dash: '#c79a4c', body: '#e6c98a', beak: '#cf9b42',
    rigInk: '#0d0d17',
  }),
  draw(g, ctx) {
    placeholder(g, ctx, this);
  },
};
