/**
 * HomeCloud Scanner B2 — projective four-corner rectification.
 *
 * Pure math + deterministic RGBA raster proof. The React Native production
 * boundary uses the same homography and sizing policy inside a local WebView
 * canvas, then persists the resulting JPEG in the app cache.
 */

import {
  MIN_CROP_EDGE_PX,
  isUsableSize,
  normalizedQuadToOrientedPixels,
  orientedSize,
  type Point,
  type Quad,
  type RotationSteps,
  type Size,
} from './homecloudScannerGeometry';

export interface Homography {
  readonly a: number;
  readonly b: number;
  readonly c: number;
  readonly d: number;
  readonly e: number;
  readonly f: number;
  readonly g: number;
  readonly h: number;
}

export interface PerspectiveOutputPlan {
  readonly status: 'ok';
  readonly sourceQuad: Quad;
  readonly outputSize: Size;
  readonly maxOutputSide: number;
  readonly homography: Homography;
  readonly inverseHomography: Homography;
}

export type PerspectivePlanFailure = 'unknown-source-size' | 'degenerate' | 'homography';

export type PerspectivePlanResult =
  | PerspectiveOutputPlan
  | { readonly status: 'invalid'; readonly reason: PerspectivePlanFailure; readonly message: string };

export const PERSPECTIVE_ERROR_MESSAGES: Readonly<Record<PerspectivePlanFailure, string>> = {
  'unknown-source-size': 'No pudimos leer las dimensiones de la imagen.',
  degenerate: 'El área seleccionada es demasiado pequeña.',
  homography: 'No pudimos corregir la perspectiva de esta selección.',
};

export const DEFAULT_MAX_OUTPUT_SIDE = 2200;
const HOMOGRAPHY_EPSILON = 1e-9;

function distance(a: Point, b: Point): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function derivePerspectiveOutputSize(
  quadPx: Quad,
  maxOutputSide: number = DEFAULT_MAX_OUTPUT_SIDE,
): Size {
  const top = distance(quadPx.topLeft, quadPx.topRight);
  const bottom = distance(quadPx.bottomLeft, quadPx.bottomRight);
  const left = distance(quadPx.topLeft, quadPx.bottomLeft);
  const right = distance(quadPx.topRight, quadPx.bottomRight);
  let width = Math.round(Math.max(top, bottom));
  let height = Math.round(Math.max(left, right));
  const longer = Math.max(width, height);
  if (longer > maxOutputSide) {
    const scale = maxOutputSide / longer;
    width = Math.round(width * scale);
    height = Math.round(height * scale);
  }
  return {
    width: clamp(width, MIN_CROP_EDGE_PX, maxOutputSide),
    height: clamp(height, MIN_CROP_EDGE_PX, maxOutputSide),
  };
}

function solveLinearSystem(matrix: number[][], values: number[]): number[] | null {
  const n = values.length;
  const a = matrix.map((row, index) => [...row, values[index]]);
  for (let column = 0; column < n; column += 1) {
    let pivot = column;
    for (let row = column + 1; row < n; row += 1) {
      if (Math.abs(a[row][column]) > Math.abs(a[pivot][column])) pivot = row;
    }
    if (Math.abs(a[pivot][column]) < HOMOGRAPHY_EPSILON) return null;
    [a[column], a[pivot]] = [a[pivot], a[column]];
    const divisor = a[column][column];
    for (let col = column; col <= n; col += 1) a[column][col] /= divisor;
    for (let row = 0; row < n; row += 1) {
      if (row === column) continue;
      const factor = a[row][column];
      for (let col = column; col <= n; col += 1) a[row][col] -= factor * a[column][col];
    }
  }
  return a.map((row) => row[n]);
}

/**
 * Homography that maps four source points to four destination points:
 * x'=(a*x+b*y+c)/(g*x+h*y+1), y'=(d*x+e*y+f)/(g*x+h*y+1).
 */
export function computeHomography(source: readonly Point[], destination: readonly Point[]): Homography | null {
  if (source.length !== 4 || destination.length !== 4) return null;
  const matrix: number[][] = [];
  const values: number[] = [];
  for (let i = 0; i < 4; i += 1) {
    const s = source[i];
    const d = destination[i];
    matrix.push([s.x, s.y, 1, 0, 0, 0, -d.x * s.x, -d.x * s.y]);
    values.push(d.x);
    matrix.push([0, 0, 0, s.x, s.y, 1, -d.y * s.x, -d.y * s.y]);
    values.push(d.y);
  }
  const solved = solveLinearSystem(matrix, values);
  if (!solved) return null;
  return {
    a: solved[0],
    b: solved[1],
    c: solved[2],
    d: solved[3],
    e: solved[4],
    f: solved[5],
    g: solved[6],
    h: solved[7],
  };
}

