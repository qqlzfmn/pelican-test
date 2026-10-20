import { basePalette, placeholder } from './_placeholder.js';

export default {
  id: 's19',
  number: 19,
  cn: '竖屏短视频',
  en: 'Vertical Video',
  year: '2020s',
  motif: 'disc',
  palette: basePalette({
    bg: '#f2f2f4', bg2: '#e4e4e9', motif: '#ff375f', accent: '#ff375f',
    ink: '#16161a', ground: '#dadade', road: '#c9c9cf', dash: '#ffffff',
    body: '#ffffff', beak: '#ff8a3d', rigInk: '#16161a',
  }),
  draw(g, ctx) {
    placeholder(g, ctx, this);
  },
};
