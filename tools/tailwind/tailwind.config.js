/** Tailwind v3.4.x (la misma familia que servia el CDN), ahora compilado en css/tailwind.css.
 *  Escanea index.html y js/**. Si agregas clases armadas dinamicamente, p. ej. `text-${color}-400`,
 *  anade las posibles a `safelist` (Tailwind solo ve clases escritas completas en el codigo). */
module.exports = {
  content: { relative: true, files: ['../../index.html', '../../js/**/*.js'] },
  safelist: [
    // js/modules/32-chat-calendario-planes.js: color segun el autor del mensaje
    'text-cyan-400', 'text-slate-400', 'text-orange-400',
    'bg-cyan-900/40', 'bg-slate-900/40',
    'border-cyan-500/20', 'border-slate-500/20',
  ],
};
