// HOME · Shrey's room in Dublin, CA. The tutorial: move, jump onto the
// desk, hit the >_ block from below, then take the floor port out to the map.

export default {
  id: 'home',
  node: 'home',
  title: "Shrey's Room",
  sub: 'Dublin, CA',
  theme: 'home',
  kit: 'home',
  music: 'map',
  goal: null,
  safe: true,                       // no enemies, no pits, no deaths
  start: 'main',
  rooms: {
    main: {
      camera: 'fixed',
      map: [
        '..............................',
        '..............................',
        '..............................',
        '..............................',
        '..................F...........',
        '..............................',
        '..............................',
        '..............................',
        '................======........',
        '........................P.....',
        '..@........N..................',
        '##############################',
        '##############################',
        '##############################',
      ],
      facts: { F: ['p-name'] },
      duck: ['Psst: press R anytime for the full résumé.'],
      ports: [{ to: '@map' }],
      hints: [
        { tx: 4, ty: 7, keys: '← → to move', touch: '◀ ▶ to move' },
        { tx: 16, ty: 6, keys: '↑ to jump', touch: 'A to jump' },
        { tx: 18.5, ty: 2, keys: 'Hit >_ from below', touch: 'Hit >_ from below' },
        { tx: 25, ty: 7, keys: 'Stand here, press ↓', touch: 'Stand here, press ▼' },
      ],
    },
  },
};
