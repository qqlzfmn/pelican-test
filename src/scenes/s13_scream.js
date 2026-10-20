import { basePalette, placeholder } from './_placeholder.js';

export default {
  id: 's13',
  number: 13,
  cn: '呐喊',
  en: 'The Scream',
  year: '1893',
  motif: 'waves',
  palette: basePalette({
    bg: '#d4692e', bg2: '#b64925', motif: '#2c2f3a', accent: '#f0b35a',
    ink: '#24202a', titleInk: '#f7e3c4', ground: '#3b4152', road: '#2b303d',
    dash: '#e9b365', body: '#f0dcc0', beak: '#c76b32', rigInk: '#1d1a22',
  }),
  draw(g, ctx) {
    placeholder(g, ctx, this);
  },
};
