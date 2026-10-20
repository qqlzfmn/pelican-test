import { basePalette, placeholder } from './_placeholder.js';

export default {
  id: 's05',
  number: 5,
  cn: '宋代山水',
  en: 'Song Landscape',
  year: '约1000 · 溪山行旅',
  motif: 'pyramid',
  palette: basePalette({
    bg: '#d9dcd6', bg2: '#c3cbc7', motif: '#3c4a48', accent: '#8b7f63',
    ink: '#26302e', ground: '#b3b9ae', road: '#9ba49c', dash: '#eef0e8',
    body: '#f4f2e8', beak: '#b98a4c', rigInk: '#1f2826',
  }),
  draw(g, ctx) {
    placeholder(g, ctx, this);
  },
};
