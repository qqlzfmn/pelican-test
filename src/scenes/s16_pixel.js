import { basePalette, placeholder } from './_placeholder.js';

export default {
  id: 's16',
  number: 16,
  cn: '8-bit 像素游戏',
  en: '8-Bit Arcade',
  year: '1980s',
  motif: 'squares',
  palette: basePalette({
    bg: '#101a38', bg2: '#182752', motif: '#e7438d', accent: '#4de1ff',
    ink: '#0a0f22', titleInk: '#eaf7ff', scrim: '#000000', ground: '#0c1630',
    road: '#14204a', dash: '#f7d94c', body: '#f2f4f8', beak: '#f7a531',
    rigInk: '#0a0e18',
  }),
  draw(g, ctx) {
    placeholder(g, ctx, this);
  },
};
