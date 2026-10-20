import { basePalette, placeholder } from './_placeholder.js';

export default {
  id: 's02',
  number: 2,
  cn: '埃及壁画',
  en: 'Egyptian Tomb Painting',
  year: '约前1300',
  motif: 'squares',
  palette: basePalette({
    bg: '#d8c49c', bg2: '#c9b083', motif: '#2e6f6a', accent: '#a8792b',
    ink: '#242d27', titleInk: '#1d2723', ground: '#c1a776', road: '#ae9260',
    dash: '#f0e3c0', body: '#f4e7c9', beak: '#b98127', rigInk: '#20261f',
  }),
  draw(g, ctx) {
    placeholder(g, ctx, this);
  },
};