export function applyHomography(homography: Homography, point: Point): Point | null {
  const denominator = homography.g * point.x + homography.h * point.y + 1;
  if (Math.abs(denominator) < HOMOGRAPHY_EPSILON) return null;
  return {
    x: (homography.a * point.x + homography.b * point.y + homography.c) / denominator,
    y: (homography.d * point.x + homography.e * point.y + homography.f) / denominator,
  };
}

export function buildPerspectivePlan(
  source: Size,
  normalizedQuad: Quad,
  steps: RotationSteps,
  maxOutputSide: number = DEFAULT_MAX_OUTPUT_SIDE,
): PerspectivePlanResult {
  if (!isUsableSize(source)) {
    return { status: 'invalid', reason: 'unknown-source-size', message: PERSPECTIVE_ERROR_MESSAGES['unknown-source-size'] };
  }
  const oriented = orientedSize(source, steps);
  const sourceQuad = normalizedQuadToOrientedPixels(normalizedQuad, oriented);
  const outputSize = derivePerspectiveOutputSize(sourceQuad, maxOutputSide);
  if (outputSize.width < MIN_CROP_EDGE_PX || outputSize.height < MIN_CROP_EDGE_PX) {
    return { status: 'invalid', reason: 'degenerate', message: PERSPECTIVE_ERROR_MESSAGES.degenerate };
  }
  const sourcePoints = [sourceQuad.topLeft, sourceQuad.topRight, sourceQuad.bottomRight, sourceQuad.bottomLeft];
  const destinationPoints = [
    { x: 0, y: 0 },
    { x: outputSize.width - 1, y: 0 },
    { x: outputSize.width - 1, y: outputSize.height - 1 },
    { x: 0, y: outputSize.height - 1 },
  ];
  const homography = computeHomography(sourcePoints, destinationPoints);
  const inverseHomography = computeHomography(destinationPoints, sourcePoints);
  if (!homography || !inverseHomography) {
    return { status: 'invalid', reason: 'homography', message: PERSPECTIVE_ERROR_MESSAGES.homography };
  }
  return { status: 'ok', sourceQuad, outputSize, maxOutputSide, homography, inverseHomography };
}

export interface RgbaImage {
  readonly width: number;
  readonly height: number;
  readonly data: Uint8ClampedArray;
}

function sampleBilinear(image: RgbaImage, x: number, y: number, channel: number): number {
  const clampedX = clamp(x, 0, image.width - 1);
  const clampedY = clamp(y, 0, image.height - 1);
  const x0 = Math.floor(clampedX);
  const y0 = Math.floor(clampedY);
  const x1 = Math.min(image.width - 1, x0 + 1);
  const y1 = Math.min(image.height - 1, y0 + 1);
  const tx = clampedX - x0;
  const ty = clampedY - y0;
  const offset = (px: number, py: number) => (py * image.width + px) * 4 + channel;
  const v00 = image.data[offset(x0, y0)];
  const v10 = image.data[offset(x1, y0)];
  const v01 = image.data[offset(x0, y1)];
  const v11 = image.data[offset(x1, y1)];
  const top = v00 * (1 - tx) + v10 * tx;
  const bottom = v01 * (1 - tx) + v11 * tx;
  return top * (1 - ty) + bottom * ty;
}

export function warpRgbaPerspective(image: RgbaImage, plan: PerspectiveOutputPlan): RgbaImage {
  const out = new Uint8ClampedArray(plan.outputSize.width * plan.outputSize.height * 4);
  for (let y = 0; y < plan.outputSize.height; y += 1) {
    for (let x = 0; x < plan.outputSize.width; x += 1) {
      const source = applyHomography(plan.inverseHomography, { x, y });
      const targetOffset = (y * plan.outputSize.width + x) * 4;
      if (!source) {
        out[targetOffset] = 255;
        out[targetOffset + 1] = 255;
        out[targetOffset + 2] = 255;
        out[targetOffset + 3] = 255;
        continue;
      }
      out[targetOffset] = sampleBilinear(image, source.x, source.y, 0);
      out[targetOffset + 1] = sampleBilinear(image, source.x, source.y, 1);
      out[targetOffset + 2] = sampleBilinear(image, source.x, source.y, 2);
      out[targetOffset + 3] = sampleBilinear(image, source.x, source.y, 3);
    }
  }
  return { width: plan.outputSize.width, height: plan.outputSize.height, data: out };
}

