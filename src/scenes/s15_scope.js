import { basePalette, placeholder } from './_placeholder.js';

export default {
  id: 's15',
  number: 15,
  cn: '示波器矢量图',
  en: 'Oscilloscope Vector Display',
  year: '1950s',
  motif: 'grid',
  palette: basePalette({
    bg: '#020604', bg2: '#03100a', motif: '#42f59e', accent: '#7dffbf',
    ink: '#0a1a10', titleInk: '#8effc4', scrim: '#000000', ground: '#020a06',
    road: '#031108', dash: '#2adf8c', body: '#3aef9c', beak: '#6dffb5',
    rigInk: '#0b2a18',
  }),
  draw(g, ctx) {
    placeholder(g, ctx, this);
  },
};
