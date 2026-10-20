import { basePalette, placeholder } from './_placeholder.js';

export default {
  id: 's06',
  number: 6,
  cn: '清明上河图',
  en: 'Along the River During Qingming',
  year: '约1100',
  motif: 'arch',
  palette: basePalette({
    bg: '#e8ddc4', bg2: '#d8c9aa', motif: '#5e6b52', accent: '#a84b32',
    ink: '#31332a', ground: '#c9b995', road: '#b8a57e', dash: '#f4e9cf',
    body: '#f8f0dd', beak: '#b56c35', rigInk: '#252620',
  }),
  draw(g, ctx) {
    placeholder(g, ctx, this);
  },
};
