'use strict';
/* 野鳥野帳-会員用 app.js */
const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)];
const KEY='birdCensusV1';
const rad=Math.PI/180;
const today=()=>new Date().toLocaleDateString('sv');
const pad=n=>String(n).padStart(2,'0');
const nowT=()=>{const d=new Date();return pad(d.getHours())+':'+pad(d.getMinutes())+':'+pad(d.getSeconds())};
const esc=s=>String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

/* ---------- 選択肢 ---------- */
const OPT={
  how:['鳴き声','視認','視認+鳴き声','飛翔'],
  sex:['不明','雄','雌','幼鳥','群れ'],
  beh:['さえずり','地鳴き','採餌','飛翔','繁殖行動','その他'],
  veg:['ブナ林','ミズナラ林','落葉広葉樹林','針葉樹林','混交林','ササ原','低木・ハイマツ','草地','岩場','その他'],
  weather:['','快晴','晴れ','薄曇り','曇り','霧','小雨','雨','雪'],
  wind:['','無風','弱い','やや強い','強い'],
  seg:[['off','なし(手入力)'],['d:100','距離 100mごと'],['d:200','距離 200mごと'],['d:500','距離 500mごと'],['d:1000','距離 1kmごと'],['a:50','標高 50mごと'],['a:100','標高 100mごと']]
};
function fill(id,arr){$('#'+id).innerHTML=arr.map(o=>Array.isArray(o)?`<option value="${o[0]}">${o[1]}</option>`:`<option>${o}</option>`).join('')}
[['how','how'],['sex','sex'],['beh','beh'],['phow','how'],['psex','sex'],['pbeh','beh'],['veg','veg'],['weather','weather'],['wind','wind'],['p_weather','weather'],['p_wind','wind'],['segmode','seg']].forEach(([id,k])=>fill(id,OPT[k]));

/* ---------- データ ---------- */
let D={info:{},birds:[],envs:[],track:[],trk:{on:false},set:{seg:'off'},recent:[],pt:{info:{},rows:[]}};
try{D=Object.assign(D,JSON.parse(localStorage.getItem(KEY)||'{}'))}catch(e){}
D.info=D.info||{};D.birds=D.birds||[];D.envs=D.envs||[];D.track=D.track||[];D.trk=D.trk||{on:false};D.set=D.set||{seg:'off'};D.recent=D.recent||[];
D.pt=D.pt||{info:{},rows:[]};D.pt.info=D.pt.info||{};D.pt.rows=D.pt.rows||[];
let saveWarned=false;
function save(){try{localStorage.setItem(KEY,JSON.stringify(D))}catch(e){if(!saveWarned){saveWarned=true;toast('端末の保存容量がいっぱいです。すぐにExcelを出力してください。')}}}
if(!D.info.date)D.info.date=today();
if(!D.pt.info.date)D.pt.info.date=today();

/* ---------- トースト(取り消し付き) ---------- */
let toastT;
function toast(msg,undoFn){
  const t=$('#toast');t.innerHTML='';const s=document.createElement('span');s.textContent=msg;t.appendChild(s);
  if(undoFn){const b=document.createElement('button');b.textContent='取り消す';b.onclick=()=>{undoFn();t.hidden=true};t.appendChild(b)}
  t.hidden=false;clearTimeout(toastT);toastT=setTimeout(()=>t.hidden=true,undoFn?7000:4000);
}