export function buildScannerPerspectiveWebViewHtml(): string {
  return `<!doctype html>
<html>
<head><meta name="viewport" content="width=device-width, initial-scale=1"><style>html,body{margin:0;background:#000;}</style></head>
<body>
<canvas id="canvas"></canvas>
<script>
const EPS=${HOMOGRAPHY_EPSILON};
function post(message){window.ReactNativeWebView.postMessage(JSON.stringify(message));}
function solve(matrix, values){const n=values.length;const a=matrix.map((row,i)=>row.concat(values[i]));for(let c=0;c<n;c++){let p=c;for(let r=c+1;r<n;r++){if(Math.abs(a[r][c])>Math.abs(a[p][c]))p=r;}if(Math.abs(a[p][c])<EPS)return null;const tmp=a[c];a[c]=a[p];a[p]=tmp;const div=a[c][c];for(let k=c;k<=n;k++)a[c][k]/=div;for(let r=0;r<n;r++){if(r===c)continue;const f=a[r][c];for(let k=c;k<=n;k++)a[r][k]-=f*a[c][k];}}return a.map(row=>row[n]);}
function homography(src,dst){const m=[];const v=[];for(let i=0;i<4;i++){const s=src[i];const d=dst[i];m.push([s.x,s.y,1,0,0,0,-d.x*s.x,-d.x*s.y]);v.push(d.x);m.push([0,0,0,s.x,s.y,1,-d.y*s.x,-d.y*s.y]);v.push(d.y);}const h=solve(m,v);return h&&{a:h[0],b:h[1],c:h[2],d:h[3],e:h[4],f:h[5],g:h[6],h:h[7]};}
function map(h,p){const z=h.g*p.x+h.h*p.y+1;if(Math.abs(z)<EPS)return null;return{x:(h.a*p.x+h.b*p.y+h.c)/z,y:(h.d*p.x+h.e*p.y+h.f)/z};}
function sample(data,w,h,x,y,ch){x=Math.max(0,Math.min(w-1,x));y=Math.max(0,Math.min(h-1,y));const x0=Math.floor(x),y0=Math.floor(y),x1=Math.min(w-1,x0+1),y1=Math.min(h-1,y0+1);const tx=x-x0,ty=y-y0;const at=(px,py)=>(py*w+px)*4+ch;const top=data[at(x0,y0)]*(1-tx)+data[at(x1,y0)]*tx;const bot=data[at(x0,y1)]*(1-tx)+data[at(x1,y1)]*tx;return top*(1-ty)+bot*ty;}
async function run(job){const img=new Image();img.onload=()=>{try{const scratch=document.createElement('canvas');const sctx=scratch.getContext('2d',{willReadFrequently:true});const steps=((job.rotationSteps||0)%4+4)%4;scratch.width=steps%2===0?img.naturalWidth:img.naturalHeight;scratch.height=steps%2===0?img.naturalHeight:img.naturalWidth;if(steps===1){sctx.translate(scratch.width,0);sctx.rotate(Math.PI/2);}else if(steps===2){sctx.translate(scratch.width,scratch.height);sctx.rotate(Math.PI);}else if(steps===3){sctx.translate(0,scratch.height);sctx.rotate(3*Math.PI/2);}sctx.drawImage(img,0,0);const input=sctx.getImageData(0,0,scratch.width,scratch.height);const out=document.getElementById('canvas');out.width=job.outputSize.width;out.height=job.outputSize.height;const ctx=out.getContext('2d');const outImage=ctx.createImageData(out.width,out.height);const dst=[{x:0,y:0},{x:out.width-1,y:0},{x:out.width-1,y:out.height-1},{x:0,y:out.height-1}];const inv=homography(dst,job.sourcePoints);if(!inv){post({type:'error',id:job.id,message:'homography'});return;}for(let y=0;y<out.height;y++){for(let x=0;x<out.width;x++){const p=map(inv,{x,y});const o=(y*out.width+x)*4;if(!p){outImage.data[o]=255;outImage.data[o+1]=255;outImage.data[o+2]=255;outImage.data[o+3]=255;continue;}outImage.data[o]=sample(input.data,input.width,input.height,p.x,p.y,0);outImage.data[o+1]=sample(input.data,input.width,input.height,p.x,p.y,1);outImage.data[o+2]=sample(input.data,input.width,input.height,p.x,p.y,2);outImage.data[o+3]=255;}}ctx.putImageData(outImage,0,0);const dataUrl=out.toDataURL('image/jpeg',job.quality||0.9);post({type:'result',id:job.id,width:out.width,height:out.height,base64:dataUrl.split(',')[1]});}catch(e){post({type:'error',id:job.id,message:'render'});}};img.onerror=()=>post({type:'error',id:job.id,message:'load'});img.src=job.dataUrl;}
window.addEventListener('message',event=>{try{run(JSON.parse(event.data));}catch(e){post({type:'error',id:'unknown',message:'parse'});}});
document.addEventListener('message',event=>{try{run(JSON.parse(event.data));}catch(e){post({type:'error',id:'unknown',message:'parse'});}});
post({type:'ready'});
</script>
</body>
</html>`;
}
