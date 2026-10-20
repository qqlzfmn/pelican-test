import { basePalette, placeholder } from './_placeholder.js';

export default {
  id: 's17',
  number: 17,
  cn: '早期聊天窗口',
  en: 'Early Chat Client',
  year: '2000s',
  motif: 'grid',
  palette: basePalette({
    bg: '#dfe7ee', bg2: '#cbd8e4', motif: '#4f7ea8', accent: '#2f76b5',
    ink: '#26313b', ground: '#c6d3df', road: '#b1c2d2', dash: '#f4f8fb',
    body: '#ffffff', beak: '#e0923c', rigInk: '#202a33',
  }),
  draw(g, ctx) {
    placeholder(g, ctx, this);
  },
};
