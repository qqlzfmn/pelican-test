import { basePalette, placeholder } from './_placeholder.js';

export default {
  id: 's03',
  number: 3,
  cn: '汉画像石拓片',
  en: 'Han Stone Rubbing',
  year: '约100',
  motif: 'grid',
  palette: basePalette({
    bg: '#181614', bg2: '#221f1b', motif: '#e6ded0', accent: '#c9c0ae',
    ink: '#0e0d0b', titleInk: '#efe8da', scrim: '#000000', ground: '#26231f',
    road: '#302c27', dash: '#d8cfbd', body: '#ded4c0', beak: '#cfc5b0',
    rigInk: '#0b0a09',
  }),
  draw(g, ctx) {
    placeholder(g, ctx, this);
  },
};