/* ---------- 種名検索(ひらがな・ローマ字対応) ---------- */
const SP=window.SPECIES||[],INFO=window.SPINFO||{};
const RLN={EX:'絶滅',EW:'野生絶滅',CR:'絶滅危惧IA類',EN:'絶滅危惧IB類',VU:'絶滅危惧II類',NT:'準絶滅危惧',DD:'情報不足',LP:'地域個体群'};
const rlB=s=>{const r=(INFO[s]||[])[2];return r?`<span class="rl rl-${r}" title="${RLN[r]||''}">${r}</span>`:''};
const h2k=s=>s.replace(/[ぁ-ゖ]/g,c=>String.fromCharCode(c.charCodeAt(0)+0x60));
const RT={};
'a:あ,i:い,u:う,e:え,o:お,ka:か,ki:き,ku:く,ke:け,ko:こ,sa:さ,shi:し,si:し,su:す,se:せ,so:そ,ta:た,chi:ち,ti:ち,tsu:つ,tu:つ,te:て,to:と,na:な,ni:に,nu:ぬ,ne:ね,no:の,ha:は,hi:ひ,fu:ふ,hu:ふ,he:へ,ho:ほ,ma:ま,mi:み,mu:む,me:め,mo:も,ya:や,yu:ゆ,yo:よ,ra:ら,ri:り,ru:る,re:れ,ro:ろ,wa:わ,wo:を,ga:が,gi:ぎ,gu:ぐ,ge:げ,go:ご,za:ざ,ji:じ,zi:じ,zu:ず,ze:ぜ,zo:ぞ,da:だ,di:ぢ,du:づ,de:で,do:ど,ba:ば,bi:び,bu:ぶ,be:べ,bo:ぼ,pa:ぱ,pi:ぴ,pu:ぷ,pe:ぺ,po:ぽ,kya:きゃ,kyu:きゅ,kyo:きょ,gya:ぎゃ,gyu:ぎゅ,gyo:ぎょ,sha:しゃ,shu:しゅ,sho:しょ,sya:しゃ,syu:しゅ,syo:しょ,ja:じゃ,ju:じゅ,jo:じょ,jya:じゃ,jyu:じゅ,jyo:じょ,zya:じゃ,zyu:じゅ,zyo:じょ,cha:ちゃ,chu:ちゅ,cho:ちょ,tya:ちゃ,tyu:ちゅ,tyo:ちょ,cya:ちゃ,cyu:ちゅ,cyo:ちょ,nya:にゃ,nyu:にゅ,nyo:にょ,hya:ひゃ,hyu:ひゅ,hyo:ひょ,mya:みゃ,myu:みゅ,myo:みょ,rya:りゃ,ryu:りゅ,ryo:りょ,bya:びゃ,byu:びゅ,byo:びょ,pya:ぴゃ,pyu:ぴゅ,pyo:ぴょ'.split(',').forEach(p=>{const i=p.indexOf(':');RT[p.slice(0,i)]=p.slice(i+1)});
function romaji2kana(s){
  let o='',i=0;
  while(i<s.length){
    const c=s[i],n=s[i+1];
    if(c==="'"||c==='-'||c===' '){i++;continue}
    if(c==='n'){
      if(n==='n'){o+='ん';i+=2;continue}
      if(n&&!'aiueoy'.includes(n)){o+='ん';i++;continue}
      if(!n){i++;continue}
    }
    if(n&&c===n&&!'aiueon'.includes(c)){o+='っ';i++;continue}
    let m=false;
    for(let l=3;l>=1;l--){const k=s.substr(i,l);if(RT[k]){o+=RT[k];i+=l;m=true;break}}
    if(!m)i++;
  }
  return o;
}
function normQ(q){q=(q||'').trim();if(!q)return'';if(/^[A-Za-z' \-]+$/.test(q))q=romaji2kana(q.toLowerCase());return h2k(q).replace(/\s+/g,'')}
/* 長音のゆれ(シジュウカラ→sijukara、ホオジロ→hojiro など)を吸収するため、う・おの伸ばしを畳んで比較する */
const KU='うくすつぬふむゆるぐずづぶぷゅ',KO='おこそとのほもよろごぞどぼぽょを';
function fold(s){
  let o='';
  for(const c of s.replace(/[ァ-ヶ]/g,x=>String.fromCharCode(x.charCodeAt(0)-0x60)).replace(/ー/g,'')){
    const p=o[o.length-1];
    if(p&&((c==='う'&&(KU.includes(p)||KO.includes(p)))||(c==='お'&&KO.includes(p))))continue;
    o+=c;
  }
  return o;
}
const SPF=SP.map(fold);
function suggest(q){
  const n=normQ(q);if(!n)return[];
  const f=fold(n),hit=[];
  SP.forEach((s,k)=>{
    const i=s.indexOf(n);
    if(i>=0)hit.push([i===0?0:2,s]);          // そのまま一致(前方→部分)
    else{const j=SPF[k].indexOf(f);if(j>=0)hit.push([j===0?1:3,s])}  // 長音のゆれを許した一致
  });
  const rank=x=>{const r=D.recent.indexOf(x);return r<0?99:r};
  hit.sort((a,b)=>a[0]-b[0]||rank(a[1])-rank(b[1])||a[1].length-b[1].length);
  return hit.map(h=>h[1]).slice(0,8);
}
function spInfoText(v){const f=INFO[v];if(!f)return'';return [f[1],f[0]].filter(Boolean).join(' ・ ')+(f[2]?` ・ 環境省RL: ${RLN[f[2]]||f[2]}`:'')}
function attachAC(id){
  const inp=$('#'+id),ul=$('#'+id+'_l'),info=$('#'+id+'_i');
  const showInfo=()=>{if(info)info.textContent=spInfoText(inp.value.trim())};
  const refresh=()=>{
    const r=suggest(inp.value);
    ul.innerHTML=r.map(s=>{const f=INFO[s];return `<li data-v="${esc(s)}"><b>${esc(s)}</b><small>${f?esc(f[1]):''}</small>${rlB(s)}</li>`}).join('');
    const v=inp.value.trim();
    // 種名が完全一致し、続きを入力すれば別の種になる候補(例: ハシブトガラ→ハシブトガラス)が無ければ閉じる
    ul.hidden=!r.length||(SP.includes(v)&&!r.some(s=>s!==v&&s.startsWith(v)));
  };
  inp.addEventListener('input',()=>{refresh();showInfo()});
  inp.addEventListener('focus',refresh);
  inp.addEventListener('blur',()=>setTimeout(()=>{ul.hidden=true},150));
  ul.addEventListener('pointerdown',e=>{const li=e.target.closest('li');if(!li)return;e.preventDefault();inp.value=li.dataset.v;ul.hidden=true;showInfo();inp.blur()});
  inp._show=showInfo;
}
['sp','psp'].forEach(attachAC);
function setSp(id,v){const e=$('#'+id);e.value=v;e._show&&e._show();$('#'+id+'_l').hidden=true}
function pushRecent(sp){D.recent=[sp,...D.recent.filter(x=>x!==sp)].slice(0,10);renderRecent()}
function renderRecent(){
  const h=D.recent.slice(0,8).map(s=>`<button class="chip" data-sp="${esc(s)}">${esc(s)}</button>`).join('');
  $('#recL').innerHTML=h;$('#recP').innerHTML=h;
}
$('#recL').onclick=e=>{const b=e.target.closest('[data-sp]');if(b)setSp('sp',b.dataset.sp)};
$('#recP').onclick=e=>{const b=e.target.closest('[data-sp]');if(b)setSp('psp',b.dataset.sp)};
$$('[data-st]').forEach(b=>b.onclick=()=>{const e=$('#'+b.dataset.st);e.value=Math.max(1,(+e.value||1)+(+b.dataset.d))});

/* ---------- 入力欄の保存(調査情報) ---------- */
const IDS=['date','mountain','route','members','start','end','weather','wind','temp','dist','note'];
IDS.forEach(k=>{const e=$('#'+k);e.value=D.info[k]||'';e.addEventListener('input',()=>{D.info[k]=e.value;save()})});
$('#segmode').value=D.set.seg||'off';
$('#segmode').onchange=e=>{D.set.seg=e.target.value;save();if(/^d:/.test(e.target.value)&&!D.trk.on)toast('距離ごとの区間には、軌跡記録の「開始」が必要です')};
$$('[data-now]').forEach(b=>b.onclick=()=>{const k=b.dataset.now;D.info[k]=nowT().slice(0,5);$('#'+k).value=D.info[k];save()});
$$('#ln nav button').forEach(b=>b.onclick=()=>{$$('#ln nav button,#ln section').forEach(x=>x.classList.remove('on'));b.classList.add('on');$('#'+b.dataset.t).classList.add('on');render()});

/* ---------- 位置 ---------- */
let lastFix=null;
function gps(){return new Promise(r=>{
  if(!navigator.geolocation)return r({});
  navigator.geolocation.getCurrentPosition(p=>r({lat:+p.coords.latitude.toFixed(6),lon:+p.coords.longitude.toFixed(6),alt:p.coords.altitude==null?'':Math.round(p.coords.altitude),acc:Math.round(p.coords.accuracy)}),()=>r({}),{enableHighAccuracy:true,timeout:10000,maximumAge:5000});
})}
async function getFix(){
  if(D.trk.on&&lastFix&&Date.now()-lastFix.t<20000)return lastFix;
  return await gps();
}
const gtxt=g=>g.lat?`位置: ${g.lat}, ${g.lon} / 標高 ${g.alt===''||g.alt==null?'不明':g.alt+'m'} / 誤差${g.acc}m`:'位置を取得できませんでした(時刻のみ記録)';

/* ---------- 軌跡 ---------- */
let wid=null,wl=null,saveN=0;
function hav(a,b){const R=6371000,dLa=(b.lat-a.lat)*rad,dLo=(b.lon-a.lon)*rad,x=Math.sin(dLa/2)**2+Math.cos(a.lat*rad)*Math.cos(b.lat*rad)*Math.sin(dLo/2)**2;return 2*R*Math.asin(Math.sqrt(x))}
function onPos(p){
  const c=p.coords,fix={t:Date.now(),lat:+c.latitude.toFixed(6),lon:+c.longitude.toFixed(6),alt:c.altitude==null?'':Math.round(c.altitude),acc:Math.round(c.accuracy)};
  lastFix=fix;
  if(c.accuracy<=40){
    const T=D.track,last=T[T.length-1];
    const d=last?hav(last,fix):0,dt=last?(fix.t-last.t)/1000:0;
    const gap=last&&dt>300,glitch=last&&dt>0&&!gap&&d/dt>25;
    if(!glitch&&(!last||d>=8)){
      T.push({t:fix.t,lat:fix.lat,lon:fix.lon,alt:fix.alt,acc:fix.acc,cd:+((last?last.cd:0)+(gap?0:d)).toFixed(1)});
      if(++saveN%5===0)save();
    }
  }
  updTrk();
}
function watch(){
  if(!navigator.geolocation)return;
  if(wid!=null)navigator.geolocation.clearWatch(wid);
  wid=navigator.geolocation.watchPosition(onPos,err=>{$('#trkinfo').textContent=' 位置を取得できません: '+err.message},{enableHighAccuracy:true,maximumAge:2000,timeout:30000});
}
async function wakeOn(){try{if($('#wl').checked&&'wakeLock' in navigator&&!wl){wl=await navigator.wakeLock.request('screen');wl.addEventListener('release',()=>{wl=null})}}catch(e){}}
function wakeOff(){try{wl&&wl.release()}catch(e){}wl=null}
function trkStart(){
  if(!navigator.geolocation){toast('この端末では位置情報を使えません');return}
  D.trk={on:true,start:D.trk.start||Date.now()};save();watch();wakeOn();updTrk();
}
function trkStop(){
  if(wid!=null&&navigator.geolocation)navigator.geolocation.clearWatch(wid);wid=null;
  D.trk.on=false;wakeOff();save();updTrk();
  if(D.track.length>1&&!D.info.dist)autoDist(true);
}
function trkStats(){
  const T=D.track;if(T.length<2)return null;
  const dist=T[T.length-1].cd,dur=T[T.length-1].t-T[0].t;
  let gain=0,loss=0,ref=null,mx=-1e9,mn=1e9;
  for(const p of T){
    if(p.alt===''||p.alt==null)continue;
    mx=Math.max(mx,p.alt);mn=Math.min(mn,p.alt);
    if(ref===null){ref=p.alt;continue}
    const d=p.alt-ref;
    if(d>=3){gain+=d;ref=p.alt}else if(d<=-3){loss-=d;ref=p.alt}
  }
  return {dist,dur,gain:Math.round(gain),loss:Math.round(loss),max:mx>-1e9?mx:'',min:mn<1e9?mn:''};
}
const fmtDur=ms=>{const m=Math.round(ms/60000);return Math.floor(m/60)+':'+pad(m%60)};
function updTrk(){
  const on=D.trk.on,s=trkStats(),n=D.track.length;
  $('#trkbar').classList.toggle('on',on);
  $('#trkst').textContent=on?'● 軌跡を記録中':(n?'軌跡記録: 停止中':'軌跡記録: 未開始');
  const parts=[];
  if(s){parts.push((s.dist/1000).toFixed(2)+'km');parts.push(fmtDur(s.dur));if(s.gain||s.loss)parts.push(`登り${s.gain}m/下り${s.loss}m`)}
  if(n)parts.push(n+'点');
  if(on&&lastFix)parts.push('誤差'+lastFix.acc+'m');
  $('#trkinfo').textContent=parts.length?parts.join(' ・ '):'「開始」で歩いた道を記録します';
  $('#trkBtn').textContent=on?'停止':(n?'再開':'開始');
  $('#trkClr').hidden=on||!n;
  $('#homeTrk').textContent=on?'● 軌跡を記録中(ライン観察)':'';
}
function autoDist(quiet){
  const s=trkStats();if(!s){if(!quiet)toast('軌跡がまだありません');return}
  D.info.dist=(s.dist/1000).toFixed(2);$('#dist').value=D.info.dist;save();if(!quiet)toast('軌跡から入力しました: '+D.info.dist+'km');
}
$('#trkBtn').onclick=()=>D.trk.on?trkStop():trkStart();
$('#trkClr').onclick=()=>{if(confirm('記録した軌跡を消去します。よろしいですか？')){D.track=[];D.trk={on:false};save();updTrk()}};
$('#distAuto').onclick=()=>autoDist(false);
$('#wl').onchange=()=>{if(D.trk.on){$('#wl').checked?wakeOn():wakeOff()}};
document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible'&&D.trk.on){wakeOn();watch()}});  // 画面を消している間に止まった位置取得を、復帰時に張り直す
setInterval(()=>{if(D.trk.on)updTrk()},10000);
addEventListener('pagehide',()=>save());
document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='hidden')save()});
if(D.trk.on){watch();wakeOn()}

