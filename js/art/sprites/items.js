// Items and props, all original designs:
// the Info Block (a terminal prompt >_ instead of any "?" block), bits
// (hex tokens), coffee (one-hit shield), the debug duck, signs.

import { compileMap, outline, frame, sheet } from '../sprite.js';

const BLOCK_LEGEND = {
  o: 'ink.0', c: 'indigo.3', b: 'indigo.2', a: 'indigo.1', d: 'indigo.0',
  x: '#0f1430', t: 'teal.3', u: 'teal.2',
};

const INFO_ON = `
oooooooooooooooo
occcccccccccccbo
ocbbbbbbbbbbbbao
ocbxxxxxxxxxxbao
ocbxxxxxxxxxxbao
ocbxtxxxxxxxxbao
ocbxxtxxxxxxxbao
ocbxxxtxxxxxxbao
ocbxxtxxxxxxxbao
ocbxtxxxuuuxxbao
ocbxxxxxxxxxxbao
ocbxxxxxxxxxxbao
ocbbbbbbbbbbbbao
obaaaaaaaaaaaado
oadddddddddddddo
oooooooooooooooo`;
const INFO_OFF = INFO_ON.replace('ocbxtxxxuuuxxbao', 'ocbxtxxxxxxxxbao');

const USED = `
oooooooooooooooo
occcccccccccccbo
ocbbbbbbbbbbbbao
ocbaaaaaaaaaabao
ocbaaaaaaaaavbao
ocbaaaaaaaavvbao
ocbavaaaaavvabao
ocbavvaaavvaabao
ocbaavvavvaaabao
ocbaaavvvaaaabao
ocbaaaavaaaaabao
ocbaaaaaaaaaabao
ocbbbbbbbbbbbbao
obaaaaaaaaaaaado
oadddddddddddddo
oooooooooooooooo`;
const USED_LEGEND = { o: 'ink.0', c: 'slate.3', b: 'slate.2', a: 'slate.1', d: 'slate.0', v: 'green.2' };

const BIT = [`
..aaaa..
.abccba.
abccbbba
abcbbbba
abbbbbaa
abbbbaaa
.abbaaa.
..aaaa..`, `
...aa...
..abba..
..acba..
..abba..
..abba..
..abaa..
..abaa..
...aa...`, `
...aa...
...ba...
...ca...
...ba...
...ba...
...ba...
...ba...
...aa...`];
const BIT_LEGEND = { a: 'gold.1', b: 'gold.2', c: 'gold.3' };

const COFFEE = [`
...s..s....
..s..s.....
...s..s....
.wwwwwwww..
.wccccccw..
.Wwwwwwwwhh
.Wttttttw.h
.Wttttttwhh
.Wwwwwwww..
..Wwwwww...`, `
..s..s.....
...s..s....
..s..s.....
.wwwwwwww..
.wccccccw..
.Wwwwwwwwhh
.Wttttttw.h
.Wttttttwhh
.Wwwwwwww..
..Wwwwww...`];
const COFFEE_LEGEND = { s: 'white.0', w: 'white.2', W: 'white.1', c: 'wood.1', t: 'teal.2', h: 'white.1' };

const DUCK = [`
....yyyy....
...yYYyyy...
...yYyyeyoo.
...yyyyyyooo
....yyyyy...
.y..yyyyyy..
.yyyyYYYyyy.
.yyYYYyyyyyd
..yyyyyyyyd.
...dddddd...`, `
............
....yyyy....
...yYYyyy...
...yYyyeyoo.
...yyyyyyooo
.y..yyyyy...
.yyyyYYYyyy.
.yyYYYyyyyyd
..yyyyyyyyd.
...dddddd...`];
const DUCK_LEGEND = { y: 'duck.2', Y: 'duck.3', d: 'duck.1', o: 'orange.2', e: 'ink.0' };

const SIGN = `
oooooooooooooooo
oSSSSSSSSSSSSSSo
oSxxxxxxxxxxxxdo
oSxttttttxxxxxdo
oSxxxxxxxxxxxxdo
oSxtttttttttxxdo
oSxxxxxxxxxxxxdo
oSxttttxxxxxxxdo
oSxxxxxxxxxxxxdo
oddddddddddddddo
oooooooppooooooo
.......pq.......
.......pq.......
.......pq.......
.......pq.......
......oppqo.....`;
const SIGN_LEGEND = { o: 'ink.0', S: 'steel.4', d: 'steel.2', x: '#0f1430', t: 'teal.3', p: 'steel.3', q: 'steel.1' };

const FLOPPY = `
aaaaaaaaaaa
assssssaaba
asssxssaaba
assssssaaba
aaaaaaaaaaa
awwwwwwwwwa
awttwwtwwwa
awwwwwwwwwa
awttttwwwwa
aaaaaaaaaaa`;
const FLOPPY_LEGEND = { a: 'indigo.2', s: 'steel.4', x: 'steel.1', b: 'indigo.3', w: 'white.2', t: 'indigo.1' };

export function buildItems() {
  return {
    info: [
      frame(compileMap(INFO_ON, BLOCK_LEGEND, 'info')),
      frame(compileMap(INFO_OFF, BLOCK_LEGEND, 'info-off')),
    ],
    used: frame(compileMap(USED, USED_LEGEND, 'used')),
    bit: sheet(BIT, BIT_LEGEND, { name: 'bit' }),
    coffee: sheet(COFFEE, COFFEE_LEGEND, { name: 'coffee' }),
    duck: sheet(DUCK, DUCK_LEGEND, { name: 'duck' }),
    sign: frame(compileMap(SIGN, SIGN_LEGEND, 'sign')),
    floppy: frame(outline(compileMap(FLOPPY, FLOPPY_LEGEND, 'floppy'), 'ink.0')),
  };
}
