import { basePalette, placeholder } from './_placeholder.js';

export default {
  id: 's01',
  number: 1,
  cn: '撒哈拉岩画',
  en: 'Saharan Rock Art',
  year: '约前4000 · 塔西里',
  motif: 'disc',
  palette: basePalette({
    bg: '#d9a45e', bg2: '#c48843', motif: '#8d3f20', accent: '#f6e2b8',
    ink: '#3a1e11', titleInk: '#2f1a0e', ground: '#b97b3c', road: '#a86a32',
    dash: '#f1d9a5', body: '#f6ead1', beak: '#b4552b', rigInk: '#2a160c',
  }),
  draw(g, ctx) {
    placeholder(g, ctx, this);
  },
};