/* ---------- 区間の自動割り当て ---------- */
function autoSeg(g,man){
  if(man)return man;
  const m=D.set.seg||'off';if(m==='off')return'';
  const [k,v]=m.split(':'),n=+v;
  if(k==='d'){
    if(!D.trk.on||!D.track.length)return'';
    const cd=D.track[D.track.length-1].cd,i=Math.floor(cd/n),f=n<1000?1:0;
    return `${(i*n/1000).toFixed(f)}-${((i+1)*n/1000).toFixed(f)}km`;
  }
  if(g.alt===''||g.alt==null||isNaN(g.alt))return'';
  const lo=Math.floor(g.alt/n)*n;return `${lo}-${lo+n}m`;
}

/* ---------- 記録の追加・編集・削除 ---------- */
async function add(kind,rec,gEl){
  const g=await getFix();
  rec.seg=autoSeg(g,rec.seg);
  Object.assign(rec,{time:nowT(),lat:g.lat||'',lon:g.lon||'',alt:g.alt===undefined?'':g.alt,acc:g.acc||''});
  D[kind].push(rec);save();if(gEl)gEl.textContent=gtxt(g)+(rec.seg?` / 区間 ${rec.seg}`:'');render();
  const warn=/^d:/.test(D.set.seg)&&!D.trk.on?'(軌跡記録が停止中のため区間は自動入力されません)':'';
  toast((kind==='birds'?rec.sp+' を記録しました':'環境を記録しました')+warn,()=>{const i=D[kind].indexOf(rec);if(i>=0){D[kind].splice(i,1);save();render()}});
  return rec;
}
$('#addBird').onclick=async()=>{
  const sp=$('#sp').value.trim();if(!sp){$('#msg').textContent='種名を入力してください';return}
  $('#msg').textContent='';
  pushRecent(sp);
  await add('birds',{sp,cnt:+$('#cnt').value||1,how:$('#how').value,sex:$('#sex').value,beh:$('#beh').value,seg:$('#seg').value.trim(),off:$('#off').value,memo:$('#bmemo').value},$('#gpsB'));
  setSp('sp','');$('#cnt').value=1;$('#bmemo').value='';
};
$('#addEnv').onclick=async()=>{
  await add('envs',{veg:$('#veg').value,seg:$('#eseg').value.trim(),state:$('#estate').value,food:$('#efood').value,human:$('#ehum').value});
  ['estate','efood','ehum'].forEach(k=>$('#'+k).value='');
};
function del(kind,i){if(confirm('この記録を削除しますか？')){D[kind].splice(i,1);save();render()}}
const EF={
  birds:[['time','時刻','tm'],['sp','種名','sp'],['cnt','個体数','num'],['how','確認方法',OPT.how],['sex','雌雄・成幼',OPT.sex],['beh','行動',OPT.beh],['seg','区間','text'],['off','ルートからの距離(m)','num'],['memo','メモ','text']],
  envs:[['time','時刻','tm'],['veg','植生',OPT.veg],['seg','区間','text'],['state','林の状態・下草・水場','text'],['food','餌資源','text'],['human','人為的影響','text']],
  prow:[['time','時刻','tm'],['sp','種名','sp'],['cnt','個体数','num'],['how','確認方法',OPT.how],['sex','雌雄・成幼',OPT.sex],['beh','行動',OPT.beh],['memo','メモ','text']]
};
function openEdit(kind,i){
  const rec=kind==='prow'?D.pt.rows[i]:D[kind][i];if(!rec)return;
  const f=$('#ef');
  f.innerHTML=EF[kind].map(([k,l,t])=>{
    let c;const v=rec[k]==null?'':rec[k];
    if(Array.isArray(t)){const o=(!v||t.includes(v))?t:[v,...t];c=`<select data-k="${k}">${o.map(x=>`<option${x===v?' selected':''}>${esc(x)}</option>`).join('')}</select>`}
    else if(t==='tm')c=`<input type="time" step="1" data-k="${k}" value="${esc(v)}">`;
    else if(t==='num')c=`<input type="number" inputmode="numeric" data-k="${k}" value="${esc(v)}">`;
    else if(t==='sp')c=`<div class="ac"><input id="ed_sp" data-k="${k}" value="${esc(v)}" autocomplete="off" autocapitalize="off"><ul class="acl" id="ed_sp_l" hidden></ul></div><div class="spi" id="ed_sp_i"></div>`;
    else c=`<input data-k="${k}" value="${esc(v)}">`;
    return `<label>${l}</label>${c}`;
  }).join('');
  if($('#ed_sp')){attachAC('ed_sp');$('#ed_sp')._show()}
  $('#edlg').hidden=false;
  $('#eSave').onclick=()=>{
    f.querySelectorAll('[data-k]').forEach(e=>{const k=e.dataset.k;if(k==='time'&&!e.value)return;rec[k]=e.type==='number'?(e.value===''?'':+e.value):e.value.trim()});
    if('cnt' in rec&&!(rec.cnt>=1))rec.cnt=1;
    if('sp' in rec&&!rec.sp){toast('種名は空にできません');return}
    save();render();prender();pins();$('#edlg').hidden=true;
  };
  $('#eCancel').onclick=()=>{$('#edlg').hidden=true};
}
function render(){
  $('#nB').textContent=`(${D.birds.length}件)`;$('#nE').textContent=`(${D.envs.length}件)`;
  const ib=(k,i)=>`<div class="ib"><button class="x" onclick="openEdit('${k}',${i})" aria-label="編集">✎</button><button class="x" onclick="${k==='prow'?'pdel':'del'}(${k==='prow'?'':"'"+k+"',"}${i})" aria-label="削除">✕</button></div>`;
  $('#lB').innerHTML=D.birds.map((b,i)=>`<div class="item"><div><b>${esc(b.sp)}</b> ×${b.cnt} ${rlB(b.sp)}<br>${b.time} ${esc(b.how)}・${esc(b.beh)}・${esc(b.sex)}${b.seg?' ・区間'+esc(b.seg):''}${b.alt!==''&&b.alt!=null?' ・'+b.alt+'m':''}${b.memo?'<br>'+esc(b.memo):''}</div>${ib('birds',i)}</div>`).reverse().join('')||'<p class="sub">まだ記録がありません。</p>';
  $('#lE').innerHTML=D.envs.map((e,i)=>`<div class="item env"><div><b>${esc(e.veg)}</b> ${e.time}${e.seg?' ・区間'+esc(e.seg):''}${e.alt!==''&&e.alt!=null?' ・'+e.alt+'m':''}<br>${esc([e.state,e.food,e.human].filter(Boolean).join(' / '))}</div>${ib('envs',i)}</div>`).reverse().join('')||'<p class="sub">まだ記録がありません。</p>';
  const sp=new Set(D.birds.map(b=>b.sp)),n=D.birds.reduce((a,b)=>a+(+b.cnt||0),0);
  $('#sum').textContent=`確認種数 ${sp.size} / 総個体数 ${n} / 環境記録 ${D.envs.length}件`;
}
window.openEdit=openEdit;window.del=del;

