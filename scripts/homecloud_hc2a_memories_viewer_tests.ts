import fs from 'node:fs';
import path from 'node:path';
import {
  MEMORY_DRAG_IDLE, armMemoryDrag, beginMemoryDrag, resolveMemoryRectangleIds, stepMemoryDrag,
  type MemoryGridPosition,
} from '../front/mi-front-limpio/services/homecloud/homecloudMemoryDrag';

let failed = 0;
function check(value: boolean, label: string) { if (!value) { failed += 1; console.error(`FAIL: ${label}`); } else console.log(`PASS: ${label}`); }
function ids(values: readonly string[]) { return values.slice().sort().join(','); }
const grid = new Map<string, MemoryGridPosition>([
  ['A',{visualRowOrdinal:0,column:0}],['B',{visualRowOrdinal:0,column:1}],['C',{visualRowOrdinal:0,column:2}],
  ['D',{visualRowOrdinal:1,column:0}],['E',{visualRowOrdinal:1,column:1}],['F',{visualRowOrdinal:1,column:2}],
  ['G',{visualRowOrdinal:2,column:0}],['H',{visualRowOrdinal:2,column:1}],['I',{visualRowOrdinal:2,column:2}],
]);
check(ids(resolveMemoryRectangleIds(grid.get('A')!,grid.get('H')!,grid)) === 'A,B,D,E,G,H', 'D4 A to H is rectangular');
check(ids(resolveMemoryRectangleIds(grid.get('A')!,grid.get('I')!,grid)) === 'A,B,C,D,E,F,G,H,I', 'D4 A to I fills rectangle');
check(ids(resolveMemoryRectangleIds(grid.get('B')!,grid.get('H')!,grid)) === 'B,E,H', 'D4 B to H preserves columns');
check(ids(resolveMemoryRectangleIds(grid.get('H')!,grid.get('A')!,grid)) === 'A,B,D,E,G,H', 'D4 reverse is symmetric');
const begun = beginMemoryDrag(armMemoryDrag(MEMORY_DRAG_IDLE), 'A', () => false, grid, new Set(['Z']));
const wide = stepMemoryDrag(begun, 'H', grid); const narrow = stepMemoryDrag(wide.state, 'E', grid);
check(wide.step.kind === 'range' && ids(wide.step.contentIds) === 'A,B,D,E,G,H', 'D4 emits current range');
check(narrow.step.kind === 'range' && ids(narrow.step.contentIds) === 'A,B,D,E', 'D4 reversal shrinks instead of painting');
const root = process.cwd(); const read=(file:string)=>fs.readFileSync(path.join(root,file),'utf8'); const code=(file:string)=>read(file).replace(/\/\*[\s\S]*?\*\//g,'').replace(/\/\/[^\n]*/g,'');
const rail=code('front/mi-front-limpio/components/homecloud/AlbumsRail.tsx'); const albumCopy=read('front/mi-front-limpio/services/homecloud/homecloudAlbumScope.ts'); const selectable=read('front/mi-front-limpio/components/homecloud/MemorySelectableCard.tsx'); const viewer=read('front/mi-front-limpio/components/homecloud/MemoryViewer.tsx');
check(rail.includes('Crear álbum') && albumCopy.includes('Todavía no hay álbumes') && !rail.includes('if (!canOrganize) return null'), 'D5 keeps honest organizer and view-only empty states');
check(selectable.includes('onOpen') && selectable.includes('if (!selecting)'), 'normal tap opens only outside selection');
check(viewer.includes('pagingEnabled') && viewer.includes('getMemoryOriginalUrl') && viewer.includes('written'), 'Viewer has pager, original image access and written detail');
if (failed) process.exitCode = 1;
