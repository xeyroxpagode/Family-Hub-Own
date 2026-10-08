import fs from 'node:fs';
import path from 'node:path';
import {
  MEMORY_DRAG_IDLE, applyMemoryVisualRange, armMemoryDrag, beginMemoryDrag, resolveMemoryVisualRangeIds, stepMemoryDrag,
} from '../front/mi-front-limpio/services/homecloud/homecloudMemoryDrag';

let failed = 0;
function check(value: boolean, label: string) { if (!value) { failed += 1; console.error(`FAIL: ${label}`); } else console.log(`PASS: ${label}`); }
function ids(values: readonly string[]) { return values.slice().sort().join(','); }
const visualOrder = ['1', '2', '3', '4', '5', '6']; // rendered as 1 2 3 / 4 / 5 6
check(resolveMemoryVisualRangeIds('1', '4', visualOrder).join() === '1,2,3,4', 'D4 incomplete row 1 to 4 follows contiguous visual order');
check(resolveMemoryVisualRangeIds('2', '5', visualOrder).join() === '2,3,4,5', 'D4 2 to 5 follows contiguous visual order');
check(resolveMemoryVisualRangeIds('5', '2', visualOrder).join() === '2,3,4,5', 'D4 bottom-to-top range is symmetric');
const begun = beginMemoryDrag(armMemoryDrag(MEMORY_DRAG_IDLE), '1', () => false, visualOrder, new Set(['6']));
const wide = stepMemoryDrag(begun, '5', visualOrder); const narrow = stepMemoryDrag(wide.state, '2', visualOrder);
check(wide.step.kind === 'range' && wide.step.contentIds.join() === '1,2,3,4,5', 'D4 emits the current contiguous range');
check(narrow.step.kind === 'range' && narrow.step.contentIds.join() === '1,2', 'D4 reversal shrinks instead of painting');
check(ids([...applyMemoryVisualRange(new Set(['6']), ['1','2','3','4','5'], 'select')]) === '1,2,3,4,5,6', 'D4 select applies current range to baseline');
check(ids([...applyMemoryVisualRange(new Set(visualOrder), ['2','3','4','5'], 'deselect')]) === '1,6', 'D4 deselect removes current range from baseline');
const root = process.cwd(); const read=(file:string)=>fs.readFileSync(path.join(root,file),'utf8'); const code=(file:string)=>read(file).replace(/\/\*[\s\S]*?\*\//g,'').replace(/\/\/[^\n]*/g,'');
const rail=code('front/mi-front-limpio/components/homecloud/AlbumsRail.tsx'); const albumCopy=read('front/mi-front-limpio/services/homecloud/homecloudAlbumScope.ts'); const selectable=read('front/mi-front-limpio/components/homecloud/MemorySelectableCard.tsx'); const viewer=read('front/mi-front-limpio/components/homecloud/MemoryViewer.tsx');
check(rail.includes('Nuevo álbum') && rail.includes('FavoritesTile') && albumCopy.includes('Todavía no hay álbumes') && !rail.includes('if (!canOrganize) return null'), 'D5 keeps honest organizer and view-only empty states');
check(selectable.includes('onOpen') && selectable.includes('if (!selecting)'), 'normal tap opens only outside selection');
check(viewer.includes('pagingEnabled') && viewer.includes('getMemoryOriginalUrl') && viewer.includes('written'), 'Viewer has pager, original image access and written detail');
if (failed) process.exitCode = 1;