/* ---------- 天気の自動入力 ---------- */
const wmo=c=>c===0?'快晴':c===1?'晴れ':c===2?'薄曇り':c===3?'曇り':(c===45||c===48)?'霧':[51,53,55,56,57,61,80].includes(c)?'小雨':[71,73,75,77,85,86].includes(c)?'雪':'雨';
const windL=v=>v<0.3?'無風':v<3?'弱い':v<8?'やや強い':'強い';
async function autoWeather(pre,info,msgEl){
  msgEl.textContent='取得中…';
  const g=await getFix();
  if(!g.lat){msgEl.textContent='現在地を取得できませんでした。位置情報の許可を確認してください。';return}
  const url=`https://api.open-meteo.com/v1/forecast?latitude=${g.lat}&longitude=${g.lon}${g.alt!==''&&g.alt!=null?'&elevation='+g.alt:''}&current=temperature_2m,weather_code,wind_speed_10m&wind_speed_unit=ms&timezone=auto`;
  const ac=new AbortController(),to=setTimeout(()=>ac.abort(),10000);
  try{
    const r=await fetch(url,{signal:ac.signal});if(!r.ok)throw new Error('http');
    const c=(await r.json()).current;if(!c)throw new Error('nodata');
    const w=wmo(c.weather_code),wd=windL(c.wind_speed_10m),t=Math.round(c.temperature_2m*10)/10;
    const set=(k,v)=>{info()[k]=v;$('#'+pre+k).value=v};
    set('weather',w);set('wind',wd);set('temp',t);save();
    msgEl.textContent=`自動入力しました(${w}・風${c.wind_speed_10m}m/s・${t}℃)。気象モデルの推定値です。実際と違う場合は修正してください。`;
  }catch(e){msgEl.textContent='取得できませんでした。電波のある場所でもう一度試してください。'}
  finally{clearTimeout(to)}
}
$('#wxBtn').onclick=()=>autoWeather('',()=>D.info,$('#wxMsg'));
$('#pwxBtn').onclick=()=>autoWeather('p_',()=>D.pt.info,$('#pwxMsg'));

