import { basePalette, placeholder } from './_placeholder.js';

export default {
  id: 's14',
  number: 14,
  cn: '诺斯费拉图',
  en: 'Nosferatu',
  year: '1922',
  motif: 'arch',
  palette: basePalette({
    bg: '#151312', bg2: '#211d19', motif: '#6f6555', accent: '#a89672',
    ink: '#e8ddc4', titleInk: '#e9dec6', scrim: '#000000', ground: '#1c1916',
    road: '#26221d', dash: '#8f8069', body: '#d8cdb8', beak: '#a18455',
    rigInk: '#080706',
  }),
  draw(g, ctx) {
    placeholder(g, ctx, this);
  },
};
