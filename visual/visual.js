'use strict';
const $ = id => document.getElementById(id);
const definitions = {
 counter:{cost:'O(n)',data:'33, 38, -32, 35, 30, 37, 34, 31',code:`int comptador = 0;
for (int i = 0; i < dades.length; i++) {
    if (dades[i] % 2 == 0) {
        comptador++;
    }
}
println(comptador);`},
 accumulator:{cost:'O(n)',data:'33, 38, -32, 35, 30, -37, 34, 31',code:`int suma = 0;
for (int i = 0; i < dades.length; i++) {
    suma += dades[i];
}
println(suma);`},
 maximum:{cost:'O(n)',data:'-38, -33, -36, -31, -35, -32',code:`int max = dades[0];
for (int i = 1; i < dades.length; i++) {
    if (dades[i] > max) {
        max = dades[i];
    }
}
println(max);`},
 minimum:{cost:'O(n)',data:'38, 33, 36, 31, -35, -32',code:`int min = dades[0];
for (int i = 1; i < dades.length; i++) {
    if (dades[i] < min) {
        min = dades[i];
    }
}
println(min);`},
 all_positive:{cost:'O(n)',data:'33, 38, 32, 35, -31, 37, 34, 31',code:`boolean totsPositius = true;
for (int i = 0; i < dades.length; i++) {
    if (dades[i] <= 0) {
        totsPositius = false;
        break;
    }
}
println(totsPositius);`},
 any_negative:{cost:'O(n)',data:'33, 38, 32, 35, -31, 37, 34, 31',code:`boolean algunNegatiu = false;
for (int i = 0; i < dades.length; i++) {
    if (dades[i] < 0) {
        algunNegatiu = true;
        break;
    }
}
println(algunNegatiu);`},
 sum: {cost:'O(n)',extra:'k',value:'3',data:'32, 31, 35, 31, 33, 32, 37, 31',code:`int k = EXTRA;
int suma = 0;
for (int i = 0; i < k; i++) {
    suma += dades[i];
}
int sumaMax = suma;
int iniciMax = 0;
for (int i = k; i < dades.length; i++) {
    suma -= dades[i - k];
    suma += dades[i];
    if (suma > sumaMax) {
        sumaMax = suma;
        iniciMax = i - k + 1;
    }
}
println(sumaMax);
println(iniciMax);`},
 pattern:{cost:'O(n · m)',extra:'patro[]',value:'35, 31, 33',data:'32, 31, 35, 31, 33, 32, 37, 31',code:`int[] patro = {EXTRA};
int pos = -1;
for (int i = 0; i <= dades.length - patro.length; i++) {
    boolean coincideix = true;
    for (int j = 0; j < patro.length; j++) {
        if (dades[i + j] != patro[j]) {
            coincideix = false;
            break;
        }
    }
    if (coincideix) {
        pos = i;
        break;
    }
}
println(pos);`},
 linear:{cost:'O(n)',extra:'objectiu',value:'37',data:'32, 31, 35, 31, 33, 32, 37, 31',code:`int objectiu = EXTRA;
int pos = -1;
for (int i = 0; i < dades.length; i++) {
    if (dades[i] == objectiu) {
        pos = i;
        break;
    }
}
println(pos);`},
 binary:{cost:'O(log n)',extra:'objectiu',value:'68',data:'32, 35, 38, 42, 46, 53, 68, 86',code:`int objectiu = EXTRA;
int esq = 0;
int dre = dades.length - 1;
int pos = -1;
while (esq <= dre) {
    int mig = (esq + dre) / 2;
    if (dades[mig] == objectiu) {
        pos = mig;
        break;
    } else if (dades[mig] < objectiu) {
        esq = mig + 1;
    } else {
        dre = mig - 1;
    }
}
println(pos);`},
 bubble:{cost:'O(n²)',data:'35, 31, 34, 32, 38, 33',code:`for (int i = 0; i < dades.length - 1; i++) {
    for (int j = 0; j < dades.length - i - 1; j++) {
        if (dades[j] > dades[j + 1]) {
            int temp = dades[j];
            dades[j] = dades[j + 1];
            dades[j + 1] = temp;
        }
    }
}`},
 selection:{cost:'O(n²)',data:'35, 31, 34, 32, 38, 33',code:`for (int i = 0; i < dades.length - 1; i++) {
    int minIdx = i;
    for (int j = i + 1; j < dades.length; j++) {
        if (dades[j] < dades[minIdx]) {
            minIdx = j;
        }
    }
    int temp = dades[i];
    dades[i] = dades[minIdx];
    dades[minIdx] = temp;
}`}
};
let timeline=[], lines=[],position=0,timer=null,kind='sum';
const colors=['#57d9d0','#f4bd61','#d7a0ff','#66b5ff'];
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function integers(text){if(!text.trim())throw Error('Cal introduir almenys un enter.');const parts=text.trim().split(/[,;\s]+/);if(parts.length>24||parts.some(v=>! /^-?\d+$/.test(v)||Math.abs(Number(v))>1000000))throw Error('Introdueix entre 1 i 24 enters (±1.000.000).');return parts.map(Number)}
// The simulator retains its flat memory; restrict the view to Java lexical scopes.
function scopedDeclarations() {
 const blocks=[], stack=[];
 lines.forEach((line,i)=>{let text=line.replace(/=\s*\{[^}]*\}/g,'= ARRAY');for(const ch of text){if(ch==='{')stack.push(i+1);if(ch==='}'&&stack.length)blocks.push({start:stack.pop(),end:i+1})}});
 return lines.flatMap((line,i)=>{
  const match=line.match(/\b(?:int|boolean)\s+([a-zA-Z_]\w*)\s*=/);if(!match)return [];
  const loop=/^\s*for\s*\(/.test(line);
  const block=blocks.filter(b=>b.start<=(i+1)&&b.end>=(i+1)).sort((a,b)=>b.start-a.start)[0];
  return [{name:match[1],start:i+1,end:block?.end??Infinity,loop}];
 });
}
function memory(step){
 const m=Object.fromEntries((step?.memEntries||[]).map(e=>{let v=e.value;try{v=JSON.parse(v)}catch{}return [e.key,v]}));
 const line=step?.lines[0]??Infinity,decls=scopedDeclarations();
 for(const key of Object.keys(m)){
  const scopes=decls.filter(d=>d.name===key);if(!scopes.length)continue;
  if(!scopes.some(d=>line<=d.end&&(line>d.start||(line===d.start&&d.loop&&step.part!=='init'))&&(line!==Infinity||d.end===Infinity)))delete m[key];
 }
 return m;
}
function pointerSpecs(name,step) {
 if(name==='patro')return kind==='pattern'?[{expr:'j',color:colors[1]}]:[];
 if(['counter','accumulator','maximum','minimum','all_positive','any_negative'].includes(kind))return [{expr:'i',color:colors[0]}];
 const specs={
  pattern:[{expr:'i',color:colors[2]},{expr:'i + j',color:colors[0]}],
  sum:[{expr:'i',color:colors[0]},...((step.lines[0]||0)>=9?[{expr:'i - k',color:colors[1]}]:[])],
  linear:[{expr:'i',color:colors[0]}],
  binary:[{expr:'esq',color:colors[0]},{expr:'dre',color:colors[1]},{expr:'mig',color:colors[2]}],
  bubble:[{expr:'j',color:colors[0]},{expr:'j + 1',color:colors[1]}],
  selection:[{expr:'i',color:colors[2]},{expr:'j',color:colors[0]},{expr:'minIdx',color:colors[1]}]
 };
 return specs[kind]||[];
}
function persistentPointers(name,m,step,refs){
 return pointerSpecs(name,step).flatMap((spec,slot)=>{
  const index=arithmetic(spec.expr,m);if(index===null)return [];
  const active=refs.find(r=>r.name===name&&r.expr===spec.expr);
  return [{...spec,index,slot,active:!!active,write:active?.write}];
 });
}
// Evaluate only the small arithmetic grammar used by array indices, never arbitrary code.
function arithmetic(source,m){let s=source.replace(/\b([a-zA-Z_]\w*)\.length\b/g,(_,n)=>Array.isArray(m[n])?m[n].length:'?').replace(/\b[a-zA-Z_]\w*\b/g,n=>typeof m[n]==='number'?m[n]:'?');if(!/^[\d\s()+*/-]+$/.test(s))return null;let tokens=s.match(/\d+|[()+*/-]/g)||[],p=0;function atom(){let t=tokens[p++];if(t==='-')return -atom();if(t==='('){let v=add();if(tokens[p++]!==')')throw Error();return v}if(!/^\d+$/.test(t))throw Error();return Number(t)}function mul(){let v=atom();while(['*','/'].includes(tokens[p])){let op=tokens[p++],b=atom();v=op==='*'?v*b:Math.trunc(v/b)}return v}function add(){let v=mul();while(['+','-'].includes(tokens[p])){let op=tokens[p++],b=mul();v=op==='+'?v+b:v-b}return v}try{let v=add();return p===tokens.length&&Number.isFinite(v)?v:null}catch{return null}}
function substitute(s,m){return s.replace(/\b([a-zA-Z_]\w*)\.length\b/g,(_,n)=>Array.isArray(m[n])?m[n].length:n+'.length').replace(/\b[a-zA-Z_]\w*\b/g,n=>typeof m[n]==='number'?String(m[n]):n)}
function references(step,m){let refs=[];for(const hit of (step.hl||'').matchAll(/\b(dades|patro)\[([^\]]+)\]/g)){let index=arithmetic(hit[2],m);if(index===null||!Array.isArray(m[hit[1]]))continue;let write=new RegExp('^\\s*'+hit[0].replace(/[.*+?^${}()|[\]\\]/g,'\\$&')+'\\s*=(?!=)').test(step.hl);refs.push({name:hit[1],expr:hit[2],index,color:pointerSpecs(hit[1],step).find(p=>p.expr===hit[2])?.color||colors[0],write})}return refs}
function indexRanges(name,a,m,step,refs){
 const n=a.length;
 const bounds={
  counter:{'i':[0,n-1]},accumulator:{'i':[0,n-1]},
  maximum:{'i':[1,n-1]},minimum:{'i':[1,n-1]},
  all_positive:{'i':[0,n-1]},any_negative:{'i':[0,n-1]},
  pattern:name==='patro'?{'j':[0,n-1]}:{'i':[0,n-(m.patro?.length??0)],'i + j':[m.i,m.i+(m.patro?.length??0)-1]},
  sum:(step.lines[0]||0)>=9?{'i':[m.k,n-1],'i - k':[0,n-m.k-1]}:{'i':[0,m.k-1]},
  linear:{'i':[0,n-1]},
  binary:{'esq':[m.esq,m.dre],'dre':[m.esq,m.dre],'mig':[m.esq,m.dre]},
  bubble:{'j':[0,n-m.i-2],'j + 1':[1,n-m.i-1]},
  selection:{'i':[0,n-2],'j':[m.i+1,n-1],'minIdx':[m.i,n-1]}
 }[kind]||{};
 return persistentPointers(name,m,step,refs).flatMap(pointer=>{
  const range=bounds[pointer.expr];if(!range)return [];
  const [lo,hi]=range;
  if(!Number.isInteger(lo)||!Number.isInteger(hi)||lo<0||hi>=n||hi<lo)return [];
  const variables=pointer.expr.match(/[a-zA-Z_]\w*/g)||[];
  const evaluating=step.part==='cond'&&variables.some(v=>new RegExp('\\b'+v+'\\b').test(step.hl||''));
  return [{...pointer,lo,hi,evaluating}];
 });
}
function stop(){clearInterval(timer);timer=null;$('play').textContent='▶';$('play').setAttribute('aria-label','Reproduir')}
function build(){stop();try{kind=$('algorithm').value;let d=definitions[kind],a=integers($('data').value),extra='';if(d.extra){let e=integers($('extra').value);if(kind!=='pattern'&&e.length!==1)throw Error('Cal un únic enter.');extra=e.join(', ');if(kind==='sum'&&(e[0]<1||e[0]>a.length))throw Error('k ha d’estar entre 1 i dades.length.')}if(kind==='binary'&&a.some((x,i)=>i&&x<a[i-1]))throw Error('La cerca binària necessita dades ordenades.');let code='int[] dades = {'+a.join(', ')+'};\n'+d.code.replace('EXTRA',extra);let raw=simulateJava(code,[],{maxSteps:20000});if(raw.length>=20000)throw Error('L’execució supera el límit de passos.');const newTimeline=buildTimeline(raw,[]);if(raw.some(s=>s.part==='error'))throw Error('No s’ha pogut simular aquest exemple.');timeline=newTimeline;lines=code.split('\n');position=0;$('error').textContent='';$('code').innerHTML=lines.map((line,i)=>`<div class="code-row" data-line="${i+1}"><span class="ln">${i+1}</span><code></code></div>`).join('');render();return true}catch(e){$('error').textContent=e.message;return false}}
function syntax(s){return window.Prism?.languages.java?Prism.highlight(s,Prism.languages.java,'java'):esc(s)}
function arraySvg(name,a,refs,m,step){const cell=64,x0=65,width=Math.max(540,x0+a.length*cell+45);const pointers=persistentPointers(name,m,step,refs);
// Stable lanes prevent arrows and arrays jumping when the active statement changes.
const y=12+pointerSpecs(name,step).length*34;
const contextHeight=0;
// Use intrinsic pixels: a wider panel must never enlarge the diagram vertically.
let svg='';
let svgHeader = height => `<svg width="${width}" height="${height}" style="width:${width}px;min-width:${width}px;height:${height}px" viewBox="0 0 ${width} ${height}" role="img" aria-label="${name}: valors, índexs i punters"><defs>${colors.map((c,i)=>`<marker id="arrow-${name}-${i}" markerWidth="7" markerHeight="7" refX="6" refY="3.5" orient="auto"><path d="M0,0 L7,3.5 L0,7" fill="${c}"/></marker>`).join('')}</defs>`;
let lo=-1,hi=-1,label='';if(name==='dades'){
 if(kind==='pattern'&&Number.isInteger(m.i)&&m.patro){lo=m.i;hi=lo+m.patro.length-1;label=`Finestra: [i, i + patro.length − 1] = [${lo}, ${hi}]`}
 if(kind==='sum'&&Number.isInteger(m.k)){if(step.part==='end'&&Number.isInteger(m.iniciMax)){lo=m.iniciMax;hi=lo+m.k-1;label=`Millor finestra · [${lo}, ${hi}]`}else if(Number.isInteger(m.i)){let sliding=(step.lines[0]||0)>=9;lo=sliding?m.i-m.k+1:0;hi=sliding?m.i:m.k-1;label=`${sliding ? "Finestra que processem" : "Primera finestra"} · [${lo}, ${hi}]`}else if(Number.isInteger(m.iniciMax)){lo=m.iniciMax;hi=lo+m.k-1;label=`Millor finestra · [${lo}, ${hi}]`}}
 if(kind==='binary'&&Number.isInteger(m.esq)&&Number.isInteger(m.dre)){lo=m.esq;hi=m.dre;label=`Interval de cerca · [esq, dre] = [${lo}, ${hi}]`}
}
const hasWindow=lo>=0&&hi>=lo&&hi<a.length;
const ranges=indexRanges(name,a,m,step,refs);
const height=y+82+contextHeight+ranges.length*24;
svg=svgHeader(height);
if(hasWindow){svg+=`<rect x="${x0+lo*cell-5}" y="${y-8}" width="${(hi-lo+1)*cell}" height="82" rx="9" fill="#57d9d0" fill-opacity=".06" stroke="#35716e" stroke-dasharray="4 4"/>`}
svg+=`<text x="2" y="${y+30}" fill="#91a2b9" font-size="10">VALOR</text><text x="2" y="${y+70}" fill="#91a2b9" font-size="10">ÍNDEX</text>`;
a.forEach((v,i)=>{let r=pointers.find(p=>p.index===i&&p.active)||refs.find(r=>r.name===name&&r.index===i),x=x0+i*cell;svg+=`<rect x="${x}" y="${y}" width="54" height="48" rx="6" fill="${r?'#203d46':'#1a283b'}" stroke="${r?r.color:'#35445c'}" stroke-width="${r?2:1}"/><text x="${x+27}" y="${y+30}" text-anchor="middle" fill="#eff6ff" font-size="${String(v).length>5?11:17}" font-family="monospace">${v}</text><text x="${x+27}" y="${y+70}" text-anchor="middle" fill="${r?r.color:'#8fabc8'}" font-size="13" font-family="monospace">${i}</text>`});
// Each live index gets its own range, using the same colour as its pointer.
ranges.forEach((range,lane)=>{
 const left=x0+range.lo*cell+27,right=x0+range.hi*cell+27,base=y+79+lane*24;
 svg+=`<g data-index-range="${esc(range.expr)}" opacity="${range.evaluating?0.85:0.45}"><title>${esc(range.expr)}: índexs permesos de ${range.lo} a ${range.hi}; el bucle pot acabar abans.</title><path d="M${left},${base-3} V${base+2} H${right} V${base-3}" fill="none" stroke="${range.color}" stroke-width="1.5"/>`;
 for(let index=range.lo;index<=range.hi;index++)svg+=`<circle cx="${x0+index*cell+27}" cy="${base+2}" r="2" fill="${range.color}"/>`;
 svg+=`<text x="${left}" y="${base+19}" fill="${range.color}" font-family="monospace" font-size="10">${esc(range.expr)} ∈ [${range.lo}, ${range.hi}]</text></g>`;
});
// One stable horizontal lane per expression. Its tip aligns with the indexed cell.
pointerSpecs(name,step).forEach((spec,slot)=>{
 const laneY=y-12-slot*34;
 svg+=`<line x1="${x0}" y1="${laneY-13}" x2="${x0+(a.length-1)*cell+54}" y2="${laneY-13}" stroke="${spec.color}" stroke-opacity=".12" stroke-width="1"/>`;
});
pointers.forEach(r=>{
 const valid=r.index>=0&&r.index<a.length;
 const target=valid?x0+r.index*cell+27:r.index<0?x0-18:x0+a.length*cell+10;
 const bottom=y-8-r.slot*34,top=bottom-27;
 const half=Math.max(16,r.expr.length*3.7+10);
 const path=`M${target-half},${top} H${target+half} V${bottom-9} H${target+7} L${target},${bottom} L${target-7},${bottom-9} H${target-half} Z`;
 svg+=`<g data-pointer="${esc(r.expr)}" data-index="${r.index}" role="img" aria-label="${esc(r.expr)}: índex ${r.index}${valid?'':' fora de l’array'}"><title>${esc(name)}[${esc(r.expr)}] → índex ${r.index}${valid?'':' (fora de l’array)'}</title><path d="${path}" fill="#152333" stroke="${r.color}" stroke-width="${r.active?2.5:1.8}" ${valid?'':'stroke-dasharray="3 2"'}/><text x="${target}" y="${top+14}" text-anchor="middle" fill="${r.color}" font-weight="600" font-size="12" font-family="monospace">${esc(r.expr)}</text></g>`;
});
return `<div class="array-title">${name}</div><div class="array-scroll">${svg}</svg></div>`}
function render(){let step=timeline[position];if(!step)return;let m=memory(step),after=memory(timeline[position+1]||step),refs=references(step,m);$('phase').textContent=step.partName||'Instrucció';$('lineBadge').textContent=step.lines.length?'Línia '+step.lines[0]:'Fi';[...$('code').children].forEach((row,i)=>{let active=step.lines.includes(i+1),text=lines[i];row.classList.toggle('active',active);let offset=active&&step.hl?text.indexOf(step.hl):-1;row.lastChild.innerHTML=offset>=0?syntax(text.slice(0,offset))+'<mark>'+syntax(step.hl)+'</mark>'+syntax(text.slice(offset+step.hl.length)):syntax(text)});let active=$('code').querySelector('.active');if(active){let box=$('codeScroll');let top=active.getBoundingClientRect().top-box.getBoundingClientRect().top;if(top<0||top+active.offsetHeight>box.clientHeight)box.scrollTop+=top-box.clientHeight/3}
$('scene').innerHTML=Object.entries(m).filter(([,v])=>Array.isArray(v)).map(([n,a])=>arraySvg(n,a,refs,m,step)).join('')||'<div style="padding:55px 0;color:#8d9cb3">Executa la declaració per crear l’array en memòria.</div>';
let keys=[...new Set([...Object.keys(m),...Object.keys(after)])].filter(k=>!Array.isArray(m[k])&&!Array.isArray(after[k]));$('variables').innerHTML=keys.map(k=>{let changed=m[k]!==after[k];return `<div class="variable ${changed?'changed':''}"><b>${esc(k)}</b><strong class="${m[k]===true?'boolean-true':m[k]===false?'boolean-false':''}">${esc(m[k]??'—')}</strong>${changed?`<em> → <span class="${after[k]===true?'boolean-true':after[k]===false?'boolean-false':''}">${esc(after[k]??'—')}</span></em>`:''}</div>`}).join('')||'<span class="muted">Encara no hi ha variables escalars.</span>';
$('expression').textContent=step.hl||'Execució finalitzada';$('explanation').innerHTML=step.explanation||'';$('accesses').innerHTML=refs.map(r=>{let value=m[r.name][r.index],next=after[r.name]?.[r.index];return `<div class="access" style="--color:${r.color}"><strong>${esc(r.name)}[${esc(r.expr)}]</strong> → ${esc(r.name)}[${esc(substitute(r.expr,m))}] → ${esc(r.name)}[${r.index}] = <strong>${esc(value??'fora de límits')}</strong>${r.write?`<br>Escriptura: ${esc(value)} → <strong>${esc(next)}</strong>`:''}</div>`}).join('');$('output').innerHTML=step.outHtml||'—';$('seek').max=timeline.length-1;$('seek').value=position;$('counter').textContent=`Pas ${position} / ${timeline.length-1}`;$('prev').disabled=$('reset').disabled=position===0;$('next').disabled=position===timeline.length-1}
function move(p){stop();position=Math.max(0,Math.min(timeline.length-1,p));render()}
let applied={data:$('data').value,extra:$('extra').value};
function remember(){applied={data:$('data').value,extra:$('extra').value}}
function restore(){ $('data').value=applied.data;$('extra').value=applied.extra;$('error').textContent=''}
$('manual').onclick=()=>{stop();restore();$('inputHint').textContent=$('algorithm').value==='binary'?'La cerca binària necessita les dades ordenades de menor a major.':$('algorithm').value==='sum'?'k ha d’estar entre 1 i la longitud de l’array.':'';$('dataDialog').showModal();$('data').focus()};
$('closeDialog').onclick=$('cancelDialog').onclick=()=>{$('dataDialog').close();restore()};
$('dataDialog').addEventListener('cancel',restore);
$('inputs').onsubmit=e=>{e.preventDefault();if(build()){remember();$('dataDialog').close()}};
$('end').onclick=()=>move(timeline.length-1);
$('random').onclick=()=>{stop();restore();let a=Array.from({length:integers(applied.data).length},()=>{const magnitude=30+Math.floor(Math.random()*70);const signed=['counter','accumulator','maximum','minimum','all_positive','any_negative'].includes($('algorithm').value);return signed&&Math.random()<0.3?-magnitude:magnitude});let selected=$('algorithm').value;if(selected==='binary')a.sort((x,y)=>x-y);$('data').value=a.join(', ');if(selected==='pattern'){let size=Math.min(integers(applied.extra).length,a.length),start=Math.floor(Math.random()*(a.length-size+1));$('extra').value=a.slice(start,start+size).join(', ')}if(selected==='linear'||selected==='binary')$('extra').value=String(a[Math.floor(Math.random()*a.length)]);if(build())remember()};
$('algorithm').onchange=()=>{let d=definitions[$('algorithm').value];$('data').value=d.data;$('extra').value=d.value||'';$('extraLabel').textContent=d.extra||'';$('extraWrap').hidden=!d.extra;$('extraWrap').style.display=d.extra?'flex':'none';if(build())remember()};$('reset').onclick=()=>move(0);$('prev').onclick=()=>move(position-1);$('next').onclick=()=>move(position+1);$('seek').oninput=()=>move(Number($('seek').value));$('play').onclick=()=>{if(timer){stop();return}if(position===timeline.length-1)position=0;$('play').textContent='Ⅱ';$('play').setAttribute('aria-label','Pausar');render();timer=setInterval(()=>{if(position<timeline.length-1){position++;render()}else stop()},Number($('speed').value))};$('speed').onchange=stop;document.addEventListener('keydown',e=>{if($('dataDialog').open||/INPUT|SELECT|BUTTON|TEXTAREA/.test(e.target.tagName))return;if(['ArrowLeft','ArrowRight','Home','End',' '].includes(e.key)){e.preventDefault();if(e.key===' ')$('play').click();else move(e.key==='Home'?0:e.key==='End'?timeline.length-1:position+(e.key==='ArrowRight'?1:-1))}});build();