/* ---------- 出力用データ ---------- */
const lookup=sp=>{const f=INFO[sp]||[];return {sci:f[0]||'',fam:f[1]||'',rl:f[2]||''}};
const withInfo=rows=>rows.map(r=>Object.assign({},r,lookup(r.sp)));
const segLabel=()=>(OPT.seg.find(o=>o[0]===(D.set.seg||'off'))||[0,''])[1];
const HI=[['date','調査日'],['mountain','観測場所（山名）'],['route','ルート'],['members','調査者'],['start','開始時刻'],['end','終了時刻'],['weather','天気'],['wind','風'],['temp','気温(℃)'],['dist','総歩行距離(km)'],['tkm','軌跡の距離(km)'],['tdur','軌跡の所要時間'],['tgain','累積の登り(m)'],['tloss','累積の下り(m)'],['tmax','最高標高(m)'],['tmin','最低標高(m)'],['segm','区間の割り当て'],['note','メモ']];
const HB=[['time','時刻'],['sp','種名'],['sci','学名'],['fam','科'],['rl','環境省RL(2020)'],['cnt','個体数'],['how','確認方法'],['sex','雌雄・成幼'],['beh','行動'],['seg','区間'],['off','ルートからの距離(m)'],['lat','緯度'],['lon','経度'],['alt','標高(m)'],['acc','位置誤差(m)'],['memo','メモ']];
const HE=[['time','時刻'],['veg','植生'],['seg','区間'],['state','林の状態・下草・水場'],['food','餌資源'],['human','人為的影響'],['lat','緯度'],['lon','経度'],['alt','標高(m)'],['acc','位置誤差(m)']];
const HT=[['dt','日時'],['lat','緯度'],['lon','経度'],['alt','標高(m)'],['cd','累積距離(m)']];
const HPI=[['date','観察日'],['site','観測場所（山名）'],['members','観察者'],['start','開始時刻'],['end','終了時刻'],['weather','天気'],['wind','風'],['temp','気温(℃)'],['note','メモ']];
const HPR=[['time','時刻'],['sp','種名'],['sci','学名'],['fam','科'],['rl','環境省RL(2020)'],['cnt','個体数'],['how','確認方法'],['sex','雌雄・成幼'],['beh','行動'],['lat','緯度'],['lon','経度'],['src','位置の取得方法'],['memo','メモ']];
const tab=(H,rows,no=1)=>rows.map((r,i)=>Object.fromEntries((no?[['No.',i+1]]:[]).concat(H.map(([k,l])=>[l,r[k]===undefined?'':r[k]]))));
const dtStr=t=>{const d=new Date(t);return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`};
function thin(a,max){if(a.length<=max)return a;const k=Math.ceil(a.length/max);return a.filter((_,i)=>i%k===0||i===a.length-1)}
function infoRow(){
  const s=trkStats()||{};
  return Object.assign({},D.info,{tkm:s.dist!=null?+(s.dist/1000).toFixed(2):'',tdur:s.dur!=null?fmtDur(s.dur):'',tgain:s.gain==null?'':s.gain,tloss:s.loss==null?'':s.loss,tmax:s.max==null?'':s.max,tmin:s.min==null?'':s.min,segm:segLabel()});
}
const sheets=()=>[
  ['調査概要',tab(HI,[infoRow()],0)],
  ['鳥記録',tab(HB,withInfo(D.birds))],
  ['環境記録',tab(HE,D.envs)],
  ['軌跡',tab(HT,thin(D.track,5000).map(p=>({dt:dtStr(p.t),lat:p.lat,lon:p.lon,alt:p.alt,cd:p.cd})))]
];
const LEGEND=['環境省RL(2020)の区分: EX 絶滅 / EW 野生絶滅 / CR 絶滅危惧IA類 / EN 絶滅危惧IB類 / VU 絶滅危惧II類 / NT 準絶滅危惧 / DD 情報不足 / LP 地域個体群','環境省RLは環境省レッドリスト2020(鳥類)と照合済みです(以降の改訂は未反映)。学名・科は作成者の知識による入力で、誤りや抜けがありえます。公式の資料で確認してください。','環境省RLの空欄は「種としては掲載なし」の意味です。ヤマドリ・ヤマガラ・メグロなど、一部の亜種のみ掲載の種も空欄です。亜種・地域個体群の評価は種名にまとめて表示しています(例: ハヤブサ=亜種ハヤブサの区分)。','軌跡の累積の登り・下りは、GPSの標高を3m以上の変化でカウントした目安です。','地図は国土地理院タイルを使用しています。'];

/* ---------- 確認ダイアログ・クリア ---------- */
function askClear(file,who,r){return new Promise(res=>{
  r=r||{mode:'local',reason:'not configured'};
  const drive=r.mode==='drive',cfg=r.reason==='not configured';
  $('#dtitle').textContent=drive?'✓ アップロードが完了しました':(cfg?'✓ 出力が完了しました':'出力しました(端末に保存)');
  const dm=$('#dmode');dm.textContent='';
  if(drive){dm.append('Googleドライブの指定フォルダに保存しました。');if(r.url){const a=document.createElement('a');a.href=r.url;a.target='_blank';a.rel='noopener';a.textContent=' ドライブで開く';dm.append(a)}}
  else if(!cfg)dm.textContent='アップロードできなかったため、端末に保存しました。電波のある場所でもう一度「出力」を押すと、アップロードできます。(理由: '+(r.reason==='unauthorized'?'アップロード設定が合っていません':r.reason)+')';
  $('#dnote').textContent=drive?'ドライブへの保存を確認できました。記録データを消去するか選んでください。':'ファイルが端末に保存されたことを確認してから、記録データを消去するか選んでください。';
  $('#dfn').textContent=file;$('#dwho').textContent=who+'の記録が対象です。消去すると元に戻せません。';
  const d=$('#dlg');d.hidden=false;$('#dNo').focus();
  const end=v=>{d.hidden=true;$('#dYes').onclick=$('#dNo').onclick=null;res(v)};
  $('#dYes').onclick=()=>end(true);$('#dNo').onclick=()=>end(false);
})}
function clearLine(){
  if(D.trk.on)trkStop();
  D.info={date:today()};D.birds=[];D.envs=[];D.track=[];D.trk={on:false};save();
  IDS.forEach(k=>$('#'+k).value=D.info[k]||'');render();updTrk();
}
function clearPoint(){D.pt={info:{date:today()},rows:[]};save();PI.forEach(k=>$('#p_'+k).value=D.pt.info[k]||'');pins();prender()}
async function afterExport(file,who,fn,msgEl,r){if(await askClear(file,who,r)){fn();msgEl.textContent=((r&&r.mode==='drive')?'アップロードしました。':'出力しました。')+'記録データを消去しました。'}}
const outName=(d,p,k)=>`${(d||today()).replace(/-/g,'')}-${(p||'場所未入力').replace(/[\\/:*?"<>|\s]/g,'')}-${k}`;
const fname=()=>outName(D.info.date,D.info.mountain,'LineCensus');
/* ---------- 出力ファイルの送り先(Googleドライブ。未設定または失敗時は端末に保存) ---------- */
const UP=window.UPLOAD||{};
const upOn=()=>/^https:\/\//.test(UP.url||'');
const blobB64=b=>new Promise((ok,ng)=>{const f=new FileReader();f.onload=()=>ok(String(f.result).split(',')[1]);f.onerror=ng;f.readAsDataURL(b)});
async function deliver(blob,name){
  if(!upOn()){download(blob,name);return{mode:'local',reason:'not configured',name}}
  const ac=new AbortController(),to=setTimeout(()=>ac.abort(),90000);
  try{
    // ヘッダーを付けない(text/plain)ので、事前確認の通信なしで送れる
    const res=await fetch(UP.url,{method:'POST',body:JSON.stringify({token:UP.token||'',name,mime:blob.type||'application/octet-stream',data:await blobB64(blob)}),signal:ac.signal});
    const j=await res.json();
    if(!j||!j.ok)throw new Error((j&&j.error)||'upload failed');
    return{mode:'drive',name:j.name||name,url:j.url||''};
  }catch(e){download(blob,name);return{mode:'local',reason:e&&e.name==='AbortError'?'時間切れ':(e instanceof TypeError||e instanceof SyntaxError)?'通信できませんでした':String((e&&e.message)||e),name}}
  finally{clearTimeout(to)}
}
const doneMsg=r=>r.mode==='drive'?'Googleドライブにアップロードしました':(r.reason==='not configured'?'出力しました':'アップロードできなかったため、端末に保存しました');
const download=(blob,name)=>{const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),10000)};

/* ---------- 出力用の地図画像 ---------- */
let mapMode='';
async function drawMap(P0,trk){
  const P=P0||[];trk=trk||[];
  if(!P0){
    D.birds.forEach((b,i)=>b.lat!==''&&b.lat!=null&&P.push({x:b.lon,y:b.lat,n:i+1,k:0}));
    D.envs.forEach((b,i)=>b.lat!==''&&b.lat!=null&&P.push({x:b.lon,y:b.lat,n:i+1,k:1}));
  }
  if(!P.length&&!trk.length)return null;
  const W=1000,H=750,T=256,pad2=90;
  const px=(lo,z)=>(lo+180)/360*T*2**z,py=(la,z)=>{const s=Math.sin(la*rad);return(0.5-Math.log((1+s)/(1-s))/(4*Math.PI))*T*2**z};
  const all=P.map(p=>[p.x,p.y]).concat(trk.map(p=>[p.lon,p.lat]));
  const xs=all.map(a=>a[0]),ys=all.map(a=>a[1]),x0=Math.min(...xs),x1=Math.max(...xs),y0=Math.min(...ys),y1=Math.max(...ys);
  let z=16;while(z>5&&(Math.abs(px(x1,z)-px(x0,z))>W-2*pad2||Math.abs(py(y0,z)-py(y1,z))>H-2*pad2))z--;
  const ox=(px(x0,z)+px(x1,z))/2-W/2,oy=(py(y0,z)+py(y1,z))/2-H/2;
  const c=document.createElement('canvas');c.width=W;c.height=H;const g=c.getContext('2d');
  g.fillStyle='#e8eeea';g.fillRect(0,0,W,H);
  let ok=0;const jobs=[];
  for(let ty=Math.floor(oy/T);ty<=Math.floor((oy+H)/T);ty++)for(let tx=Math.floor(ox/T);tx<=Math.floor((ox+W)/T);tx++)jobs.push(new Promise(res=>{
    const im=new Image(),t=setTimeout(res,8000);im.crossOrigin='anonymous';
    im.onload=()=>{clearTimeout(t);g.drawImage(im,tx*T-ox,ty*T-oy);ok++;res()};
    im.onerror=()=>{clearTimeout(t);res()};
    im.src=`https://cyberjapandata.gsi.go.jp/xyz/std/${z}/${tx}/${ty}.png`;
  }));
  await Promise.all(jobs);mapMode=ok?'tile':'plain';
  g.font='12px sans-serif';g.textBaseline='middle';
  if(!ok){g.strokeStyle='#c6d3ca';g.lineWidth=1;for(let i=0;i<W;i+=100){g.beginPath();g.moveTo(i,0);g.lineTo(i,H);g.stroke()}for(let i=0;i<H;i+=100){g.beginPath();g.moveTo(0,i);g.lineTo(W,i);g.stroke()}g.fillStyle='#55665c';g.textAlign='left';g.fillText('地図を取得できないため位置のみ表示 (縮尺 z'+z+')',10,H-12)}
  if(trk.length>1){g.beginPath();trk.forEach((p,i)=>{const X=px(p.lon,z)-ox,Y=py(p.lat,z)-oy;i?g.lineTo(X,Y):g.moveTo(X,Y)});g.lineJoin='round';g.lineWidth=6;g.strokeStyle='#fff';g.stroke();g.lineWidth=3;g.strokeStyle='#2a6fdb';g.stroke()}
  P.forEach(p=>{const X=px(p.x,z)-ox,Y=py(p.y,z)-oy;g.beginPath();if(p.k)g.rect(X-11,Y-11,22,22);else g.arc(X,Y,11,0,7);g.fillStyle=p.k?'#d9640f':'#1b7f4b';g.fill();g.lineWidth=2.5;g.strokeStyle='#fff';g.stroke();g.fillStyle='#fff';g.font='bold 12px sans-serif';g.textAlign='center';g.fillText(p.n,X,Y)});
  if(ok){g.fillStyle='rgba(255,255,255,.85)';g.fillRect(W-130,H-22,130,22);g.fillStyle='#333';g.font='12px sans-serif';g.textAlign='right';g.fillText('地図: 地理院タイル',W-6,H-11)}
  return c.toDataURL('image/png');
}
function addSheet(wb,n,r){
  const ws=wb.addWorksheet(n);if(!r.length)return;
  const h=Object.keys(r[0]);ws.columns=h.map(k=>({header:k,key:k,width:Math.max(8,k.length*2+2)}));
  ws.addRows(r);ws.getRow(1).font={bold:true};ws.views=[{state:'frozen',ySplit:1}];
}
function addLegend(wb){const ws=wb.addWorksheet('凡例');ws.getColumn(1).width=110;LEGEND.forEach(t=>ws.addRow([t]))}
const XLSX_MIME='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

$('#exp').onclick=async()=>{
  if(!window.ExcelJS){alert('Excel出力ライブラリを読み込めませんでした。電波のある場所で開き直すか、CSV出力を使ってください。');return}
  const m=$('#expMsg');m.textContent='作成中…(地図の取得にはネット接続が必要です)';
  try{
    const wb=new ExcelJS.Workbook();
    sheets().forEach(([n,r])=>{if(n==='軌跡'&&!r.length)return;addSheet(wb,n,r)});
    const url=await drawMap(null,thin(D.track,1500)),ws=wb.addWorksheet('地図');
    if(url){ws.getCell('A1').value='● 鳥の記録 / ■ 環境の記録(番号は各シートのNo.) / 青い線: 歩いた軌跡';ws.addImage(wb.addImage({base64:url,extension:'png'}),{tl:{col:0,row:2},ext:{width:800,height:600}})}
    else ws.getCell('A1').value='位置情報のある記録がありません。';
    addLegend(wb);
    if(upOn())m.textContent='アップロード中…';
    const r=await deliver(new Blob([await wb.xlsx.writeBuffer()],{type:XLSX_MIME}),fname()+'.xlsx');
    m.textContent=doneMsg(r)+(mapMode==='plain'?'(地図を取得できず簡易プロットで出力)':'');
    await afterExport(r.name,'Line Census',clearLine,m,r);
  }catch(e){m.textContent='出力に失敗しました: '+e.message}
};
$('#expCsv').onclick=async()=>{
  const S=sheets().filter(([n,r])=>r.length),m=$('#expMsg');if(!S.length)return;
  m.textContent=upOn()?'アップロード中…':'出力中…';
  const rs=[];
  for(const [n,r] of S){
    const h=Object.keys(r[0]),q=v=>'"'+String(v).replace(/"/g,'""')+'"';
    const tx='\ufeff'+[h.map(q).join(',')].concat(r.map(o=>h.map(k=>q(o[k])).join(','))).join('\r\n');
    const x=await deliver(new Blob([tx],{type:'text/csv'}),`${fname()}_${n}.csv`);rs.push(x);
    if(x.mode==='local')await new Promise(ok=>setTimeout(ok,400));
  }
  const bad=rs.find(x=>x.mode!=='drive'),agg=bad?{mode:'local',reason:bad.reason}:{mode:'drive',url:''};
  m.textContent=doneMsg(agg);
  await afterExport(fname()+'_*.csv','Line Census',clearLine,m,agg);
};
function gpxText(){
  const x=esc,day=D.info.date||today();
  const iso=t=>{try{return new Date(t).toISOString()}catch(e){return ''}};
  const ele=a=>a!==''&&a!=null?`<ele>${a}</ele>`:'';
  const wp=(r,name,desc)=>`<wpt lat="${r.lat}" lon="${r.lon}">${ele(r.alt)}<time>${iso(day+'T'+r.time)}</time><name>${x(name)}</name><desc>${x(desc)}</desc></wpt>`;
  const W=[].concat(
    D.birds.filter(r=>r.lat!==''&&r.lat!=null).map(r=>wp(r,`${r.sp} ×${r.cnt}`,[r.how,r.beh,r.sex,r.memo].filter(Boolean).join(' / '))),
    D.envs.filter(r=>r.lat!==''&&r.lat!=null).map(r=>wp(r,`環境: ${r.veg}`,[r.state,r.food,r.human].filter(Boolean).join(' / '))));
  const T=D.track.map(p=>`<trkpt lat="${p.lat}" lon="${p.lon}">${ele(p.alt)}<time>${iso(p.t)}</time></trkpt>`).join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>\n<gpx version="1.1" creator="野鳥野帳-会員用" xmlns="http://www.topografix.com/GPX/1/1">\n<metadata><name>${x(fname())}</name></metadata>\n${W.join('\n')}\n${D.track.length?`<trk><name>${x(D.info.route||D.info.mountain||'軌跡')}</name><trkseg>\n${T}\n</trkseg></trk>`:''}\n</gpx>\n`;
}
$('#expGpx').onclick=async()=>{
  if(!D.track.length&&!D.birds.some(r=>r.lat!=='')&&!D.envs.some(r=>r.lat!=='')){$('#expMsg').textContent='出力できる軌跡・位置がまだありません。';return}
  const m=$('#expMsg');if(upOn())m.textContent='アップロード中…';
  const r=await deliver(new Blob([gpxText()],{type:'application/gpx+xml'}),fname()+'.gpx');
  m.textContent=r.mode==='drive'?'GPXをGoogleドライブにアップロードしました。':(r.reason==='not configured'?'GPXを出力しました。':'アップロードできなかったため、GPXを端末に保存しました。');
};
$('#clr').onclick=()=>{if(confirm('すべての記録を消去します。Excel出力は済んでいますか？'))clearLine()};

/* ---------- 画面切り替え ---------- */
function show(id){
  ['home','ln','pt','om'].forEach(x=>$('#'+x).hidden=x!==id);scrollTo(0,0);
  if(id==='pt')initPt();if(id==='om')initOm();if(id==='ln')updTrk();
}
$$('[data-go]').forEach(b=>b.onclick=()=>show(b.dataset.go));

/* ---------- Point Census ---------- */
const PI=['date','site','members','start','end','weather','wind','temp','note'];
PI.forEach(k=>{const e=$('#p_'+k);e.value=D.pt.info[k]||'';e.addEventListener('input',()=>{D.pt.info[k]=e.value;save()})});
$$('[data-pnow]').forEach(b=>b.onclick=()=>{const k=b.dataset.pnow;D.pt.info[k]=nowT().slice(0,5);$('#p_'+k).value=D.pt.info[k];save()});
$$('#pnav button').forEach(b=>b.onclick=()=>{$$('#pnav button,.ps').forEach(x=>x.classList.remove('on'));b.classList.add('on');$('#'+b.dataset.t).classList.add('on');if(b.dataset.t==='ps0'&&pmap)setTimeout(()=>pmap.invalidateSize(),50);prender()});
let pmap,here,cur,pend,grp;
const pinI=(n,c)=>L.divIcon({className:'',html:`<div class="pin ${c||''}">${n}</div>`,iconSize:[26,26],iconAnchor:[13,13]});
const TILE_URL='https://cyberjapandata.gsi.go.jp/xyz/std/{z}/{x}/{y}.png',TILE_ATTR='<a href="https://maps.gsi.go.jp/development/ichiran.html">地理院タイル</a>';
function initPt(){
  if(!window.L){$('#mapw').innerHTML='<p class="sub" style="padding:12px">地図ライブラリを読み込めません。電波のある場所で開き直してください。</p>';return}
  if(!pmap){
    pmap=L.map('map').setView([36.2,138.2],5);
    L.tileLayer(TILE_URL,{maxZoom:18,attribution:TILE_ATTR}).addTo(pmap);
    grp=L.layerGroup().addTo(pmap);pmap.on('click',e=>setPend(e.latlng));pins();$('#pLoc').onclick=()=>locate(1);
  }
  setTimeout(()=>pmap.invalidateSize(),50);locate(1);prender();
}
async function locate(c){
  const g=await gps();
  if(!g.lat){$('#pmsg').textContent='現在地を取得できませんでした。地図をタップしてピンを立てられます。';return}
  cur=g;
  if(here)here.setLatLng([g.lat,g.lon]);else here=L.circleMarker([g.lat,g.lon],{radius:8,color:'#fff',weight:3,fillColor:'#2a6fdb',fillOpacity:1}).addTo(pmap);
  if(c)pmap.setView([g.lat,g.lon],17);
}
function setPend(ll){if(pend)pend.setLatLng(ll);else pend=L.marker(ll,{icon:pinI('＋','new'),draggable:true}).addTo(pmap);$('#pmsg').textContent='ピンを立てました。情報を入力して「記録する」を押してください。'}
function pins(){if(!grp)return;grp.clearLayers();D.pt.rows.forEach((r,i)=>{if(r.lat!==''&&r.lat!=null)L.marker([r.lat,r.lon],{icon:pinI(i+1)}).bindPopup(`${esc(r.sp)} ×${r.cnt}`).addTo(grp)})}
$('#pAdd').onclick=()=>{
  const sp=$('#psp').value.trim(),m=$('#pmsg');if(!sp){m.textContent='種名を入力してください';return}
  let ll,src;
  if(pend){ll=pend.getLatLng();src='ピン'}else if(cur){ll={lat:cur.lat,lng:cur.lon};src='現在地'}else{m.textContent='地図をタップしてピンを立ててください';return}
  const rec={time:nowT(),sp,cnt:+$('#pcnt').value||1,how:$('#phow').value,sex:$('#psex').value,beh:$('#pbeh').value,memo:$('#pmemo').value,lat:+ll.lat.toFixed(6),lon:+ll.lng.toFixed(6),src};
  D.pt.rows.push(rec);pushRecent(sp);save();
  if(pend){pmap.removeLayer(pend);pend=null}
  setSp('psp','');$('#pcnt').value=1;$('#pmemo').value='';
  m.textContent=`${D.pt.rows.length}件目を記録しました(${src})`;pins();prender();$('#psp').focus();
  toast(sp+' を記録しました',()=>{const i=D.pt.rows.indexOf(rec);if(i>=0){D.pt.rows.splice(i,1);save();pins();prender()}});
};
function pdel(i){if(confirm('この記録を削除しますか？')){D.pt.rows.splice(i,1);save();pins();prender()}}
window.pdel=pdel;
function prender(){
  $('#pn').textContent=`(${D.pt.rows.length}件)`;
  $('#pl').innerHTML=D.pt.rows.map((b,i)=>`<div class="item"><div><b>${i+1}. ${esc(b.sp)}</b> ×${b.cnt} ${rlB(b.sp)}<br>${b.time} ${esc(b.how)}・${esc(b.beh)}・${esc(b.sex)}${b.memo?'<br>'+esc(b.memo):''}</div><div class="ib"><button class="x" onclick="openEdit('prow',${i})" aria-label="編集">✎</button><button class="x" onclick="pdel(${i})" aria-label="削除">✕</button></div></div>`).reverse().join('')||'<p class="sub">まだ記録がありません。</p>';
  $('#psum').textContent=`確認種数 ${new Set(D.pt.rows.map(b=>b.sp)).size} / 総個体数 ${D.pt.rows.reduce((a,b)=>a+(+b.cnt||0),0)}`;
}
$('#pExp').onclick=async()=>{
  if(!window.ExcelJS){alert('Excel出力ライブラリを読み込めませんでした。電波のある場所で開き直してください。');return}
  const m=$('#pExpMsg');m.textContent='作成中…(地図の取得にはネット接続が必要です)';
  try{
    const wb=new ExcelJS.Workbook();
    addSheet(wb,'調査概要',tab(HPI,[D.pt.info],0));addSheet(wb,'鳥記録',tab(HPR,withInfo(D.pt.rows)));
    const url=await drawMap(D.pt.rows.filter(r=>r.lat!==''&&r.lat!=null).map((r,i)=>({x:r.lon,y:r.lat,n:D.pt.rows.indexOf(r)+1,k:0}))),ws=wb.addWorksheet('地図');
    if(url){ws.getCell('A1').value='● 記録地点(番号は鳥記録シートのNo.)';ws.addImage(wb.addImage({base64:url,extension:'png'}),{tl:{col:0,row:2},ext:{width:800,height:600}})}else ws.getCell('A1').value='記録がありません。';
    addLegend(wb);
    const nm=outName(D.pt.info.date,D.pt.info.site,'PointCensus');
    if(upOn())m.textContent='アップロード中…';
    const r=await deliver(new Blob([await wb.xlsx.writeBuffer()],{type:XLSX_MIME}),nm+'.xlsx');
    m.textContent=doneMsg(r)+(mapMode==='plain'?'(地図を取得できず簡易プロットで出力)':'');
    await afterExport(r.name,'Point Census',clearPoint,m,r);
  }catch(e){m.textContent='出力に失敗しました: '+e.message}
};
$('#pClr').onclick=()=>{if(confirm('定点観察の記録をすべて消去します。Excel出力は済んでいますか？'))clearPoint()};

/* ---------- オフライン地図 ---------- */
const TC='gsi-tiles-v1',TILE_KB=18;
let omMap,omCircle,omStop=false,omBusy=false;
function tileXY(lat,lon,z){const n=2**z,s=Math.sin(lat*rad);return[Math.floor((lon+180)/360*n),Math.floor((0.5-Math.log((1+s)/(1-s))/(4*Math.PI))*n)]}
function tilesFor(lat,lon,r,z0,z1){
  const out=[],dLa=r/111320,dLo=r/(111320*Math.cos(lat*rad));
  for(let z=z0;z<=z1;z++){
    const [xa,yb]=tileXY(lat-dLa,lon-dLo,z),[xb,ya]=tileXY(lat+dLa,lon+dLo,z);
    for(let x=xa;x<=xb;x++)for(let y=ya;y<=yb;y++)out.push([z,x,y]);
  }
  return out;
}
const omMsg=t=>{$('#omMsg').textContent=t};
async function omCount(){
  if(!('caches' in window)){$('#omHave').textContent='この環境では地図を保存できません。';return}
  try{const n=(await (await caches.open(TC)).keys()).length;$('#omHave').textContent=n?`${n}枚(約${(n*TILE_KB/1024).toFixed(1)}MB)`:'まだ保存していません。'}catch(e){$('#omHave').textContent='確認できませんでした。'}
}
function omEst(){
  if(!omMap)return;
  const c=omMap.getCenter(),r=+$('#omR').value,[z0,z1]=$('#omZ').value.split('-').map(Number);
  if(omCircle)omCircle.setLatLng(c).setRadius(r);
  const n=tilesFor(c.lat,c.lng,r,z0,z1).length;
  $('#omEst').textContent=`この範囲: 約${n}枚(約${(n*TILE_KB/1024).toFixed(1)}MB)`+(n>3000?' ※多すぎます。範囲か詳細さを下げてください。':'');
}
async function initOm(){
  omCount();
  if(!window.L){$('#omap').innerHTML='<p class="sub" style="padding:12px">地図ライブラリを読み込めません。電波のある場所で開き直してください。</p>';return}
  if(!omMap){
    omMap=L.map('omap').setView([36.2,138.2],5);
    L.tileLayer(TILE_URL,{maxZoom:18,attribution:TILE_ATTR}).addTo(omMap);
    omCircle=L.circle(omMap.getCenter(),{radius:+$('#omR').value,color:'#d9640f',weight:2,fillOpacity:.08}).addTo(omMap);
    omMap.on('move',omEst);$('#omR').onchange=$('#omZ').onchange=omEst;
    $('#omLoc').onclick=async()=>{const g=await gps();if(g.lat)omMap.setView([g.lat,g.lon],13);else omMsg('現在地を取得できませんでした')};
    $('#omGo').onclick=omGo;$('#omDel').onclick=omDelete;
  }
  setTimeout(()=>{omMap.invalidateSize();omEst()},60);
  const g=await gps();if(g.lat&&omMap.getZoom()<8)omMap.setView([g.lat,g.lon],13);
}
async function omGo(){
  if(omBusy){omStop=true;omMsg('中止しています…');return}
  if(!('caches' in window)){omMsg('この環境では地図を保存できません');return}
  const c=omMap.getCenter(),r=+$('#omR').value,[z0,z1]=$('#omZ').value.split('-').map(Number);
  const list=tilesFor(c.lat,c.lng,r,z0,z1);
  if(list.length>3000){omMsg('範囲が広すぎます。半径か詳細さを下げてください。');return}
  if(!confirm(`${list.length}枚(約${(list.length*TILE_KB/1024).toFixed(1)}MB)を保存します。通信量にご注意ください。よろしいですか？`))return;
  omBusy=true;omStop=false;$('#omGo').textContent='中止';$('#omBar').hidden=false;
  const cache=await caches.open(TC),q=list.slice();let done=0,fail=0;
  const prog=()=>{$('#omBar i').style.width=(done/list.length*100)+'%';omMsg(`保存中… ${done}/${list.length}枚${fail?`(失敗 ${fail})`:''}`)};
  async function worker(){
    while(q.length&&!omStop){
      const [z,x,y]=q.shift(),u=TILE_URL.replace('{z}',z).replace('{x}',x).replace('{y}',y);
      try{if(!await cache.match(u)){const res=await fetch(u,{mode:'cors'});if(res.ok)await cache.put(u,res);else fail++}}catch(e){fail++}
      done++;prog();
    }
  }
  await Promise.all(Array.from({length:5},worker));
  omBusy=false;$('#omGo').textContent='この範囲を保存';
  omMsg(omStop?`中止しました(${done}枚処理)`:`保存しました(${done-fail}枚${fail?`・失敗 ${fail}枚(範囲外の海や、通信エラー)`:''})`);
  setTimeout(()=>{$('#omBar').hidden=true},1500);omCount();
}
async function omDelete(){
  if(!confirm('保存した地図をすべて削除します。よろしいですか？'))return;
  try{await caches.delete(TC);omMsg('削除しました');omCount()}catch(e){omMsg('削除できませんでした')}
}

/* ---------- 起動 ---------- */
$$('.upnote').forEach(e=>{e.textContent=upOn()?'出力したファイルは、Googleドライブの指定フォルダにアップロードされます。電波がないときは端末に保存されます。':''});
renderRecent();render();prender();updTrk();
if('serviceWorker' in navigator)addEventListener('load',()=>navigator.serviceWorker.register('sw.js').catch(()=>{}));
