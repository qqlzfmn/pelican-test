import { basePalette, placeholder } from './_placeholder.js';

export default {
  id: 's07',
  number: 7,
  cn: '玛雅抄本',
  en: 'Maya Codex',
  year: '约1200',
  motif: 'squares',
  palette: basePalette({
    bg: '#a8492f', bg2: '#8c3926', motif: '#f0d7a2', accent: '#e5b95f',
    ink: '#341710', titleInk: '#f4dfb1', ground: '#7c3020', road: '#6a2619',
    dash: '#e8c98c', body: '#f1dcc0', beak: '#d49a42', rigInk: '#2a120c',
  }),
  draw(g, ctx) {
    placeholder(g, ctx, this);
  },
};
