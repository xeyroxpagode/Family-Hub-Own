'use strict';
const test=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs');const path=require('node:path');
const root=path.resolve(__dirname,'..');const read=file=>fs.readFileSync(path.join(root,file),'utf8');
const more=read('front/mi-front-limpio/screens/MoreScreen.tsx');
const navigator=read('front/mi-front-limpio/navigation/HomeTabNavigator.tsx');
const app=read('front/mi-front-limpio/App.tsx');

function devBlockInMore(source){
  const start=source.indexOf('{__DEV__ ? (');
  assert.ok(start>=0,'MoreScreen renders the QA bridge behind a __DEV__ conditional');
  let depth=0;let index=source.indexOf('(',start);
  for(;index<source.length;index++){
    if(source[index]==='(')depth+=1;
    if(source[index]===')'){depth-=1;if(depth===0)break;}
  }
  assert.ok(depth===0,'the QA bridge conditional is balanced');
  return {block:source.slice(start,index+1),without:source.slice(0,start)+source.slice(index+1)};
}

function stripComments(source){
  return source
    .replace(/\/\*[\s\S]*?\*\//g,'')
    .replace(/(^|\s)\/\/[^\n]*/g,'$1');
}

function effectInMore(source){
  const start=source.indexOf('React.useEffect(');
  assert.ok(start>=0,'MoreScreen installs the dev automation hook through React.useEffect');
  const open=source.indexOf('{',start);
  let depth=0;
  for(let index=open;index<source.length;index++){
    if(source[index]==='{')depth+=1;
    if(source[index]==='}'){depth-=1;if(depth===0)return source.slice(start,index+1);}
  }
  throw new Error('the dev automation hook effect is not balanced');
}

test('MoreScreen exposes QA / Desarrollo and Inventario V2 only under __DEV__',()=>{
  const {block,without}=devBlockInMore(more);
  assert.ok(block.includes('QA / Desarrollo'),'the QA section heading lives in the dev gate');
  assert.ok(block.includes('Inventario V2'),'the QA row label lives in the dev gate');
  assert.ok(block.includes('Preview de Productos y Compras'),'the QA row description lives in the dev gate');
  assert.ok(block.includes("navigation.navigate('InventoryV2Preview')"),'the QA row navigates to InventoryV2Preview');
  assert.ok(block.includes('accessibilityLabel'),'the QA row declares an accessibility label');
  assert.ok(!without.includes('QA / Desarrollo'),'production never renders the QA heading');
  assert.ok(!without.includes('Inventario V2'),'production never renders the QA row');
  assert.ok(!block.includes('StatusBadge'),'the QA row does not reuse a production Demo badge');
});

test('the visible QA entry is NOT web-only',()=>{
  const {block}=devBlockInMore(more);
  assert.ok(!block.includes('Platform.OS'),'the visible QA entry is not gated by Platform.OS');
  assert.ok(!block.includes("Platform.OS === 'web'"),'the visible QA entry is not a web-only branch');
  assert.ok(!block.includes('window'),'the visible QA entry does not depend on any browser global');
  assert.match(more,/import \{[^}]*Platform[^}]*\} from 'react-native'/,'MoreScreen imports Platform from react-native');
});

test('the web automation hook is installed on web only',()=>{
  const effect=effectInMore(more);
  assert.match(effect,/if \(!__DEV__ \|\| Platform\.OS !== 'web'\)/,'the hook returns early unless it is a web dev build');
  const guard=effect.indexOf("Platform.OS !== 'web'");
  assert.ok(guard>=0,'the web guard exists');
  assert.ok(guard<effect.indexOf('__hpMoreDevNavigate'),'the guard runs before the hook is installed');
  assert.ok(guard<effect.indexOf('addEventListener'),'the guard runs before any browser listener is installed');
  assert.ok(guard<effect.indexOf('removeEventListener'),'the guard runs before any browser listener is removed');
  assert.match(effect,/globalThis\.addEventListener\('hashchange'/,'the web hook listens through a web-safe global');
  assert.match(effect,/globalThis\.removeEventListener\('hashchange'/,'the web hook removes its listener through a web-safe global');
});

test('no browser-only API is reachable from MoreScreen',()=>{
  const code=stripComments(more);
  assert.doesNotMatch(code,/\bwindow\s*\./,'MoreScreen never touches a browser-only global');
  assert.doesNotMatch(code,/\bdocument\s*\./,'MoreScreen never touches a browser-only document');
  assert.doesNotMatch(code,/\bglobal\./,'MoreScreen never uses `global` as the browser authority');
});

test('InventoryV2Preview is registered only in development',()=>{
  assert.match(navigator,/__DEV__ \? <MoreStack\.Screen name="InventoryV2Preview" component=\{InventoryV2StackScreen\} \/> : null/);
  assert.ok(!/^\s*<MoreStack\.Screen name="InventoryV2Preview"/m.test(navigator),'the preview screen has no unconditional registration');
  assert.match(app,/\.\.\.\(__DEV__\s*\?\s*\{ screens: \{ \.\.\.INVENTORY_V2_DEV_PREVIEW_MORE_SCREENS \} \}/,'the preview deep link is injected only under __DEV__');
});

test('Inventory V1 remains the production route',()=>{
  assert.match(more,/id: 'inventory'[\s\S]*?screen: 'Inventory' as const/,'More Inventory still points at the Inventory route');
  assert.match(navigator,/<MoreStack\.Screen name="Inventory" component=\{InventarioScreen\}/,'the Inventory route still resolves to InventarioScreen');
  assert.ok(!/name="Inventory" component=\{InventoryV2StackScreen\}/.test(navigator),'V2 is never mounted as the production Inventory route');
});

test('the mobile QA setup helper is reproducible and secret-free',()=>{
  const script=read('scripts/setup-inventory-mobile-qa.ps1');
  assert.ok(script.includes('supabase status -o env'),'the helper reads local credentials from the CLI');
  assert.ok(script.includes('SUPABASE_ANON_KEY'),'the helper merges backend anon key');
  assert.ok(script.includes('SUPABASE_SERVICE_ROLE_KEY'),'the helper merges backend service role key');
  assert.ok(script.includes('EXPO_PUBLIC_SUPABASE_URL'),'the helper configures the mobile Supabase URL');
  assert.doesNotMatch(script,/192\.168\.\d+\.\d+/,'the helper never hardcodes a LAN IP');
  assert.doesNotMatch(script,/eyJ[A-Za-z0-9_-]{10,}/,'the helper never hardcodes a JWT');
  assert.doesNotMatch(script,/sb_(publishable|secret)_[A-Za-z0-9_-]+/,'the helper never hardcodes Supabase keys');
});
