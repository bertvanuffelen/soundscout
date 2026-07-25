/* ---------------- inline Lucide-iconen (currentColor) ---------------- */
const IC = {
  'circle-dot':'<circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="1"/>',
  'zap':'<path d="M4 14a1 1 0 0 1-.78-1.63l9.9-10.2a.5.5 0 0 1 .86.46l-1.92 6.02A1 1 0 0 0 13 10h7a1 1 0 0 1 .78 1.63l-9.9 10.2a.5.5 0 0 1-.86-.46l1.92-6.02A1 1 0 0 0 11 14z"/>',
  'bike':'<circle cx="18.5" cy="17.5" r="3.5"/><circle cx="5.5" cy="17.5" r="3.5"/><circle cx="15" cy="5" r="1"/><path d="M12 17.5V14l-3-3 4-3 2 3h2"/>',
  'waves':'<path d="M2 12q2.5 2 5 0t5 0 5 0 5 0"/><path d="M2 19q2.5 2 5 0t5 0 5 0 5 0"/><path d="M2 5q2.5 2 5 0t5 0 5 0 5 0"/>',
  'sparkles':'<path d="M11.017 2.814a1 1 0 0 1 1.966 0l1.051 5.558a2 2 0 0 0 1.594 1.594l5.558 1.051a1 1 0 0 1 0 1.966l-5.558 1.051a2 2 0 0 0-1.594 1.594l-1.051 5.558a1 1 0 0 1-1.966 0l-1.051-5.558a2 2 0 0 0-1.594-1.594l-5.558-1.051a1 1 0 0 1 0-1.966l5.558-1.051a2 2 0 0 0 1.594-1.594z"/><path d="M20 2v4"/><path d="M22 4h-4"/><circle cx="4" cy="20" r="2"/>',
  'volume-2':'<path d="M11 4.7a.7.7 0 0 0-1.2-.5L6.4 7.6A1.4 1.4 0 0 1 5.4 8H3a1 1 0 0 0-1 1v6a1 1 0 0 0 1 1h2.4a1.4 1.4 0 0 1 1 .4l3.4 3.4A.7.7 0 0 0 11 19.3z"/><path d="M16 9a5 5 0 0 1 0 6"/><path d="M19.4 18.4a9 9 0 0 0 0-12.8"/>',
  'mic':'<path d="M12 19v3"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><rect x="9" y="2" width="6" height="13" rx="3"/>'
};
function svg(name, extra){ return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"'+(extra||'')+'>'+IC[name]+'</svg>'; }

/* ---------------- teksten (NL + EN) ----------------
   Alle zichtbare tekst staat hier, nergens anders in dit bestand. De taal komt
   uit de URL: ?lang=en → Engels, anders Nederlands. OnboardingAnimation.tsx
   hangt die parameter er automatisch aan op basis van de app-taal.
   De geluidsnamen zijn letterlijk overgenomen uit src/i18n/locales/*.json
   (samples.gymzaal-rolschaatsen enz.) zodat animatie en app hetzelfde zeggen. */
const TEXTS = {
  nl: {
    title: 'SoundScout — In 4 stappen aan de slag',
    stepOf: 'Stap {n} van 4',
    steps: [
      'Verken een locatie en klik op geluiden',
      'Verzamel geluiden in je recorder',
      'Sleep je geluiden op de tijdlijn in de studio',
      'Combineer, bewerk en maak je eigen compositie!'
    ],
    desc: [
      'Elke locatie zit vol geluiden. Klik ze aan om ze te verzamelen.',
      'Je recorder heeft plek voor zes geluiden. Vul ’m met je favorieten.',
      'In de studio sleep je je geluiden op de sporen van de tijdlijn.',
      'Maak geluiden langer of korter en pas het volume aan — klaar is je compositie!'
    ],
    sounds: {
      voetbal: 'Voetbal', skateboard: 'Skateboard',
      rolschaatsen: 'Rolschaatsen', bal: 'Bal', vallen: 'Vallen'
    },
    ui: {
      recorder: 'Recorder', empty: 'Leeg', library: 'BIBLIOTHEEK',
      timeline: 'TIJDLIJN', volume: 'Volume', done: 'Jouw compositie!'
    }
  },
  en: {
    title: 'SoundScout — Get started in 4 steps',
    stepOf: 'Step {n} of 4',
    steps: [
      'Explore a location and click on sounds',
      'Collect sounds in your recorder',
      'Drag your sounds onto the timeline in the studio',
      'Combine, edit and make your own composition!'
    ],
    desc: [
      'Every location is full of sounds. Click them to collect them.',
      'Your recorder holds six sounds. Fill it with your favourites.',
      'In the studio you drag your sounds onto the tracks of the timeline.',
      'Make sounds longer or shorter and adjust the volume — your composition is done!'
    ],
    sounds: {
      voetbal: 'Football', skateboard: 'Skateboard',
      rolschaatsen: 'Roller Skating', bal: 'Ball', vallen: 'Falling'
    },
    ui: {
      recorder: 'Recorder', empty: 'Empty', library: 'LIBRARY',
      timeline: 'TIMELINE', volume: 'Volume', done: 'Your composition!'
    }
  }
};
const LANG = new URLSearchParams(location.search).get('lang') === 'en' ? 'en' : 'nl';
const T = TEXTS[LANG];
document.documentElement.lang = LANG;
document.title = T.title;

/* ---------------- data ---------------- */
// De drie geluiden die door alle stappen lopen (kleur uit de vaste palet-hex).
const SND = [
  {label:T.sounds.rolschaatsen, cls:'c-drone',  icon:'bike'},
  {label:T.sounds.bal,          cls:'c-vissen', icon:'circle-dot'},
  {label:T.sounds.vallen,       cls:'c-voetbal',icon:'waves'}
];
// Bibliotheek in stap 3 (5 chips).
const LIBSND = [
  {label:T.sounds.voetbal,     cls:'c-voetbal',icon:'circle-dot'},
  {label:T.sounds.skateboard,  cls:'c-skate',  icon:'zap'},
  {label:T.sounds.rolschaatsen,cls:'c-drone',  icon:'bike'},
  {label:T.sounds.bal,         cls:'c-vissen', icon:'circle-dot'},
  {label:T.sounds.vallen,      cls:'c-robot',  icon:'sparkles'}
];
const STEPS = T.steps;
const TOEL = T.desc;

// Vaste labels in de decors één keer neerzetten.
document.getElementById('lblRecorder').textContent = T.ui.recorder;
document.getElementById('lblLibrary').textContent  = T.ui.library;
document.getElementById('lblTimeline').textContent = T.ui.timeline;
document.getElementById('lblVolume').textContent   = T.ui.volume;
document.getElementById('lblDone').textContent     = T.ui.done;
document.getElementById('lblEditClip').textContent = T.sounds.rolschaatsen;

/* ---------------- opbouw DOM ---------------- */
// losse icoontjes injecteren
document.querySelector('.ic-mic').outerHTML   = svg('mic','  style="width:18px;height:18px"');
document.querySelector('.ic-waves').outerHTML = svg('waves','style="width:16px;height:16px"');
document.querySelector('.ic-vol').outerHTML   = svg('volume-2','style="width:16px;height:16px"');
document.querySelector('.ic-spark').innerHTML = svg('sparkles');

// Act 1 — hotspots op objecten (posities in % van de act)
const HOT = [{x:63,y:73},{x:38,y:22},{x:81,y:44}];
const act1 = document.querySelector('#act1 .loc');
const hotEls = HOT.map(h=>{ const el=document.createElement('div'); el.className='hot';
  el.style.left=h.x+'%'; el.style.top=h.y+'%';
  el.innerHTML='<div class="pulse"></div><div class="ring">'+svg('volume-2')+'</div>';
  act1.appendChild(el); return el; });
const rings=hotEls.map(e=>e.querySelector('.ring')), pulses=hotEls.map(e=>e.querySelector('.pulse'));

// Act 2 — 6 slots
const slotsEl=document.getElementById('slots'); const slotEls=[];
for(let i=0;i<6;i++){ const s=document.createElement('div'); s.className='slot';
  s.innerHTML='<span class="leeg">'+T.ui.empty+'</span><div class="cin"><span class="ic"></span><span class="lb"></span></div>';
  slotsEl.appendChild(s); slotEls.push(s); }

// Act 3 — bibliotheek + tijdlijn
const libEl=document.getElementById('lib'); const libEls=[];
LIBSND.forEach(s=>{ const c=document.createElement('div'); c.className='chip '+s.cls;
  c.innerHTML=svg(s.icon)+'<span>'+s.label+'</span>'; libEl.appendChild(c); libEls.push(c); });
const ruler=document.getElementById('ruler'); for(let i=1;i<=9;i++){ const sp=document.createElement('span'); sp.textContent=i; ruler.appendChild(sp); }
const rnums=document.getElementById('rnums'); for(let i=1;i<=4;i++){ const d=document.createElement('div'); d.textContent=i; rnums.appendChild(d); }
const area=document.getElementById('area'), playhead=document.getElementById('playhead');
// drie clips die "gesleept" worden — bibliotheek-index, spoor(rij), maat-start/eind
const PLACE=[ {li:2,row:1,c0:1,c1:4}, {li:3,row:2,c0:3,c1:6}, {li:4,row:3,c0:2,c1:5} ];
const clipEls=PLACE.map(p=>{ const s=LIBSND[p.li]; const el=document.createElement('div');
  el.className='clip '+s.cls; el.style.gridColumn=p.c0+'/'+p.c1; el.style.gridRow=p.row;
  el.innerHTML=svg(s.icon)+'<span>'+s.label+'</span>'; area.appendChild(el); return el; });
const dragEl=document.getElementById('drag');

// Act 4 — volumebalkjes
const barsEl=document.getElementById('bars'); const barEls=[];
for(let i=0;i<5;i++){ const b=document.createElement('i'); barsEl.appendChild(b); barEls.push(b); }

const dots=[...document.querySelectorAll('#dots i')];
const cursor1=document.getElementById('cursor1'), cursor4=document.getElementById('cursor4');
const acts=[document.getElementById('act1'),document.getElementById('act2'),document.getElementById('act3'),document.getElementById('act4')];
const tcEl=document.getElementById('titlecard'), tcNum=document.getElementById('tcNum'), tcK=document.getElementById('tcK'), tcT=document.getElementById('tcT'), tcD=document.getElementById('tcD');

/* ---------------- helpers ---------------- */
const clamp01=v=>v<0?0:v>1?1:v;
const easeOut=p=>1-Math.pow(1-p,3);
const easeInOut=p=>p<.5?2*p*p:1-Math.pow(-2*p+2,2)/2;
const lerp=(a,b,p)=>a+(b-a)*p;

/* ---------------- tijdlijn van de film ---------------- */
// Elke stap = eerst een witte titelkaart (TITLE), daarna de animatie (ANIM).
const TITLE=4000;                               // witte titelkaart: 4 seconden per stap
const ANIM=[7500,4200,9100,6900];               // rustige animatie per stap
const LEN=ANIM.map(a=>TITLE+a);
const START=[0]; for(let i=0;i<3;i++) START.push(START[i]+LEN[i]);
const ANIMEND=START[3]+LEN[3];
const REST=2200;                                // outro: enkele seconden wit vóór de herhaling
const PERIOD=ANIMEND+REST;

// scene-laag: onzichtbaar tijdens de titelkaart, faadt in als de kaart uitfadet en aan het eind weer uit
function actVisible(i,t){ const as=START[i]+TITLE, ae=START[i]+LEN[i];
  if(t<as-350 || t>ae) return 0;
  if(t<as) return clamp01((t-(as-350))/350);
  if(t>ae-300) return clamp01((ae-t)/300);
  return 1; }
const localA=(i,t)=>t-START[i]-TITLE;           // animatie-lokale tijd (ná de titelkaart)

function render(t){
  let cur=3; for(let i=0;i<4;i++){ if(t<START[i]+LEN[i]){ cur=i; break; } }
  for(let i=0;i<4;i++){ acts[i].style.opacity=actVisible(i,t); }
  document.getElementById('stepnum').textContent=cur+1;
  document.getElementById('stepk').textContent=T.stepOf.replace('{n}',cur+1);
  document.getElementById('steptitle').textContent=STEPS[cur];
  dots.forEach((d,i)=>{ d.style.background=i===cur?'var(--accent)':'#dfe3e8';
    d.style.transform='scale('+(i===cur?1.25:1)+')'; });

  // witte titelkaart — dekt de HELE kaart af (dus ook de kopbalk). Plus outro-wit aan het eind.
  let tco=0, blank=false;
  if(t>=ANIMEND){ tco=clamp01((t-ANIMEND)/350); blank=true; }          // outro: leeg wit scherm
  else { const tl=t-START[cur];
    if(tl<TITLE){ const fin=(cur===0)?1:(tl<350?tl/350:1);             // stap 1 sluit naadloos aan op het outro-wit
      const fout=(tl>TITLE-350)?clamp01((TITLE-tl)/350):1;
      tco=Math.min(fin,fout); } }
  tcEl.style.opacity=tco;
  if(tco>0){
    if(blank){ tcNum.style.opacity=0; tcK.textContent=''; tcT.textContent=''; tcD.textContent=''; }
    else { tcNum.style.opacity=1; tcNum.textContent=cur+1; tcK.textContent=T.stepOf.replace('{n}',cur+1);
      tcT.textContent=STEPS[cur]; tcD.textContent=TOEL[cur]; }
  }

  renderAct1(localA(0,t));
  renderAct2(localA(1,t));
  renderAct3(localA(2,t));
  renderAct4(localA(3,t));
}

/* ===== ACT 1 : verkennen + klikken ===== */
const A1={ empty:500, stag:400, app:520, hold:550, move:980, clickGap:560 };
A1.appearEnd=A1.empty+2*A1.stag+A1.app;
A1.c1=A1.appearEnd+A1.hold;                     // cursor start
// drie klikmomenten
A1.click=[A1.c1+A1.move, A1.c1+A1.move+A1.clickGap+A1.move, A1.c1+A1.move+2*(A1.clickGap+A1.move)];
function renderAct1(t){
  for(let i=0;i<3;i++){ const el=hotEls[i]; const s=A1.empty+i*A1.stag, e=s+A1.app;
    let op=0,sc=0;
    if(t<s){op=0;sc=0;} else if(t<e){ const p=(t-s)/A1.app,ez=easeOut(p); op=clamp01(p*1.8); sc=ez+0.14*Math.sin(p*Math.PI);}
    else {op=1;sc=1;}
    el.style.opacity=op; el.style.transform='translate(-50%,-50%) scale('+sc+')';
    // klik-puls op de bijbehorende hotspot
    const ct=A1.click[i]; let rs=1;
    if(t>=ct&&t<ct+300) rs=1-0.13*Math.sin(((t-ct)/300)*Math.PI);
    rings[i].style.transform='scale('+rs+')';
    if(t>=ct&&t<ct+620){ const p=(t-ct)/620; pulses[i].style.opacity=0.7*(1-p); pulses[i].style.transform='scale('+(1+0.9*p)+')'; }
    else pulses[i].style.opacity=0;
  }
  // cursor: van buiten beeld langs de 3 hotspots
  let op=0;
  if(t>=A1.c1&&t<A1.c1+220) op=(t-A1.c1)/220;
  else if(t>=A1.c1+220) op=1;
  let x=104,y=118;
  const seg=[ [ {x:104,y:118}, HOT[0], A1.c1, A1.c1+A1.move ],
              [ HOT[0], HOT[1], A1.click[0], A1.click[0]+A1.clickGap+A1.move ],
              [ HOT[1], HOT[2], A1.click[1], A1.click[1]+A1.clickGap+A1.move ] ];
  if(t<A1.c1){ x=104;y=118; }
  else { x=HOT[2].x;y=HOT[2].y;
    for(const [a,b,ts,te] of seg){ if(t>=ts&&t<te){ const p=easeInOut(clamp01((t-ts)/(te-ts))); x=lerp(a.x,b.x,p); y=lerp(a.y,b.y,p); break; } if(t<ts){ x=a.x;y=a.y; break; } } }
  let cs=1; for(const ct of A1.click){ if(t>=ct&&t<ct+200){ cs=1-0.2*Math.sin(((t-ct)/200)*Math.PI); } }
  cursor1.style.opacity=op; cursor1.style.left=x+'%'; cursor1.style.top=y+'%';
  cursor1.style.transform='scale('+cs+')';
}

/* ===== ACT 2 : samples vallen ÍN hun vakje (geclipt) en blijven daar ===== */
const A2={ empty:700, stag:1150, drop:720 };
function renderAct2(t){
  for(let i=0;i<3;i++){ const start=A2.empty+i*A2.stag; const el=slotEls[i];
    const cin=el.querySelector('.cin'), leeg=el.querySelector('.leeg'), ic=el.querySelector('.ic'), lb=el.querySelector('.lb');
    if(t<start){ el.classList.remove('fill'); leeg.style.opacity=1; cin.style.opacity=0; cin.style.transform='translateY(-110%)'; }
    else {
      if(cin.dataset.on!=='1'){ ic.innerHTML=svg(SND[i].icon,'style="width:20px;height:20px"'); lb.textContent=SND[i].label;
        cin.style.background='var(--'+SND[i].cls+')'; cin.dataset.on='1'; }
      const p=clamp01((t-start)/A2.drop), e=easeOut(p);
      cin.style.opacity=1;
      cin.style.transform='translateY('+(lerp(-110,0,e)+5*Math.sin(p*Math.PI))+'%)';   // valt in + kleine settle
      leeg.style.opacity=1-clamp01(p*2.2);
      el.classList.toggle('fill', p>0.85);
    }
  }
  let c=0; for(let i=0;i<3;i++){ if(t>=A2.empty+i*A2.stag+A2.drop*0.45) c++; }
  document.getElementById('reccnt').textContent=c+'/6';
}

/* ===== ACT 3 : slepen naar de tijdlijn + sweep ===== */
const A3={ empty:600, stag:1300, drag:1100, drop:320, holdBeforeSweep:700, sweep:3000, phFade:460 };
A3.dragEnd=A3.empty+2*A3.stag+A3.drag+A3.drop;
A3.sweepStart=A3.dragEnd+A3.holdBeforeSweep;
A3.sweepEnd=A3.sweepStart+A3.sweep;
function centerOf(el,rel){ const r=el.getBoundingClientRect(), R=rel.getBoundingClientRect();
  return { x:(r.left+r.width/2-R.left)/R.width*100, y:(r.top+r.height/2-R.top)/R.height*100 }; }
function renderAct3(t){
  const padEl=document.querySelector('#act3 .pad');
  // clips verschijnen zodra ze "gedropt" zijn
  let dragging=-1, dragP=0;
  for(let i=0;i<3;i++){ const s=A3.empty+i*A3.stag; const dEnd=s+A3.drag; const dropEnd=dEnd+A3.drop;
    const clip=clipEls[i];
    if(t<dEnd){ clip.style.opacity=0; if(t>=s){ dragging=i; dragP=clamp01((t-s)/A3.drag); } }
    else if(t<dropEnd){ const p=(t-dEnd)/A3.drop; clip.style.opacity=clamp01(p*1.6); clip.style.transform='scale('+(0.92+0.08*easeOut(p))+')'; }
    else { clip.style.opacity=1; clip.style.transform='scale(1)';
      // glow bij passeren afspeellijn
      if(t>=A3.sweepStart&&t<=A3.sweepEnd){ const g0=A3.sweepStart+(PLACE[i].c0-1)/9*A3.sweep;
        if(t>=g0&&t<g0+420){ const sg=Math.sin(((t-g0)/420)*Math.PI); clip.style.transform='scale('+(1+0.05*sg)+')'; clip.style.filter='brightness('+(1+0.16*sg)+')'; }
        else clip.style.filter='brightness(1)'; }
      else clip.style.filter='brightness(1)';
    }
  }
  // sleep-chip die van bibliotheek naar spoor beweegt
  if(dragging>=0){ const p=easeInOut(dragP); const s=LIBSND[PLACE[dragging].li];
    dragEl.className='drag chip '+s.cls; dragEl.innerHTML=svg(s.icon)+'<span>'+s.label+'</span>';
    const from=centerOf(libEls[PLACE[dragging].li], padEl);
    const to=centerOf(clipEls[dragging], padEl);
    dragEl.style.opacity=1; dragEl.style.transform='translate(-50%,-50%) scale(.96)';
    dragEl.style.left=lerp(from.x,to.x,p)+'%'; dragEl.style.top=lerp(from.y,to.y,p)+'%';
    // cursor mee (hergebruik cursor1 verborgen? nee — teken geen tweede; laat de chip zelf de beweging zijn)
  } else dragEl.style.opacity=0;
  // afspeellijn
  let po=0,pl=0;
  if(t>=A3.sweepStart&&t<=A3.sweepEnd){ po=1; pl=(t-A3.sweepStart)/A3.sweep*100; }
  else if(t>A3.sweepEnd&&t<A3.sweepEnd+A3.phFade){ po=1-(t-A3.sweepEnd)/A3.phFade; pl=100; }
  playhead.style.opacity=po; playhead.style.left=pl+'%';
}

/* ===== ACT 4 : rekken + volume ===== */
const A4={ in:500, grow:1200, shrink:1200, gap:450, volIn:450, volMove:2000 };
A4.growS=A4.in+300; A4.growE=A4.growS+A4.grow;
A4.shrinkS=A4.growE+250; A4.shrinkE=A4.shrinkS+A4.shrink;
A4.volS=A4.shrinkE+A4.gap; A4.volE=A4.volS+A4.volMove;
A4.doneS=A4.volE+250;
const editclip=document.getElementById('editclip'), volEl=document.getElementById('vol');
const volfill=document.getElementById('volfill'), volthumb=document.getElementById('volthumb'), doneEl=document.getElementById('done');
function renderAct4(t){
  // clip verschijnt
  let cop=clamp01((t-A4.in)/300); editclip.style.opacity=cop;
  // breedte: 44% -> 62% (langer) -> 30% (korter) -> 46%
  let w=44;
  if(t<A4.growS) w=44;
  else if(t<A4.growE) w=lerp(44,62,easeInOut((t-A4.growS)/A4.grow));
  else if(t<A4.shrinkS) w=62;
  else if(t<A4.shrinkE) w=lerp(62,30,easeInOut((t-A4.shrinkS)/A4.shrink));
  else w=lerp(30,46,easeOut(clamp01((t-A4.shrinkE)/300)));
  editclip.style.width=w+'%';
  // cursor4 bij de handle
  const handleX=14+w, hy=16+ (56/ (document.querySelector('#act4 .pad')?.clientHeight||360))*100*0.5;
  let c4op=0; if(t>=A4.growS-200&&t<A4.shrinkE+200) c4op=1;
  cursor4.style.opacity=c4op; cursor4.style.left=handleX+'%'; cursor4.style.top='23%';
  // volume
  let vo=clamp01((t-A4.volS)/A4.volIn); volEl.style.opacity=vo;
  let lvl=0.5;
  if(t>=A4.volS&&t<A4.volE){ const p=(t-A4.volS)/A4.volMove; lvl=0.5+0.42*Math.sin(p*Math.PI*1.5); }
  else if(t>=A4.volE) lvl=0.72;
  lvl=clamp01(lvl);
  volfill.style.width=(lvl*100)+'%'; volthumb.style.left=(lvl*100)+'%';
  barEls.forEach((b,i)=>{ const base=[.4,.7,1,.6,.85][i]; b.style.height=(6+28*lvl*base)+'px'; b.style.opacity=vo; });
  // geen "klaar"-splash meer; de scene faadt netjes uit via actVisible → daarna outro-wit
}

/* ---------------- rAF-klok ---------------- */
const REDUCE=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
let raf=0, startT=null;
function loop(now){ if(startT===null) startT=now; render((now-startT)%PERIOD); raf=requestAnimationFrame(loop); }
function begin(){ cancelAnimationFrame(raf);
  if(REDUCE){ render(START[2]+TITLE+A3.sweepStart+A3.sweep*0.5); return; }  // nette statische staat
  startT=null; raf=requestAnimationFrame(loop); }
window.addEventListener('pagehide',()=>cancelAnimationFrame(raf));
begin();
