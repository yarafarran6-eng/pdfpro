// ══ GLOBAL RED SCROLLBAR ══
(function(){
  function initGlobalSB(){
    var sb=document.getElementById('globalSB');
    var thumb=document.getElementById('globalThumb');
    if(!sb||!thumb)return;

    // Get the active scrollable element — pick the one with most scroll range
    function getScroller(){
      var candidates=[];
      // Sheet open?
      var overlay=document.getElementById('overlay');
      if(overlay&&overlay.classList.contains('open')){
        var sheet=document.getElementById('sheetBody');
        if(sheet)candidates.push(sheet);
      }
      // All scroll divs in active screen
      var active=document.querySelector('.screen.active');
      if(active){
        active.querySelectorAll('.scroll').forEach(function(el){candidates.push(el);});
      }
      // Pick the one with the most scrollable content
      var best=null,bestRange=0;
      candidates.forEach(function(el){
        var range=el.scrollHeight-el.clientHeight;
        if(range>bestRange){bestRange=range;best=el;}
      });
      return best||document.documentElement;
    }

    var dragging=false,startY=0,startScroll=0;

    function update(){
      var sc=getScroller();
      var scrollH=sc.scrollHeight,clientH=sc.clientHeight,scrollTop=sc.scrollTop;
      if(scrollH<=clientH+2){thumb.style.opacity='0.3';thumb.style.height='40px';thumb.style.top='0';return;}
      thumb.style.opacity='1';
      var sbH=sb.offsetHeight;
      var ratio=clientH/scrollH;
      var thumbH=Math.max(36,sbH*ratio);
      var scrollFrac=scrollTop/(scrollH-clientH);
      thumb.style.height=thumbH+'px';
      thumb.style.top=Math.round((sbH-thumbH)*scrollFrac)+'px';
    }

    // Attach listeners to all scroll containers
    function attachScrollListeners(){
      document.querySelectorAll('.scroll,.sheet-body').forEach(function(el){
        el.addEventListener('scroll',update,{passive:true});
      });
      window.addEventListener('resize',update);
    }
    attachScrollListeners();
    // Patch showScreen to update scrollbar on screen switch
    setTimeout(function(){
      if(typeof showScreen==='function'){
        var _orig=showScreen;
        window.showScreen=function(n){_orig(n);setTimeout(update,80);};
      }
      if(typeof openSheet==='function'){
        var _orig2=openSheet;
        window.openSheet=function(t,fn){_orig2(t,fn);setTimeout(update,100);};
      }
    },200);
    setInterval(update,600);
    update();

    function scrollToFrac(frac){
      var sc=getScroller();
      sc.scrollTop=(sc.scrollHeight-sc.clientHeight)*frac;
      update();
    }

    // Mouse drag on thumb
    thumb.addEventListener('mousedown',function(e){
      e.preventDefault();e.stopPropagation();
      dragging=true;startY=e.clientY;
      var sc=getScroller();startScroll=sc.scrollTop;
      thumb.style.cursor='grabbing';
    });
    document.addEventListener('mousemove',function(e){
      if(!dragging)return;
      var sc=getScroller();
      var sbH=sb.offsetHeight,scrollH=sc.scrollHeight,clientH=sc.clientHeight;
      var thumbH=Math.max(36,sbH*(clientH/scrollH));
      var track=sbH-thumbH,range=scrollH-clientH;
      sc.scrollTop=startScroll+(track>0?(e.clientY-startY)/track*range:0);
      update();
    });
    document.addEventListener('mouseup',function(){if(dragging){dragging=false;thumb.style.cursor='grab';}});

    // Click on track (not thumb)
    sb.addEventListener('mousedown',function(e){
      if(e.target===thumb)return;
      var r=sb.getBoundingClientRect();
      scrollToFrac((e.clientY-r.top)/r.height);
    });

    // Touch drag on thumb
    thumb.addEventListener('touchstart',function(e){
      e.preventDefault();e.stopPropagation();
      dragging=true;startY=e.touches[0].clientY;
      var sc=getScroller();startScroll=sc.scrollTop;
      thumb.style.cursor='grabbing';
    },{passive:false});

    document.addEventListener('touchmove',function(e){
      if(!dragging)return;
      e.preventDefault();
      var sc=getScroller();
      var sbH=sb.offsetHeight,scrollH=sc.scrollHeight,clientH=sc.clientHeight;
      var thumbH=Math.max(36,sbH*(clientH/scrollH));
      var track=sbH-thumbH,range=scrollH-clientH;
      sc.scrollTop=startScroll+(track>0?(e.touches[0].clientY-startY)/track*range:0);
      update();
    },{passive:false});

    document.addEventListener('touchend',function(e){
      if(dragging){dragging=false;thumb.style.cursor='grab';}
    });

    // Touch tap on track
    sb.addEventListener('touchstart',function(e){
      if(e.target===thumb)return;
      e.preventDefault();
      var r=sb.getBoundingClientRect();
      scrollToFrac((e.touches[0].clientY-r.top)/r.height);
    },{passive:false});
  }
  if(document.readyState==='loading'){document.addEventListener('DOMContentLoaded',initGlobalSB);}
  else{initGlobalSB();}
})();

// ══ GLOBAL PINCH ZOOM FOR CANVAS ELEMENTS ══
// Applied automatically to any canvas with data-zoomable="true"
function setupCanvasZoom(wrap,inner,cv,baseWFn,baseHFn){
  if(!wrap||!inner||!cv)return;
  var zoom=1,panX=0,panY=0;
  var lastDist=null;
  var panStart=null;

  function clamp(x,y){
    var bw=baseWFn()*zoom,bh=baseHFn()*zoom;
    var ww=wrap.offsetWidth,wh=wrap.offsetHeight;
    return{x:Math.min(0,Math.max(ww-bw,x)),y:Math.min(0,Math.max(wh-bh,y))};
  }
  function apply(){
    var p=clamp(panX,panY);panX=p.x;panY=p.y;
    inner.style.transform='translate('+panX+'px,'+panY+'px) scale('+zoom+')';
  }
  function zoomAt(factor,cx,cy){
    var oldZ=zoom,newZ=Math.min(10,Math.max(0.15,oldZ*factor));
    if(Math.abs(newZ-oldZ)<0.001)return;
    var r=wrap.getBoundingClientRect();
    var px=(cx-r.left-panX)/oldZ,py=(cy-r.top-panY)/oldZ;
    zoom=newZ;panX=cx-r.left-px*newZ;panY=cy-r.top-py*newZ;apply();
  }

  wrap.addEventListener('touchstart',function(e){
    e.preventDefault();
    if(e.touches.length===1){lastDist=null;panStart={sx:e.touches[0].clientX,sy:e.touches[0].clientY,px0:panX,py0:panY};}
    else if(e.touches.length===2){panStart=null;lastDist=Math.hypot(e.touches[0].clientX-e.touches[1].clientX,e.touches[0].clientY-e.touches[1].clientY);}
  },{passive:false});
  wrap.addEventListener('touchmove',function(e){
    e.preventDefault();
    if(e.touches.length===1&&panStart){panX=panStart.px0+(e.touches[0].clientX-panStart.sx);panY=panStart.py0+(e.touches[0].clientY-panStart.sy);apply();}
    else if(e.touches.length===2){
      var dist=Math.hypot(e.touches[0].clientX-e.touches[1].clientX,e.touches[0].clientY-e.touches[1].clientY);
      if(lastDist&&lastDist>0)zoomAt(dist/lastDist,(e.touches[0].clientX+e.touches[1].clientX)/2,(e.touches[0].clientY+e.touches[1].clientY)/2);
      lastDist=dist;
    }
  },{passive:false});
  wrap.addEventListener('touchend',function(e){if(e.touches.length<2)lastDist=null;if(e.touches.length===0)panStart=null;});

  var md=false,msx=0,msy=0,mpx=0,mpy=0;
  wrap.addEventListener('mousedown',function(e){md=true;wrap.style.cursor='grabbing';msx=e.clientX;msy=e.clientY;mpx=panX;mpy=panY;});
  document.addEventListener('mousemove',function(e){if(!md)return;panX=mpx+(e.clientX-msx);panY=mpy+(e.clientY-msy);apply();});
  document.addEventListener('mouseup',function(){if(md){md=false;wrap.style.cursor='grab';}});
  wrap.addEventListener('wheel',function(e){
    e.preventDefault();
    if(e.ctrlKey||e.metaKey)zoomAt(e.deltaY>0?0.88:1.13,e.clientX,e.clientY);
    else{panX-=e.deltaX;panY-=e.deltaY;apply();}
  },{passive:false});

  return{reset:function(){zoom=1;panX=0;panY=0;inner.style.transform='translate(0,0) scale(1)';}};
}

pdfjsLib.GlobalWorkerOptions.workerSrc='https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
const {jsPDF}=window.jspdf;

// ── LANG ─────────────────────────────────────
let _lang='ar';
function setLang(l){
  _lang=l;
  const isAr=l==='ar';
  document.getElementById('htmlRoot').lang=l;
  document.getElementById('htmlRoot').dir=isAr?'rtl':'ltr';
  document.getElementById('langVal').textContent=isAr?'العربية':'English';
  document.getElementById('langAr').classList.toggle('selected',isAr);
  document.getElementById('langEn').classList.toggle('selected',!isAr);
  document.querySelectorAll('[data-ar][data-en]').forEach(el=>{
    el.textContent=isAr?el.dataset.ar:el.dataset.en;
  });
  // Fix search placeholder
  const si=document.getElementById('searchInput');if(si)si.placeholder=isAr?'ابحث عن أداة...':'Search for a tool...';
  // Fix theme value text
  document.getElementById('themeVal').textContent=_dark?(isAr?'داكن':'Dark'):(isAr?'فاتح':'Light');
  // Fix version text
  document.getElementById('settingsVer').textContent=(isAr?'الإصدار':'Version')+': 1.0.0';
  // Fix info box
  document.getElementById('infoTitle').textContent=isAr?'PDF Pro':'PDF Pro';
  document.getElementById('infoDesc').textContent=isAr?'تطبيق متكامل لإدارة ملفات PDF والصور. يعمل بالكامل على جهازك بدون إنترنت وبدون رفع ملفاتك لأي سيرفر.':'A complete PDF and image management app. Works fully on your device with no internet and no file uploads.';
  document.getElementById('infoVer').textContent=(isAr?'الإصدار':'Version')+': 1.0.0 | '+(isAr?'جميع الحقوق محفوظة':'All Rights Reserved');
  document.getElementById('infoBtnOk').textContent=isAr?'حسناً':'OK';
  document.getElementById('langOverlay').classList.remove('open');
  toast(isAr?'تم تغيير اللغة إلى العربية':'Language changed to English','ok');
}
function openLangPicker(){document.getElementById('langOverlay').classList.add('open');}

// ── THEME ─────────────────────────────────────
let _dark=true;
function toggleTheme(){
  _dark=!_dark;
  document.body.classList.toggle('light',!_dark);
  document.getElementById('themeVal').textContent=_dark?(_lang==='ar'?'داكن':'Dark'):(_lang==='ar'?'فاتح':'Light');
  toast(_dark?(_lang==='ar'?'الوضع الداكن':'Dark Mode'):(_lang==='ar'?'الوضع الفاتح':'Light Mode'),'ok');
}

// ── SEARCH ───────────────────────────────────
const ALL_TOOLS=[
  {ar:'صورة إلى PDF',en:'Image to PDF',id:'img2pdf'},
  {ar:'PDF إلى صورة',en:'PDF to Image',id:'pdf2img'},
  {ar:'تحويل صيغ الصور',en:'Convert Image Format',id:'imgconv'},
  {ar:'بطاقة إلى PDF',en:'ID to PDF',id:'id2pdf'},
  {ar:'دمج PDF',en:'Merge PDF',id:'merge'},
  {ar:'تقسيم PDF',en:'Split PDF',id:'split'},
  {ar:'ضغط الصور',en:'Compress Images',id:'compressImg'},
  {ar:'علامة مائية',en:'Watermark',id:'watermark'},
  {ar:'تعديل الصورة',en:'Edit Image',id:'imgedit'},
  {ar:'تحويل إلى بكسل',en:'Pixelate Image',id:'pixelate'},
  {ar:'قارئ باركود',en:'Barcode Reader',id:'barcode'},
  {ar:'صوت إلى نص',en:'Speech to Text',id:'stt'},
  {ar:'تحويل صيغة الصوت',en:'Audio Convert',id:'audioconv'},
  {ar:'إضافة نص',en:'Add Text',id:'addtext'},
  {ar:'توقيع رقمي',en:'Signature',id:'signature'},
  {ar:'ملاحظة',en:'Note',id:'note'},
  {ar:'محرر النصوص',en:'Text Editor',id:'texteditor'},
  {ar:'استخراج نص',en:'Extract Text',id:'extract'},
  {ar:'ضغط الملفات',en:'Compress Files',id:'compressFile'},
  {ar:'قفل PDF',en:'Lock PDF',id:'lockPdf'},
  {ar:'طباعة',en:'Print',id:'printTool'},
];
function openSearch(){document.getElementById('searchBar').classList.add('open');document.getElementById('searchInput').focus();}
function closeSearch(){document.getElementById('searchBar').classList.remove('open');document.getElementById('searchResults').classList.remove('open');document.getElementById('searchInput').value='';}
function doSearch(q){
  const res=document.getElementById('searchResults');
  if(!q){res.classList.remove('open');return;}
  const matches=ALL_TOOLS.filter(t=>(t.ar+t.en).toLowerCase().includes(q.toLowerCase()));
  if(!matches.length){res.innerHTML=`<div class="search-item" style="color:var(--text3)">${_lang==='ar'?'لا نتائج':'No results'}</div>`;res.classList.add('open');return;}
  res.innerHTML=matches.map(t=>`<div class="search-item" onclick="openTool('${t.id}');closeSearch()"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--red)" stroke-width="2" stroke-linecap="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>${_lang==='ar'?t.ar:t.en}</div>`).join('');
  res.classList.add('open');
}

// ── INFO / MENU ───────────────────────────────
function openInfo(){document.getElementById('infoOverlay').classList.add('open');}
function openToolsMenu(){document.getElementById('menuOverlay').classList.add('open');}

// ── NAV ──────────────────────────────────────
function showScreen(n){
  document.querySelectorAll('.screen').forEach(s=>s.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(b=>b.classList.remove('active'));
  document.getElementById('s-'+n).classList.add('active');
  document.getElementById('nav-'+n).classList.add('active');
}

// ── SHEET ─────────────────────────────────────
function openSheet(title,fn){document.getElementById('sheetTitle').textContent=title;document.getElementById('sheetBody').innerHTML='';document.getElementById('overlay').classList.add('open');fn();}
function closeSheet(){document.getElementById('overlay').classList.remove('open');var psb=document.getElementById('pxPageSB');if(psb)psb.style.display='none';}
function overlayBg(e){if(e.target===document.getElementById('overlay'))closeSheet();}

// ── TOOLS ─────────────────────────────────────
const TOOLS={
  img2pdf:[{ar:'صورة إلى PDF',en:'Image to PDF'},buildImg2PDF],
  pdf2img:[{ar:'PDF إلى صورة',en:'PDF to Image'},buildPdf2Img],
  imgconv:[{ar:'تحويل صيغ الصور',en:'Convert Image Format'},buildImgConv],
  id2pdf:[{ar:'بطاقة إلى PDF',en:'ID to PDF'},buildId2PDF],
  merge:[{ar:'دمج PDF',en:'Merge PDF'},buildMerge],
  split:[{ar:'تقسيم PDF',en:'Split PDF'},buildSplit],
  compressImg:[{ar:'ضغط الصور',en:'Compress Images'},buildCompressImg],
  watermark:[{ar:'علامة مائية',en:'Watermark'},buildWatermark],
  imgedit:[{ar:'تعديل الصورة',en:'Edit Image'},buildImgEdit],
  pixelate:[{ar:'تحويل إلى بكسل',en:'Pixelate Image'},buildPixelate],
  addtext:[{ar:'إضافة نص',en:'Add Text'},buildAddText],
  signature:[{ar:'توقيع رقمي',en:'Signature'},buildSignature],
  note:[{ar:'ملاحظة',en:'Note'},buildNote],
  texteditor:[{ar:'محرر النصوص',en:'Text Editor'},buildTextEditor],
  folder:[{ar:'إنشاء مجلد',en:'New Folder'},buildFolder],
  barcode:[{ar:'قارئ باركود',en:'Barcode Reader'},buildBarcode],
  stt:[{ar:'صوت إلى نص',en:'Speech to Text'},buildSTT],
  audioconv:[{ar:'تحويل صيغة الصوت',en:'Audio Convert'},buildAudioConv],
  extract:[{ar:'استخراج نص',en:'Extract Text'},buildExtract],
  compressFile:[{ar:'ضغط الملفات',en:'Compress Files'},buildCompressFile],
  lockPdf:[{ar:'قفل PDF',en:'Lock PDF'},buildLockPDF],
  printTool:[{ar:'طباعة',en:'Print'},buildPrintTool],
};
function openTool(id){const t=TOOLS[id];if(!t)return;openSheet(_lang==='ar'?t[0].ar:t[0].en,t[1]);}
function comingSoon(){toast(_lang==='ar'?'هذه الميزة قادمة قريباً ✨':'Coming soon ✨');}

// ── TOAST ─────────────────────────────────────
let _tt;
function toast(msg,type=''){const el=document.getElementById('toast');el.textContent=msg;el.className='toast show'+(type?' '+type:'');clearTimeout(_tt);_tt=setTimeout(()=>el.classList.remove('show'),type==='err'?6000:2500);}

// ── UTILS ─────────────────────────────────────
function imgToData(url,q){return new Promise((res,rej)=>{const img=new Image();img.onload=()=>{const c=document.createElement('canvas');c.width=img.naturalWidth;c.height=img.naturalHeight;c.getContext('2d').drawImage(img,0,0);res({w:img.naturalWidth,h:img.naturalHeight,data:c.toDataURL('image/jpeg',q)});};img.onerror=rej;img.src=url;});}
function delay(ms){return new Promise(r=>setTimeout(r,ms));}
function fmtSize(b){return b<1048576?(b/1024).toFixed(0)+' KB':(b/1048576).toFixed(1)+' MB';}
function icoF(){return`<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#e53935" stroke-width="1.8" stroke-linecap="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>`;}
function icoI(){return`<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#4a9eff" stroke-width="1.8" stroke-linecap="round"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>`;}
function icoDl(){return`<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>`;}
function icoX(){return`<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`;}
function desc(ar,en){return`<div class="tool-desc"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#e53935" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg><p>${_lang==='ar'?ar:en}</p></div>`;}

// ── FILES ─────────────────────────────────────
const _files=[];
function addFile(name,type){const d=new Date();_files.unshift({name,type,date:`${d.getDate()}/${d.getMonth()+1}/${d.getFullYear()}`});renderFiles('all');}
function filterFiles(type,btn){document.querySelectorAll('.ftype-tab').forEach(t=>t.classList.remove('active'));btn.classList.add('active');renderFiles(type);}
function renderFiles(type){const body=document.getElementById('fileListBody');const list=type==='all'?_files:_files.filter(f=>f.type===type);if(!list.length){body.innerHTML=`<div class="empty-state"><svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--text3)" stroke-width="1.5"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg><p>${_lang==='ar'?'لا توجد ملفات':'No files yet'}</p></div>`;return;}body.innerHTML=list.map(f=>`<div class="file-row"><div class="f-thumb">${icoF()}</div><div class="f-info"><div class="f-name">${f.name}</div><div class="f-meta">${f.date}</div></div><button class="f-more"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="5" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="12" cy="19" r="1"/></svg></button></div>`).join('');}

// ── PDF PAGES ─────────────────────────────────
async function previewPDFPages(file,gridId){
  const grid=document.getElementById(gridId);if(!grid)return;
  grid.style.display='grid';grid.innerHTML=`<p style="grid-column:1/-1;font-size:12px;color:var(--text3)">${_lang==='ar'?'جاري التحميل...':'Loading...'}</p>`;
  try{
    const ab=await file.arrayBuffer();const pdf=await pdfjsLib.getDocument({data:ab}).promise;
    grid.innerHTML='';window['_pdf_'+gridId]=pdf;
    for(let i=1;i<=Math.min(pdf.numPages,9);i++){
      const page=await pdf.getPage(i);const vp=page.getViewport({scale:.4});
      const cv=document.createElement('canvas');cv.width=vp.width;cv.height=vp.height;
      await page.render({canvasContext:cv.getContext('2d'),viewport:vp}).promise;
      const card=document.createElement('div');card.className='ppc';
      card.innerHTML=`<div class="ppc-chk"><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="3" stroke-linecap="round"><polyline points="20 6 9 17 4 12"/></svg></div><span class="ppc-num">${_lang==='ar'?'صفحة':'P'} ${i}</span>`;
      card.appendChild(cv);card.addEventListener('click',()=>card.classList.toggle('selected'));
      grid.appendChild(card);
    }
    if(pdf.numPages>9)grid.insertAdjacentHTML('beforeend',`<p style="grid-column:1/-1;font-size:11px;color:var(--text3);text-align:center">+${pdf.numPages-9}</p>`);
  }catch(e){grid.innerHTML=`<p style="grid-column:1/-1;font-size:12px;color:var(--text3)">${_lang==='ar'?'سيتم تحويل الملف كاملاً':'Full file will be processed'}</p>`;}
}

// ══════════════ TOOL BUILDERS ══════════════

// صورة إلى PDF
let _i2p=[],_i2pDrag=null;
function buildImg2PDF(){
  _i2p=[];
  document.getElementById('sheetBody').innerHTML=`
    ${desc('تجمع عدة صور في ملف PDF واحد. رتّبها بالسحب ثم حمّل.','Combine multiple images into one PDF.')}
    <div class="drop-zone" id="i2pDrop"><input type="file" id="i2pIn" accept="image/*" multiple>
      <div class="dz-icwrap"><svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke-width="1.8" stroke-linecap="round"><rect stroke="#e53935" x="3" y="3" width="18" height="18" rx="2"/><circle stroke="#e53935" cx="8.5" cy="8.5" r="1.5"/><polyline stroke="#e53935" points="21 15 16 10 5 21"/></svg></div>
      <div class="dz-t">${_lang==='ar'?'اختر الصور':'Choose Images'}</div><div class="dz-s">JPG · PNG · WEBP</div></div>
    <div id="i2pGrid" class="thumb-grid" style="display:none"></div>
    <label class="add-more" id="i2pMoreBtn" style="display:none"><input type="file" accept="image/*" multiple id="i2pMoreIn">${_lang==='ar'?'+ إضافة المزيد':'+ Add More'}</label>
    <div class="fields-row" id="i2pOpts" style="display:none">
      <div class="field"><label>${_lang==='ar'?'حجم الصفحة':'Page Size'}</label><select id="i2pSz"><option value="a4">A4</option><option value="a3">A3</option><option value="letter">Letter</option><option value="fit">${_lang==='ar'?'ملاءمة':'Fit'}</option></select></div>
      <div class="field"><label>${_lang==='ar'?'الاتجاه':'Orientation'}</label><select id="i2pOr"><option value="portrait">${_lang==='ar'?'عمودي':'Portrait'}</option><option value="landscape">${_lang==='ar'?'أفقي':'Landscape'}</option></select></div>
    </div>
    <div class="field" id="i2pNmW" style="display:none"><label>${_lang==='ar'?'اسم الملف':'File Name'}</label><input type="text" id="i2pNm" value="${_lang==='ar'?'مستندي':'My Document'}"></div>
    <div class="prog-box" id="i2pPB"><div class="prog-lbl" id="i2pPL">...</div><div class="prog-bar"><div class="prog-fill" id="i2pPF"></div></div></div>
    <button class="action-btn" id="i2pBtn" onclick="doI2P()" style="display:none">${icoDl()} ${_lang==='ar'?'تحميل PDF':'Download PDF'}</button>`;
  document.getElementById('i2pIn').addEventListener('change',e=>{i2pAdd([...e.target.files]);e.target.value='';});
  document.getElementById('i2pMoreIn').addEventListener('change',e=>{i2pAdd([...e.target.files]);e.target.value='';});
  const dz=document.getElementById('i2pDrop');
  dz.addEventListener('dragover',e=>{e.preventDefault();dz.classList.add('over');});
  dz.addEventListener('dragleave',()=>dz.classList.remove('over'));
  dz.addEventListener('drop',e=>{e.preventDefault();dz.classList.remove('over');i2pAdd([...e.dataTransfer.files]);});
}
function i2pAdd(fs){fs.filter(f=>f.type.startsWith('image/')).forEach(f=>_i2p.push({file:f,url:URL.createObjectURL(f)}));i2pRender();}
function i2pRender(){
  const g=document.getElementById('i2pGrid'),show=_i2p.length>0;
  g.style.display=show?'grid':'none';
  ['i2pOpts','i2pNmW','i2pMoreBtn'].forEach(id=>{const el=document.getElementById(id);if(el)el.style.display=show?(id==='i2pOpts'?'grid':'block'):'none';});
  document.getElementById('i2pBtn').style.display=show?'flex':'none';
  g.innerHTML='';
  _i2p.forEach((img,i)=>{
    const c=document.createElement('div');c.className='th-card';c.draggable=true;c.dataset.i=i;
    c.innerHTML=`<img src="${img.url}"><button class="th-del" onclick="i2pDel(${i},event)">${icoX()}</button><span class="th-num">${i+1}</span>`;
    c.addEventListener('dragstart',()=>{_i2pDrag=i;c.style.opacity='.3';});
    c.addEventListener('dragend',()=>c.style.opacity='1');
    c.addEventListener('dragover',e=>{e.preventDefault();c.classList.add('drag-over');});
    c.addEventListener('dragleave',()=>c.classList.remove('drag-over'));
    c.addEventListener('drop',e=>{e.preventDefault();c.classList.remove('drag-over');const dest=+c.dataset.i;if(_i2pDrag===dest)return;const m=_i2p.splice(_i2pDrag,1)[0];_i2p.splice(dest,0,m);i2pRender();});
    g.appendChild(c);
  });
}
function i2pDel(i,e){e.stopPropagation();URL.revokeObjectURL(_i2p[i].url);_i2p.splice(i,1);i2pRender();}
async function doI2P(){
  if(!_i2p.length)return;
  const btn=document.getElementById('i2pBtn'),pb=document.getElementById('i2pPB');
  btn.disabled=true;pb.classList.add('show');
  const sz=document.getElementById('i2pSz').value,or=document.getElementById('i2pOr').value;
  const nm=document.getElementById('i2pNm').value.trim()||'document';
  const ps={a4:[210,297],a3:[297,420],letter:[215.9,279.4]};
  try{
    let pdf=null;
    for(let i=0;i<_i2p.length;i++){
      document.getElementById('i2pPL').textContent=`${i+1}/${_i2p.length}...`;
      document.getElementById('i2pPF').style.width=(i/_i2p.length*90)+'%';
      const {w,h,data}=await imgToData(_i2p[i].url,.88);
      let pw,ph;if(sz==='fit'){pw=w*.264583;ph=h*.264583;}else{[pw,ph]=ps[sz];if(or==='landscape')[pw,ph]=[ph,pw];}
      const fo=pw>ph?'l':'p',fmt=sz==='fit'?[pw,ph]:sz;
      if(!pdf)pdf=new jsPDF({orientation:fo,unit:'mm',format:fmt});else pdf.addPage(fmt,fo);
      const r=Math.min(pw/w,ph/h),dw=w*r,dh=h*r;pdf.addImage(data,'JPEG',(pw-dw)/2,(ph-dh)/2,dw,dh);
    }
    document.getElementById('i2pPF').style.width='100%';await delay(300);
    pdf.save(nm+'.pdf');addFile(nm+'.pdf','pdf');pb.classList.remove('show');btn.disabled=false;
    toast((_lang==='ar'?'تم تحميل ':'Downloaded ')+nm+'.pdf','ok');closeSheet();
  }catch(e){pb.classList.remove('show');btn.disabled=false;toast('Error: '+e.message,'err');}
}

// PDF إلى صورة
function buildPdf2Img(){
  document.getElementById('sheetBody').innerHTML=`
    ${desc('تحوّل كل صفحة PDF إلى صورة منفصلة.','Convert each PDF page to a separate image.')}
    <div class="drop-zone"><input type="file" id="p2iIn" accept=".pdf,application/pdf">
      <div class="dz-icwrap"><svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#fb923c" stroke-width="1.8" stroke-linecap="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="12" y1="18" x2="12" y2="12"/><polyline points="9 15 12 18 15 15"/></svg></div>
      <div class="dz-t">${_lang==='ar'?'اختر ملف PDF':'Choose PDF file'}</div></div>
    <div id="p2iCont" style="display:none">
      <div class="sel-list" id="p2iList"></div>
      <div class="pdf-pages-grid" id="p2iPages"></div>
      <div class="field"><label>${_lang==='ar'?'صيغة الإخراج':'Output Format'}</label><select id="p2iFmt"><option value="jpg">JPG</option><option value="png">PNG</option><option value="webp">WEBP</option></select></div>
      <div class="prog-box" id="p2iPB"><div class="prog-lbl" id="p2iPL">...</div><div class="prog-bar"><div class="prog-fill" id="p2iPF"></div></div></div>
      <button class="action-btn" onclick="doP2I()">${icoDl()} ${_lang==='ar'?'تحميل الصور':'Download Images'}</button>
    </div>`;
  document.getElementById('p2iIn').addEventListener('change',async e=>{
    const f=e.target.files[0];if(!f)return;window._p2iF=f;
    document.getElementById('p2iList').innerHTML=`<div class="sel-item"><div class="si-icon">${icoF()}</div><span class="si-name">${f.name}</span><span class="si-size">${fmtSize(f.size)}</span></div>`;
    document.getElementById('p2iCont').style.display='block';await previewPDFPages(f,'p2iPages');
  });
}
async function doP2I(){
  const f=window._p2iF;if(!f)return;
  const fmt=document.getElementById('p2iFmt').value,mime={jpg:'image/jpeg',png:'image/png',webp:'image/webp'}[fmt];
  const pb=document.getElementById('p2iPB'),pl=document.getElementById('p2iPL'),pf=document.getElementById('p2iPF');
  pb.classList.add('show');
  try{
    const pdf=window._pdf_p2iPages;if(!pdf)throw new Error('load file first');
    for(let i=1;i<=pdf.numPages;i++){
      pl.textContent=`${i}/${pdf.numPages}...`;pf.style.width=(i/pdf.numPages*90)+'%';
      const page=await pdf.getPage(i);const vp=page.getViewport({scale:2});
      const cv=document.createElement('canvas');cv.width=vp.width;cv.height=vp.height;
      await page.render({canvasContext:cv.getContext('2d'),viewport:vp}).promise;
      await new Promise(res=>cv.toBlob(blob=>{const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=`${f.name.replace(/\.pdf$/i,'')}-p${i}.${fmt}`;a.click();setTimeout(res,150);},mime,.92));
    }
    pf.style.width='100%';await delay(300);pb.classList.remove('show');
    toast(_lang==='ar'?'تم التحويل':'Done','ok');closeSheet();
  }catch(e){pb.classList.remove('show');toast('Error: '+e.message,'err');}
}

// تحويل صيغ الصور
let _icF=[];
function buildImgConv(){
  _icF=[];
  document.getElementById('sheetBody').innerHTML=`
    ${desc('تحويل الصور بين صيغ مختلفة.','Convert images between different formats.')}
    <div class="drop-zone"><input type="file" id="icIn" accept="image/*" multiple>
      <div class="dz-icwrap"><svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#4a9eff" stroke-width="1.8" stroke-linecap="round"><polyline points="17 1 21 5 17 9"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/><polyline points="7 23 3 19 7 15"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/></svg></div>
      <div class="dz-t">${_lang==='ar'?'اختر الصور':'Choose Images'}</div></div>
    <div class="sel-list" id="icList"></div>
    <div id="icOpts" style="display:none">
      <div class="field"><label>${_lang==='ar'?'حوّل إلى':'Convert to'}</label><select id="icTo"><option value="jpg">JPG</option><option value="png">PNG</option><option value="webp">WEBP</option><option value="pdf">PDF</option></select></div>
      <button class="action-btn" onclick="doImgConv()">${icoDl()} ${_lang==='ar'?'تحويل وتحميل':'Convert & Download'}</button>
    </div>`;
  document.getElementById('icIn').addEventListener('change',e=>{_icF=[...e.target.files];icRender();});
}
function icRender(){document.getElementById('icList').innerHTML=_icF.map((f,i)=>`<div class="sel-item"><div class="si-icon">${icoI()}</div><span class="si-name">${f.name}</span><span class="si-size">${fmtSize(f.size)}</span><button class="si-del" onclick="_icF.splice(${i},1);icRender()">${icoX()}</button></div>`).join('');document.getElementById('icOpts').style.display=_icF.length?'block':'none';}
async function doImgConv(){
  const to=document.getElementById('icTo').value;
  for(const f of _icF){const base=f.name.replace(/\.[^.]+$/,''),url=URL.createObjectURL(f);if(to==='pdf'){const {w,h,data}=await imgToData(url,.9);const pw=w*.264583,ph=h*.264583;const pdf=new jsPDF({unit:'mm',format:[pw,ph]});pdf.addImage(data,'JPEG',0,0,pw,ph);pdf.save(base+'.pdf');}else{const mime={jpg:'image/jpeg',png:'image/png',webp:'image/webp'}[to];await new Promise(r=>{const img=new Image();img.onload=()=>{const c=document.createElement('canvas');c.width=img.naturalWidth;c.height=img.naturalHeight;c.getContext('2d').drawImage(img,0,0);c.toBlob(b=>{const a=document.createElement('a');a.href=URL.createObjectURL(b);a.download=base+'.'+to;a.click();r();},mime,.92);};img.src=url;});}URL.revokeObjectURL(url);}
  toast(_lang==='ar'?'تم التحويل':'Done','ok');closeSheet();
}

// بطاقة هوية
function buildId2PDF(){
  document.getElementById('sheetBody').innerHTML=`
    ${desc('يضع صورتي البطاقة في ورقة A4 واحدة.','Place ID card front & back on one A4 page.')}
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:14px">
      <div><div style="font-size:12px;color:var(--text2);margin-bottom:6px">${_lang==='ar'?'الوجه الأمامي':'Front'}</div><div class="drop-zone" style="padding:22px 8px;margin-bottom:6px"><input type="file" accept="image/*" id="idFr"><div style="font-size:12px;color:var(--text3);text-align:center">${_lang==='ar'?'اختر':'Select'}</div></div><div id="frPrev"></div></div>
      <div><div style="font-size:12px;color:var(--text2);margin-bottom:6px">${_lang==='ar'?'الوجه الخلفي':'Back'}</div><div class="drop-zone" style="padding:22px 8px;margin-bottom:6px"><input type="file" accept="image/*" id="idBk"><div style="font-size:12px;color:var(--text3);text-align:center">${_lang==='ar'?'اختر':'Select'}</div></div><div id="bkPrev"></div></div>
    </div>
    <div class="field"><label>${_lang==='ar'?'اسم الملف':'File Name'}</label><input type="text" id="idNm" value="${_lang==='ar'?'بطاقة الهوية':'ID Card'}"></div>
    <button class="action-btn" onclick="doId2PDF()">${icoDl()} ${_lang==='ar'?'تحميل PDF':'Download PDF'}</button>`;
  ['Fr','Bk'].forEach(s=>document.getElementById('id'+s).addEventListener('change',e=>{const f=e.target.files[0];if(!f)return;window['_id'+s]=URL.createObjectURL(f);document.getElementById(s.toLowerCase()+'Prev').innerHTML=`<img src="${window['_id'+s]}" style="width:100%;border-radius:6px;border:1px solid var(--border)">`;  }));
}
async function doId2PDF(){
  if(!window._idFr){toast(_lang==='ar'?'اختر الوجه الأمامي':'Choose front side','err');return;}
  const nm=document.getElementById('idNm').value.trim()||'id';
  const pdf=new jsPDF({unit:'mm',format:'a4'});
  const {data:d1}=await imgToData(window._idFr,.9);pdf.addImage(d1,'JPEG',15,15,180,120);
  if(window._idBk){const {data:d2}=await imgToData(window._idBk,.9);pdf.addImage(d2,'JPEG',15,155,180,120);}
  pdf.save(nm+'.pdf');addFile(nm+'.pdf','pdf');toast(_lang==='ar'?'تم':'Done','ok');closeSheet();
}

// دمج PDF
let _mPDFs=[];
function buildMerge(){
  _mPDFs=[];
  document.getElementById('sheetBody').innerHTML=`
    ${desc('يدمج عدة ملفات PDF أو صور في ملف PDF واحد.','Merge multiple PDFs or images into one PDF.')}
    <div class="drop-zone"><input type="file" id="mIn" accept=".pdf,application/pdf,image/*" multiple>
      <div class="dz-icwrap"><svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#fb923c" stroke-width="1.8" stroke-linecap="round"><path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/></svg></div>
      <div class="dz-t">${_lang==='ar'?'اختر الملفات':'Choose Files'}</div><div class="dz-s">PDF · ${_lang==='ar'?'صور':'Images'}</div></div>
    <div class="sel-list" id="mList"></div>
    <div id="mOpts" style="display:none">
      <div class="field"><label>${_lang==='ar'?'اسم الملف الناتج':'Output File Name'}</label><input type="text" id="mNm" value="${_lang==='ar'?'مدموج':'merged'}"></div>
      <div class="prog-box" id="mPB"><div class="prog-lbl" id="mPL">...</div><div class="prog-bar"><div class="prog-fill" id="mPF"></div></div></div>
      <button class="action-btn" id="mBtn" onclick="doMerge()">${icoDl()} ${_lang==='ar'?'دمج وتحميل':'Merge & Download'}</button>
    </div>`;
  document.getElementById('mIn').addEventListener('change',e=>{_mPDFs=[..._mPDFs,...e.target.files];mRender();e.target.value='';});
}
function mRender(){document.getElementById('mList').innerHTML=_mPDFs.map((f,i)=>`<div class="sel-item"><div class="si-icon">${f.type==='application/pdf'||f.name.endsWith('.pdf')?icoF():icoI()}</div><span class="si-name">${f.name}</span><span class="si-size">${fmtSize(f.size)}</span><button class="si-del" onclick="_mPDFs.splice(${i},1);mRender()">${icoX()}</button></div>`).join('');document.getElementById('mOpts').style.display=_mPDFs.length>1?'block':'none';}
async function doMerge(){
  if(_mPDFs.length<2){toast(_lang==='ar'?'اختر ملفين على الأقل':'Choose at least 2 files','err');return;}
  const nm=document.getElementById('mNm').value.trim()||'merged';
  const btn=document.getElementById('mBtn'),pb=document.getElementById('mPB');
  btn.disabled=true;pb.classList.add('show');
  let pdf=null;
  for(let i=0;i<_mPDFs.length;i++){
    const f=_mPDFs[i];document.getElementById('mPL').textContent=`${i+1}/${_mPDFs.length}...`;document.getElementById('mPF').style.width=(i/_mPDFs.length*90)+'%';
    const isPDF=f.type==='application/pdf'||f.name.toLowerCase().endsWith('.pdf');
    if(isPDF){const ab=await f.arrayBuffer();const sp=await pdfjsLib.getDocument({data:ab}).promise;for(let p=1;p<=sp.numPages;p++){const page=await sp.getPage(p);const vp=page.getViewport({scale:2});const cv=document.createElement('canvas');cv.width=vp.width;cv.height=vp.height;await page.render({canvasContext:cv.getContext('2d'),viewport:vp}).promise;const data=cv.toDataURL('image/jpeg',.88);const pw=vp.width*.264583/2,ph=vp.height*.264583/2;if(!pdf)pdf=new jsPDF({unit:'mm',format:[pw,ph]});else pdf.addPage([pw,ph]);pdf.addImage(data,'JPEG',0,0,pw,ph);}}
    else{const url=URL.createObjectURL(f);const {w,h,data}=await imgToData(url,.88);URL.revokeObjectURL(url);const pw=w*.264583,ph=h*.264583;if(!pdf)pdf=new jsPDF({unit:'mm',format:[pw,ph]});else pdf.addPage([pw,ph]);pdf.addImage(data,'JPEG',0,0,pw,ph);}
  }
  document.getElementById('mPF').style.width='100%';await delay(300);pdf.save(nm+'.pdf');addFile(nm+'.pdf','pdf');pb.classList.remove('show');btn.disabled=false;toast(_lang==='ar'?'تم الدمج':'Merged','ok');closeSheet();
}

// تقسيم PDF
function buildSplit(){
  document.getElementById('sheetBody').innerHTML=`
    ${desc('يستخرج صفحات مختارة من PDF كـ PDF جديد.','Extract selected pages from PDF into a new PDF.')}
    <div class="drop-zone"><input type="file" id="spIn" accept=".pdf,application/pdf">
      <div class="dz-icwrap"><svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#e53935" stroke-width="1.8" stroke-linecap="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="8" y1="13" x2="16" y2="13"/></svg></div>
      <div class="dz-t">${_lang==='ar'?'اختر ملف PDF':'Choose PDF file'}</div></div>
    <div id="spCont" style="display:none">
      <div class="sel-list" id="spList"></div>
      <p style="font-size:12px;color:var(--text2);margin-bottom:10px">${_lang==='ar'?'اضغط على الصفحات لاختيارها':'Tap pages to select them'}</p>
      <div class="pdf-pages-grid" id="spPages"></div>
      <div class="prog-box" id="spPB"><div class="prog-lbl" id="spPL">...</div><div class="prog-bar"><div class="prog-fill" id="spPF"></div></div></div>
      <button class="action-btn" onclick="doSplit()">${icoDl()} ${_lang==='ar'?'استخراج كـ PDF':'Extract as PDF'}</button>
    </div>`;
  document.getElementById('spIn').addEventListener('change',async e=>{const f=e.target.files[0];if(!f)return;window._spF=f;document.getElementById('spList').innerHTML=`<div class="sel-item"><div class="si-icon">${icoF()}</div><span class="si-name">${f.name}</span><span class="si-size">${fmtSize(f.size)}</span></div>`;document.getElementById('spCont').style.display='block';await previewPDFPages(f,'spPages');});
}
async function doSplit(){
  const f=window._spF;if(!f)return;
  const pb=document.getElementById('spPB'),pl=document.getElementById('spPL'),pf=document.getElementById('spPF');pb.classList.add('show');
  try{
    const ab=await f.arrayBuffer();const sp=await pdfjsLib.getDocument({data:ab}).promise;
    const sel=[...document.querySelectorAll('#spPages .ppc.selected')].map(c=>parseInt(c.querySelector('.ppc-num').textContent.replace(/\D/g,'')));
    const pages=sel.length?sel:Array.from({length:sp.numPages},(_,i)=>i+1);
    let pdf=null;
    for(let idx=0;idx<pages.length;idx++){
      const pNum=pages[idx];pl.textContent=`${pNum}/${sp.numPages}...`;pf.style.width=(idx/pages.length*90)+'%';
      const page=await sp.getPage(pNum);const vp=page.getViewport({scale:2});
      const cv=document.createElement('canvas');cv.width=vp.width;cv.height=vp.height;
      await page.render({canvasContext:cv.getContext('2d'),viewport:vp}).promise;
      const data=cv.toDataURL('image/jpeg',.88);const pw=vp.width*.264583/2,ph=vp.height*.264583/2;
      if(!pdf)pdf=new jsPDF({unit:'mm',format:[pw,ph]});else pdf.addPage([pw,ph]);pdf.addImage(data,'JPEG',0,0,pw,ph);
    }
    pf.style.width='100%';await delay(300);const nm=f.name.replace(/\.pdf$/i,'')+'-split.pdf';pdf.save(nm);addFile(nm,'pdf');pb.classList.remove('show');toast(_lang==='ar'?'تم':'Done','ok');closeSheet();
  }catch(e){pb.classList.remove('show');toast('Error: '+e.message,'err');}
}

// ضغط الصور
function buildCompressImg(){
  document.getElementById('sheetBody').innerHTML=`
    ${desc('يقلل حجم الصورة للإرسال.','Reduce image size for sharing.')}
    <div class="drop-zone"><input type="file" id="cpIn" accept="image/*">
      <div class="dz-icwrap"><svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#4ade80" stroke-width="1.8" stroke-linecap="round"><polyline points="4 14 10 14 10 20"/><polyline points="20 10 14 10 14 4"/><line x1="10" y1="14" x2="21" y2="3"/><line x1="3" y1="21" x2="14" y2="10"/></svg></div>
      <div class="dz-t">${_lang==='ar'?'اختر صورة':'Choose image'}</div></div>
    <div id="cpCont" style="display:none">
      <div class="sel-list" id="cpList"></div>
      <div class="field">
        <label>${_lang==='ar'?'جودة الضغط (5-100)':'Compression Quality (5-100)'}</label>
        <div style="display:flex;align-items:center;gap:8px;margin-top:4px">
          <input type="range" id="cpLvlR" min="5" max="100" value="60" style="flex:1;accent-color:var(--red)" oninput="document.getElementById('cpLvlN').value=this.value">
          <input type="number" class="slider-num" id="cpLvlN" min="5" max="100" value="60" oninput="var v=Math.min(100,+this.value||0);this.value=v;document.getElementById('cpLvlR').value=v" onblur="var mn=5;var v2=+this.value;if(!v2||v2<mn)this.value=mn;document.getElementById('cpLvlR').value=this.value;document.getElementById('cpLvlR').value=v">
        </div>
      </div>
      <button class="action-btn" onclick="doCompressImg()">${icoDl()} ${_lang==='ar'?'ضغط وتحميل':'Compress & Download'}</button>
    </div>`;
  document.getElementById('cpIn').addEventListener('change',e=>{window._cpF=e.target.files[0];document.getElementById('cpList').innerHTML=`<div class="sel-item"><div class="si-icon">${icoI()}</div><span class="si-name">${window._cpF.name}</span><span class="si-size">${fmtSize(window._cpF.size)}</span></div>`;document.getElementById('cpCont').style.display='block';});
}
async function doCompressImg(){
  const f=window._cpF;if(!f)return;const q=parseFloat(document.getElementById('cpLvl').value);
  const url=URL.createObjectURL(f);const {data}=await imgToData(url,q);
  const arr=data.split(','),mime=arr[0].match(/:(.*?);/)[1],bstr=atob(arr[1]);let n=bstr.length;const u8=new Uint8Array(n);while(n--)u8[n]=bstr.charCodeAt(n);
  const blob=new Blob([u8],{type:mime});const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=f.name.replace(/\.[^.]+$/,'')+'-compressed.jpg';a.click();
  URL.revokeObjectURL(url);toast(_lang==='ar'?'تم الضغط':'Compressed','ok');closeSheet();
}

// ══ تعديل الصورة ══
let _ieImg=null,_ieFile=null,_ieFreeAngle=0,_ieFilterMode='none';
window._ieHistory=[];window._ieHistIdx=-1;

function buildImgEdit(){
  _ieImg=null;_ieFreeAngle=0;_ieFilterMode='none';
  window._ieHistory=[];window._ieHistIdx=-1;
  document.getElementById('sheetBody').innerHTML=`
    ${desc('حرّر صورتك: قص، تغيير الدقة، فلاتر، تحويل بكسل، وأكثر.','Edit your image: crop, resize, filters, pixelate, and more.')}
    <div class="drop-zone"><input type="file" id="ieIn" accept="image/*">
      <div class="dz-icwrap"><svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#22d3ee" stroke-width="1.8" stroke-linecap="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg></div>
      <div class="dz-t">${_lang==='ar'?'اختر صورة للتعديل':'Choose Image to Edit'}</div>
    </div>
    <div id="ieCont" style="display:none">
      <div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:10px">
        <button class="wm-tab active" id="ieTabAdj"    onclick="ieShowTab('adj')">${_lang==='ar'?'🎨 ألوان':'🎨 Adjust'}</button>
        <button class="wm-tab"        id="ieTabFilter"  onclick="ieShowTab('filter')">${_lang==='ar'?'✨ فلاتر':'✨ Filters'}</button>
        <button class="wm-tab"        id="ieTabCrop"    onclick="ieShowTab('crop')">${_lang==='ar'?'✂️ قص':'✂️ Crop'}</button>
        <button class="wm-tab"        id="ieTabResize"  onclick="ieShowTab('resize')">${_lang==='ar'?'📐 الدقة':'📐 Resolution'}</button>
        <button class="wm-tab"        id="ieTabRotate"  onclick="ieShowTab('rotate')">${_lang==='ar'?'🔄 تدوير':'🔄 Rotate'}</button>

      </div>

      <!-- ADJUST -->
      <div id="iePanelAdj" style="background:var(--card);border-radius:10px;padding:12px;margin-bottom:10px">
        <div class="slider-row"><label>${_lang==='ar'?'السطوع':'Brightness'}</label><input type="range" id="ieBright" min="0" max="200" value="100" style="flex:1;accent-color:var(--red)" oninput="document.getElementById('ieBrightN').value=this.value;ieApply()"><input type="number" class="slider-num" id="ieBrightN" min="0" max="200" value="100" oninput="var v=Math.min(200,+this.value||0);this.value=v;document.getElementById('ieBright').value=v;ieApply()" onblur="var mn=0;var v2=+this.value;if(!v2||v2<mn)this.value=mn;document.getElementById('ieBright').value=this.value;document.getElementById('ieBright').value=v;ieApply()"></div>
        <div class="slider-row"><label>${_lang==='ar'?'التباين':'Contrast'}</label><input type="range" id="ieContrast" min="0" max="200" value="100" style="flex:1;accent-color:var(--red)" oninput="document.getElementById('ieContrastN').value=this.value;ieApply()"><input type="number" class="slider-num" id="ieContrastN" min="0" max="200" value="100" oninput="var v=Math.min(200,+this.value||0);this.value=v;document.getElementById('ieContrast').value=v;ieApply()" onblur="var mn=0;var v2=+this.value;if(!v2||v2<mn)this.value=mn;document.getElementById('ieContrast').value=this.value;document.getElementById('ieContrast').value=v;ieApply()"></div>
        <div class="slider-row"><label>${_lang==='ar'?'التشبع':'Saturation'}</label><input type="range" id="ieSat" min="0" max="200" value="100" style="flex:1;accent-color:var(--red)" oninput="document.getElementById('ieSatN').value=this.value;ieApply()"><input type="number" class="slider-num" id="ieSatN" min="0" max="200" value="100" oninput="var v=Math.min(200,+this.value||0);this.value=v;document.getElementById('ieSat').value=v;ieApply()" onblur="var mn=0;var v2=+this.value;if(!v2||v2<mn)this.value=mn;document.getElementById('ieSat').value=this.value;document.getElementById('ieSat').value=v;ieApply()"></div>
        <div class="slider-row"><label>${_lang==='ar'?'الدفء':'Warmth'}</label><input type="range" id="ieWarm" min="-100" max="100" value="0" style="flex:1;accent-color:var(--red)" oninput="document.getElementById('ieWarmN').value=this.value;ieApply()"><input type="number" class="slider-num" id="ieWarmN" min="-100" max="100" value="0" oninput="var v=Math.min(100,Math.max(-100,+this.value||0));this.value=v;document.getElementById('ieWarm').value=v;ieApply()" onblur="var mn=-100;var v2=+this.value;if(!v2||v2<mn)this.value=mn;document.getElementById('ieWarm').value=this.value;document.getElementById('ieWarm').value=v;ieApply()"></div>
        <div class="slider-row"><label>${_lang==='ar'?'الشفافية':'Opacity'}</label><input type="range" id="ieOpacity" min="0" max="100" value="100" style="flex:1;accent-color:var(--red)" oninput="document.getElementById('ieOpacityN').value=this.value;ieApply()"><input type="number" class="slider-num" id="ieOpacityN" min="0" max="100" value="100" oninput="var v=Math.min(100,+this.value||0);this.value=v;document.getElementById('ieOpacity').value=v;ieApply()" onblur="var mn=0;var v2=+this.value;if(!v2||v2<mn)this.value=mn;document.getElementById('ieOpacity').value=this.value;document.getElementById('ieOpacity').value=v;ieApply()"></div>
        <button style="width:100%;padding:8px;background:var(--card2);border:1px solid var(--border);border-radius:8px;color:var(--text3);font-family:inherit;font-size:12px;cursor:pointer;margin-top:4px" onclick="ieReset()">${_lang==='ar'?'↩ إعادة تعيين':'↩ Reset All'}</button>
      </div>

      <!-- FILTERS -->
      <div id="iePanelFilter" style="display:none;margin-bottom:10px">
        <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px">
          ${[{id:'none',ar:'بدون',en:'None'},{id:'grayscale',ar:'أبيض وأسود',en:'B&W'},{id:'sepia',ar:'سيبيا',en:'Sepia'},{id:'invert',ar:'عكس',en:'Invert'},{id:'blur',ar:'ضبابي',en:'Blur'},{id:'vintage',ar:'قديم',en:'Vintage'},{id:'cool',ar:'بارد',en:'Cool'},{id:'warm2',ar:'دافئ',en:'Warm'},{id:'vivid',ar:'نابض',en:'Vivid'},{id:'fade',ar:'باهت',en:'Fade'},{id:'dramatic',ar:'درامي',en:'Dramatic'},{id:'sharpen',ar:'حاد',en:'Sharpen'}].map(f=>`<button id="ieF_${f.id}" onclick="ieApplyFilter('${f.id}')" style="padding:10px 4px;background:var(--card);border:1px solid var(--border);border-radius:8px;color:var(--text2);font-family:inherit;font-size:11px;cursor:pointer">${_lang==='ar'?f.ar:f.en}</button>`).join('')}
        </div>
      </div>

      <!-- CROP -->
      <div id="iePanelCrop" style="display:none;background:var(--card);border-radius:10px;padding:12px;margin-bottom:10px">
        <p style="font-size:12px;color:var(--text2);margin-bottom:8px">${_lang==='ar'?'اسحب على الصورة لتحديد المنطقة':'Drag on image to select area'}</p>
        <div style="display:flex;gap:8px;margin-bottom:10px">
          <button id="ieCropModeKeep" onclick="window._ieCropMode='keep';this.style.borderColor='var(--red)';document.getElementById('ieCropModeRemove').style.borderColor='var(--border)'" style="flex:1;padding:9px;background:var(--card2);border:2px solid var(--red);border-radius:8px;color:var(--text);font-family:inherit;font-size:11px;cursor:pointer">${_lang==='ar'?'إبقاء المحدد فقط':'Keep Selection'}</button>
          <button id="ieCropModeRemove" onclick="window._ieCropMode='remove';this.style.borderColor='var(--red)';document.getElementById('ieCropModeKeep').style.borderColor='var(--border)'" style="flex:1;padding:9px;background:var(--card2);border:2px solid var(--border);border-radius:8px;color:var(--text);font-family:inherit;font-size:11px;cursor:pointer">${_lang==='ar'?'🗑 حذف المحدد':'🗑 Remove Selection'}</button>
        </div>
        <div class="fields-row">
          <div class="field"><label>X</label><input type="number" id="ieCropX" min="0" value="0" oninput="ieCropFromInputs()"></div>
          <div class="field"><label>Y</label><input type="number" id="ieCropY" min="0" value="0" oninput="ieCropFromInputs()"></div>
        </div>
        <div class="fields-row">
          <div class="field"><label>${_lang==='ar'?'العرض':'Width'}</label><input type="number" id="ieCropW" min="1" value="100" oninput="ieCropFromInputs()"></div>
          <div class="field"><label>${_lang==='ar'?'الارتفاع':'Height'}</label><input type="number" id="ieCropH" min="1" value="100" oninput="ieCropFromInputs()"></div>
        </div>
        <div style="display:flex;gap:8px">
          <button class="action-btn" style="flex:1;margin:0" onclick="ieDoCrop()">${_lang==='ar'?'✂️ تطبيق':'✂️ Apply'}</button>
          <button style="flex:1;padding:12px;background:var(--card2);border:1px solid var(--border);border-radius:8px;color:var(--text3);font-family:inherit;font-size:13px;cursor:pointer" onclick="ieResetCrop()">${_lang==='ar'?'إلغاء':'Cancel'}</button>
        </div>
      </div>

      <!-- RESOLUTION -->
      <div id="iePanelResize" style="display:none;background:var(--card);border-radius:10px;padding:12px;margin-bottom:10px">
        <div id="ieOrigSize" style="font-size:12px;color:var(--text2);margin-bottom:10px"></div>
        <div style="font-size:12px;color:var(--text2);margin-bottom:6px">${_lang==='ar'?'دقة جاهزة:':'Preset:'}</div>
        <div style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:12px">
          <button onclick="ieSetPreset(3840,2160)" style="padding:6px 8px;background:var(--card2);border:1px solid var(--border);border-radius:6px;color:var(--text2);font-family:inherit;font-size:10px;cursor:pointer">4K 3840×2160</button>
          <button onclick="ieSetPreset(2560,1440)" style="padding:6px 8px;background:var(--card2);border:1px solid var(--border);border-radius:6px;color:var(--text2);font-family:inherit;font-size:10px;cursor:pointer">2K 2560×1440</button>
          <button onclick="ieSetPreset(1920,1080)" style="padding:6px 8px;background:var(--card2);border:1px solid var(--border);border-radius:6px;color:var(--text2);font-family:inherit;font-size:10px;cursor:pointer">FHD 1920×1080</button>
          <button onclick="ieSetPreset(1280,720)"  style="padding:6px 8px;background:var(--card2);border:1px solid var(--border);border-radius:6px;color:var(--text2);font-family:inherit;font-size:10px;cursor:pointer">HD 1280×720</button>
          <button onclick="ieSetPreset(854,480)"   style="padding:6px 8px;background:var(--card2);border:1px solid var(--border);border-radius:6px;color:var(--text2);font-family:inherit;font-size:10px;cursor:pointer">SD 854×480</button>
          <button onclick="ieSetPreset(426,240)"   style="padding:6px 8px;background:var(--card2);border:1px solid var(--border);border-radius:6px;color:var(--text2);font-family:inherit;font-size:10px;cursor:pointer">LD 426×240</button>
        </div>
        <div class="fields-row">
          <div class="field"><label>${_lang==='ar'?'العرض (px)':'Width (px)'}</label><input type="number" id="ieResW" min="1" value="1920" oninput="ieResizeLink(this,'w')"></div>
          <div class="field"><label>${_lang==='ar'?'الارتفاع (px)':'Height (px)'}</label><input type="number" id="ieResH" min="1" value="1080" oninput="ieResizeLink(this,'h')"></div>
        </div>
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:10px">
          <input type="checkbox" id="ieResLock" checked style="accent-color:var(--red);width:16px;height:16px">
          <label for="ieResLock" style="font-size:13px;color:var(--text2)">${_lang==='ar'?'الحفاظ على النسبة':'Keep Aspect Ratio'}</label>
        </div>
        <div class="slider-row">
          <label>${_lang==='ar'?'نسبة %':'Scale %'}</label>
          <input type="range" id="ieResScale" min="1" max="400" value="100" style="flex:1;accent-color:var(--red)" oninput="document.getElementById('ieResScaleN').value=this.value;ieScaleFromSlider(+this.value)">
          <input type="number" class="slider-num" id="ieResScaleN" min="1" max="400" value="100" oninput="var v=Math.min(400,+this.value||0);this.value=v;document.getElementById('ieResScale').value=v;ieScaleFromSlider(v)" onblur="var mn=1;var v2=+this.value;if(!v2||v2<mn)this.value=mn;document.getElementById('ieResScale').value=this.value;document.getElementById('ieResScale').value=v;ieScaleFromSlider(v)">
        </div>
        <button class="action-btn" onclick="ieDoResize()">${_lang==='ar'?'📐 تطبيق الدقة':'📐 Apply Resolution'}</button>
      </div>

      <!-- ROTATE -->
      <div id="iePanelRotate" style="display:none;background:var(--card);border-radius:10px;padding:12px;margin-bottom:10px">
        <div style="display:grid;grid-template-columns:repeat(2,1fr);gap:8px;margin-bottom:10px">
          <button onclick="ieRotate(-90)" style="padding:12px;background:var(--card2);border:1px solid var(--border);border-radius:8px;color:var(--text);font-family:inherit;font-size:13px;cursor:pointer">↺ ${_lang==='ar'?'يسار 90°':'Left 90°'}</button>
          <button onclick="ieRotate(90)"  style="padding:12px;background:var(--card2);border:1px solid var(--border);border-radius:8px;color:var(--text);font-family:inherit;font-size:13px;cursor:pointer">↻ ${_lang==='ar'?'يمين 90°':'Right 90°'}</button>
          <button onclick="ieFlip('h')"   style="padding:12px;background:var(--card2);border:1px solid var(--border);border-radius:8px;color:var(--text);font-family:inherit;font-size:13px;cursor:pointer">↔ ${_lang==='ar'?'قلب أفقي':'Flip H'}</button>
          <button onclick="ieFlip('v')"   style="padding:12px;background:var(--card2);border:1px solid var(--border);border-radius:8px;color:var(--text);font-family:inherit;font-size:13px;cursor:pointer">↕ ${_lang==='ar'?'قلب رأسي':'Flip V'}</button>
        </div>
        <div class="slider-row">
          <label>${_lang==='ar'?'زاوية حرة':'Free Angle'}</label>
          <input type="range" id="ieAngle" min="-180" max="180" value="0" style="flex:1;accent-color:var(--red)" oninput="document.getElementById('ieAngleN').value=this.value;_ieFreeAngle=+this.value;ieApply()">
          <input type="number" class="slider-num" id="ieAngleN" min="-180" max="180" value="0" oninput="var v=Math.min(180,Math.max(-180,+this.value||0));this.value=v;document.getElementById('ieAngle').value=v;_ieFreeAngle=v;ieApply()" onblur="var mn=-180;var v2=+this.value;if(!v2||v2<mn)this.value=mn;document.getElementById('ieAngle').value=this.value;document.getElementById('ieAngle').value=v;_ieFreeAngle=v;ieApply()">
        </div>
        <button class="action-btn" style="margin-top:8px" onclick="ieApplyRotation()">${_lang==='ar'?'تطبيق التدوير':'Apply Rotation'}</button>
      </div>



      <!-- CANVAS -->
      <div style="position:relative;margin-bottom:10px;overflow:hidden;border-radius:8px;border:1px solid var(--border)">
        <canvas id="ieCanvas" style="width:100%;display:block"></canvas>
        <canvas id="ieCropOverlay" style="position:absolute;top:0;left:0;width:100%;height:100%;display:none;pointer-events:none"></canvas>
        <canvas id="ieCropInput"   style="position:absolute;top:0;left:0;width:100%;height:100%;display:none"></canvas>
      </div>

      <div style="display:flex;gap:8px">
        <button style="flex:1;padding:12px;background:var(--card);border:1px solid var(--border);border-radius:8px;color:var(--text3);font-family:inherit;font-size:13px;cursor:pointer" onclick="ieUndo()">↩ ${_lang==='ar'?'تراجع':'Undo'}</button>
        <button class="action-btn" style="flex:2;margin:0" onclick="ieDownload()">${icoDl()} ${_lang==='ar'?'تحميل':'Download'}</button>
      </div>
    </div>`;

  window._ieCropMode='keep';
  document.getElementById('ieIn').addEventListener('change',function(e){
    var f=e.target.files[0];if(!f)return;_ieFile=f;
    var url=URL.createObjectURL(f);var img=new Image();
    img.onload=function(){_ieImg=img;window._ieHistory=[img];window._ieHistIdx=0;document.getElementById('ieCont').style.display='block';ieUpdateSizeLabel();ieDrawCanvas(_ieImg);ieApply();};
    img.src=url;
  });
}

function ieShowTab(t){
  var allP=['iePanelAdj','iePanelFilter','iePanelCrop','iePanelResize','iePanelRotate'];
  var allT=['ieTabAdj','ieTabFilter','ieTabCrop','ieTabResize','ieTabRotate'];
  allP.forEach(function(id){var el=document.getElementById(id);if(el)el.style.display='none';});
  allT.forEach(function(id){var el=document.getElementById(id);if(el)el.classList.remove('active');});
  var pmap={adj:'iePanelAdj',filter:'iePanelFilter',crop:'iePanelCrop',resize:'iePanelResize',rotate:'iePanelRotate'};
  var tmap={adj:'ieTabAdj',filter:'ieTabFilter',crop:'ieTabCrop',resize:'ieTabResize',rotate:'ieTabRotate'};
  var pEl=document.getElementById(pmap[t]);if(pEl)pEl.style.display='block';
  var tEl=document.getElementById(tmap[t]);if(tEl)tEl.classList.add('active');
  var ov=document.getElementById('ieCropInput');var ol=document.getElementById('ieCropOverlay');
  if(ov)ov.style.display=(t==='crop'?'block':'none');
  if(ol)ol.style.display=(t==='crop'?'block':'none');
  if(t==='crop')ieSetupCropDraw();
  if(t==='resize')ieUpdateSizeLabel();

}

function ieUpdateSizeLabel(){
  if(!_ieImg)return;
  var el=document.getElementById('ieOrigSize');
  if(el)el.textContent=(_lang==='ar'?'الحجم الحالي: ':'Current size: ')+_ieImg.naturalWidth+' × '+_ieImg.naturalHeight+' px';
  var rw=document.getElementById('ieResW');var rh=document.getElementById('ieResH');
  if(rw)rw.value=_ieImg.naturalWidth;if(rh)rh.value=_ieImg.naturalHeight;
  var rs=document.getElementById('ieResScale');var rsn=document.getElementById('ieResScaleN');
  if(rs)rs.value=100;if(rsn)rsn.value=100;
}

function ieDrawCanvas(img){
  var cv=document.getElementById('ieCanvas');if(!cv)return;
  // Setup zoom once
  if(!window._ieZoomReady&&cv.parentElement){
    var wrap=cv.parentElement;
    var inner=document.createElement('div');
    inner.id='ieInner';inner.style.cssText='position:absolute;top:0;left:0;transform-origin:0 0;';
    wrap.style.position='relative';wrap.style.overflow='hidden';wrap.style.touchAction='none';
    wrap.insertBefore(inner,cv);inner.appendChild(cv);
    setupCanvasZoom(wrap,inner,cv,()=>cv.offsetWidth,()=>cv.offsetHeight);
    window._ieZoomReady=true;
  }
  var dpr=window.devicePixelRatio||1;
  var maxW=Math.min(window.innerWidth-40,600);
  var dw=Math.min(maxW,img.naturalWidth);
  var dh=Math.round(dw*(img.naturalHeight/img.naturalWidth));
  cv.width=dw*dpr;cv.height=dh*dpr;
  cv.style.width=dw+'px';cv.style.height=dh+'px';
  cv._disp={w:dw,h:dh};
  var ctx=cv.getContext('2d');ctx.setTransform(dpr,0,0,dpr,0,0);
  var cs=8;for(var x=0;x<dw;x+=cs)for(var y=0;y<dh;y+=cs){ctx.fillStyle=((x/cs+y/cs)%2===0)?'#bbb':'#eee';ctx.fillRect(x,y,cs,cs);}
  ctx.drawImage(img,0,0,dw,dh);
}

function ieApply(){
  var cv=document.getElementById('ieCanvas');if(!cv||!_ieImg)return;
  var dpr=window.devicePixelRatio||1;
  var dw=cv._disp?cv._disp.w:parseInt(cv.style.width);
  var dh=cv._disp?cv._disp.h:parseInt(cv.style.height);
  var ctx=cv.getContext('2d');ctx.setTransform(dpr,0,0,dpr,0,0);
  var cs=8;for(var x=0;x<dw;x+=cs)for(var y=0;y<dh;y+=cs){ctx.fillStyle=((x/cs+y/cs)%2===0)?'#bbb':'#eee';ctx.fillRect(x,y,cs,cs);}
  var b=+(document.getElementById('ieBright')?.value||100);
  var con=+(document.getElementById('ieContrast')?.value||100);
  var s=+(document.getElementById('ieSat')?.value||100);
  var op=+(document.getElementById('ieOpacity')?.value||100);
  var warm=+(document.getElementById('ieWarm')?.value||0);
  var flt='brightness('+b+'%) contrast('+con+'%) saturate('+s+'%) opacity('+op+'%)';
  var fm={grayscale:'grayscale(100%)',sepia:'sepia(100%)',invert:'invert(100%)',blur:'blur(3px)',vintage:'sepia(60%) contrast(110%) brightness(90%)',cool:'hue-rotate(200deg) saturate(120%)',warm2:'hue-rotate(-20deg) saturate(130%) brightness(105%)',vivid:'saturate(180%) contrast(120%)',fade:'brightness(110%) saturate(70%)',dramatic:'contrast(140%) brightness(90%) saturate(80%)',sharpen:'contrast(120%)'};
  if(_ieFilterMode!=='none'&&fm[_ieFilterMode])flt+=' '+fm[_ieFilterMode];
  if(_ieFreeAngle!==0){ctx.save();ctx.translate(dw/2,dh/2);ctx.rotate(_ieFreeAngle*Math.PI/180);ctx.filter=flt;ctx.drawImage(_ieImg,-dw/2,-dh/2,dw,dh);ctx.filter='none';ctx.restore();}
  else{ctx.filter=flt;ctx.drawImage(_ieImg,0,0,dw,dh);ctx.filter='none';}
  if(warm!==0){ctx.globalAlpha=Math.abs(warm)/200;ctx.fillStyle=warm>0?'rgba(255,140,0,0.6)':'rgba(0,80,255,0.6)';ctx.fillRect(0,0,dw,dh);ctx.globalAlpha=1;}
}

function ieReset(){
  ['ieBright','ieContrast','ieSat','ieOpacity'].forEach(function(id){var el=document.getElementById(id);if(el){el.value=100;var n=document.getElementById(id+'N');if(n)n.value=100;}});
  ['ieWarm'].forEach(function(id){var el=document.getElementById(id);if(el){el.value=0;var n=document.getElementById(id+'N');if(n)n.value=0;}});
  _ieFilterMode='none';_ieFreeAngle=0;
  var ia=document.getElementById('ieAngle');if(ia)ia.value=0;var ian=document.getElementById('ieAngleN');if(ian)ian.value=0;
  document.querySelectorAll('[id^="ieF_"]').forEach(function(b){b.style.borderColor='var(--border)';});
  ieApply();
}

function ieApplyFilter(id){
  _ieFilterMode=id;
  document.querySelectorAll('[id^="ieF_"]').forEach(function(b){b.style.borderColor='var(--border)';});
  var el=document.getElementById('ieF_'+id);if(el)el.style.borderColor='var(--red)';
  ieApply();
}

// CROP
var _ieCropRect={x:0,y:0,w:0,h:0},_ieCropDrag=false,_ieCropSX=0,_ieCropSY=0;
function ieSetupCropDraw(){
  var ov=document.getElementById('ieCropInput');var cv=document.getElementById('ieCanvas');if(!ov||!cv)return;
  var dw=cv._disp?cv._disp.w:parseInt(cv.style.width);var dh=cv._disp?cv._disp.h:parseInt(cv.style.height);
  var dpr=window.devicePixelRatio||1;
  ov.width=dw*dpr;ov.height=dh*dpr;ov.style.width=dw+'px';ov.style.height=dh+'px';
  var gp=function(e){var r=ov.getBoundingClientRect(),s=e.touches?e.touches[0]:e;return{x:s.clientX-r.left,y:s.clientY-r.top};};
  ov.onmousedown=function(e){_ieCropDrag=true;var p=gp(e);_ieCropSX=p.x;_ieCropSY=p.y;_ieCropRect={x:p.x,y:p.y,w:0,h:0};};
  ov.onmousemove=function(e){if(!_ieCropDrag)return;var p=gp(e);_ieCropRect={x:Math.min(_ieCropSX,p.x),y:Math.min(_ieCropSY,p.y),w:Math.abs(p.x-_ieCropSX),h:Math.abs(p.y-_ieCropSY)};ieCropDrawOverlay();ieCropToInputs();};
  ov.onmouseup=function(){_ieCropDrag=false;};
  ov.addEventListener('touchstart',function(e){e.preventDefault();_ieCropDrag=true;var p=gp(e);_ieCropSX=p.x;_ieCropSY=p.y;_ieCropRect={x:p.x,y:p.y,w:0,h:0};},{passive:false});
  ov.addEventListener('touchmove',function(e){e.preventDefault();if(!_ieCropDrag)return;var p=gp(e);_ieCropRect={x:Math.min(_ieCropSX,p.x),y:Math.min(_ieCropSY,p.y),w:Math.abs(p.x-_ieCropSX),h:Math.abs(p.y-_ieCropSY)};ieCropDrawOverlay();ieCropToInputs();},{passive:false});
  ov.addEventListener('touchend',function(){_ieCropDrag=false;});
}

function ieCropDrawOverlay(){
  var ol=document.getElementById('ieCropOverlay');var cv=document.getElementById('ieCanvas');if(!ol||!cv)return;
  var dw=cv._disp?cv._disp.w:parseInt(cv.style.width);var dh=cv._disp?cv._disp.h:parseInt(cv.style.height);
  var dpr=window.devicePixelRatio||1;
  ol.width=dw*dpr;ol.height=dh*dpr;ol.style.width=dw+'px';ol.style.height=dh+'px';
  var ctx2=ol.getContext('2d');ctx2.setTransform(dpr,0,0,dpr,0,0);ctx2.clearRect(0,0,dw,dh);
  var r=_ieCropRect;ctx2.fillStyle='rgba(0,0,0,0.5)';ctx2.fillRect(0,0,dw,dh);ctx2.clearRect(r.x,r.y,r.w,r.h);
  ctx2.strokeStyle='#e53935';ctx2.lineWidth=2;ctx2.strokeRect(r.x,r.y,r.w,r.h);
  ctx2.strokeStyle='rgba(255,255,255,0.4)';ctx2.lineWidth=0.5;
  [1/3,2/3].forEach(function(f){ctx2.beginPath();ctx2.moveTo(r.x+r.w*f,r.y);ctx2.lineTo(r.x+r.w*f,r.y+r.h);ctx2.stroke();ctx2.beginPath();ctx2.moveTo(r.x,r.y+r.h*f);ctx2.lineTo(r.x+r.w,r.y+r.h*f);ctx2.stroke();});
}

function ieCropToInputs(){
  if(!_ieImg)return;
  var cv=document.getElementById('ieCanvas');var dw=cv._disp?cv._disp.w:parseInt(cv.style.width);
  var sc=_ieImg.naturalWidth/dw;var r=_ieCropRect;
  document.getElementById('ieCropX').value=Math.round(r.x*sc);
  document.getElementById('ieCropY').value=Math.round(r.y*sc);
  document.getElementById('ieCropW').value=Math.max(1,Math.round(r.w*sc));
  document.getElementById('ieCropH').value=Math.max(1,Math.round(r.h*sc));
}

function ieCropFromInputs(){
  if(!_ieImg)return;
  var cv=document.getElementById('ieCanvas');var dw=cv._disp?cv._disp.w:parseInt(cv.style.width);
  var sc=dw/_ieImg.naturalWidth;
  _ieCropRect={x:+(document.getElementById('ieCropX').value||0)*sc,y:+(document.getElementById('ieCropY').value||0)*sc,w:+(document.getElementById('ieCropW').value||100)*sc,h:+(document.getElementById('ieCropH').value||100)*sc};
  ieCropDrawOverlay();
}

function ieDoCrop(){
  if(!_ieImg)return;
  var x=+(document.getElementById('ieCropX').value||0);var y=+(document.getElementById('ieCropY').value||0);
  var w=+(document.getElementById('ieCropW').value||_ieImg.naturalWidth);var h=+(document.getElementById('ieCropH').value||_ieImg.naturalHeight);
  if(w<1||h<1){toast(_lang==='ar'?'حدد منطقة القص':'Select crop area','err');return;}
  var mode=window._ieCropMode||'keep';
  var fc=document.createElement('canvas');
  if(mode==='keep'){fc.width=w;fc.height=h;fc.getContext('2d').drawImage(_ieImg,x,y,w,h,0,0,w,h);}
  else{fc.width=_ieImg.naturalWidth;fc.height=_ieImg.naturalHeight;var ctx2=fc.getContext('2d');ctx2.drawImage(_ieImg,0,0);ctx2.fillStyle='rgba(180,180,180,1)';ctx2.fillRect(x,y,w,h);}
  ieSaveHistory(fc);ieResetCrop();
}

function ieResetCrop(){_ieCropRect={x:0,y:0,w:0,h:0};var ol=document.getElementById('ieCropOverlay');if(ol){var ctx2=ol.getContext('2d');ctx2.clearRect(0,0,ol.width,ol.height);}}

// RESIZE
function ieSetPreset(w,h){
  document.getElementById('ieResW').value=w;document.getElementById('ieResH').value=h;
  if(_ieImg){var sc=Math.round(w/_ieImg.naturalWidth*100);document.getElementById('ieResScale').value=Math.min(400,sc);document.getElementById('ieResScaleN').value=Math.min(400,sc);}
}
function ieResizeLink(el,dim){
  if(!_ieImg||!document.getElementById('ieResLock').checked)return;
  var ratio=_ieImg.naturalHeight/_ieImg.naturalWidth;
  if(dim==='w')document.getElementById('ieResH').value=Math.round(+el.value*ratio);
  else document.getElementById('ieResW').value=Math.round(+el.value/ratio);
}
function ieScaleFromSlider(pct){
  if(!_ieImg)return;
  document.getElementById('ieResW').value=Math.round(_ieImg.naturalWidth*pct/100);
  document.getElementById('ieResH').value=Math.round(_ieImg.naturalHeight*pct/100);
}
function ieDoResize(){
  if(!_ieImg)return;
  var w=+(document.getElementById('ieResW').value||_ieImg.naturalWidth);
  var h=+(document.getElementById('ieResH').value||_ieImg.naturalHeight);
  if(w<1||h<1){toast(_lang==='ar'?'حجم غير صالح':'Invalid size','err');return;}
  var fc=document.createElement('canvas');fc.width=w;fc.height=h;
  fc.getContext('2d').drawImage(_ieImg,0,0,w,h);
  ieSaveHistory(fc);toast((_lang==='ar'?'تم: ':'Done: ')+w+'×'+h+' px','ok');
}

// ROTATE
function ieRotate(deg){
  if(!_ieImg)return;
  var sw=Math.abs(deg)===90?_ieImg.naturalHeight:_ieImg.naturalWidth;
  var sh=Math.abs(deg)===90?_ieImg.naturalWidth:_ieImg.naturalHeight;
  var fc=document.createElement('canvas');fc.width=sw;fc.height=sh;
  var ctx2=fc.getContext('2d');ctx2.translate(sw/2,sh/2);ctx2.rotate(deg*Math.PI/180);ctx2.drawImage(_ieImg,-_ieImg.naturalWidth/2,-_ieImg.naturalHeight/2);
  ieSaveHistory(fc);
}
function ieFlip(dir){
  if(!_ieImg)return;
  var fc=document.createElement('canvas');fc.width=_ieImg.naturalWidth;fc.height=_ieImg.naturalHeight;
  var ctx2=fc.getContext('2d');
  if(dir==='h'){ctx2.translate(fc.width,0);ctx2.scale(-1,1);}else{ctx2.translate(0,fc.height);ctx2.scale(1,-1);}
  ctx2.drawImage(_ieImg,0,0);ieSaveHistory(fc);
}
function ieApplyRotation(){
  if(!_ieImg)return;
  var rad=_ieFreeAngle*Math.PI/180;
  var nw=Math.abs(_ieImg.naturalWidth*Math.cos(rad))+Math.abs(_ieImg.naturalHeight*Math.sin(rad));
  var nh=Math.abs(_ieImg.naturalWidth*Math.sin(rad))+Math.abs(_ieImg.naturalHeight*Math.cos(rad));
  var fc=document.createElement('canvas');fc.width=Math.round(nw);fc.height=Math.round(nh);
  var ctx2=fc.getContext('2d');ctx2.translate(nw/2,nh/2);ctx2.rotate(rad);ctx2.drawImage(_ieImg,-_ieImg.naturalWidth/2,-_ieImg.naturalHeight/2);
  ieSaveHistory(fc);_ieFreeAngle=0;
  var ia=document.getElementById('ieAngle');if(ia)ia.value=0;var ian=document.getElementById('ieAngleN');if(ian)ian.value=0;
}



// HISTORY
function ieSaveHistory(canvas){
  var img=new Image();
  img.onload=function(){
    _ieImg=img;
    window._ieHistory=window._ieHistory.slice(0,window._ieHistIdx+1);
    window._ieHistory.push(img);window._ieHistIdx=window._ieHistory.length-1;
    ieDrawCanvas(img);ieApply();ieUpdateSizeLabel();
  };
  img.src=canvas.toDataURL('image/png');
}
function ieUndo(){
  if(!window._ieHistory||window._ieHistIdx<=0){toast(_lang==='ar'?'لا يوجد تراجع':'Nothing to undo','err');return;}
  window._ieHistIdx--;_ieImg=window._ieHistory[window._ieHistIdx];
  ieDrawCanvas(_ieImg);ieApply();ieUpdateSizeLabel();toast(_lang==='ar'?'تم التراجع':'Undone','ok');
}

// DOWNLOAD
function ieDownload(){
  if(!_ieImg){toast(_lang==='ar'?'اختر صورة':'Choose image','err');return;}
  var fc=document.createElement('canvas');fc.width=_ieImg.naturalWidth;fc.height=_ieImg.naturalHeight;
  var ctx2=fc.getContext('2d');
  var b=+(document.getElementById('ieBright')?.value||100);var con=+(document.getElementById('ieContrast')?.value||100);
  var s=+(document.getElementById('ieSat')?.value||100);var op=+(document.getElementById('ieOpacity')?.value||100);var warm=+(document.getElementById('ieWarm')?.value||0);
  var flt='brightness('+b+'%) contrast('+con+'%) saturate('+s+'%) opacity('+op+'%)';
  var fm={grayscale:'grayscale(100%)',sepia:'sepia(100%)',invert:'invert(100%)',blur:'blur(3px)',vintage:'sepia(60%) contrast(110%) brightness(90%)',cool:'hue-rotate(200deg) saturate(120%)',warm2:'hue-rotate(-20deg) saturate(130%) brightness(105%)',vivid:'saturate(180%) contrast(120%)',fade:'brightness(110%) saturate(70%)',dramatic:'contrast(140%) brightness(90%) saturate(80%)',sharpen:'contrast(120%)'};
  if(_ieFilterMode!=='none'&&fm[_ieFilterMode])flt+=' '+fm[_ieFilterMode];
  ctx2.filter=flt;ctx2.drawImage(_ieImg,0,0);ctx2.filter='none';
  if(warm!==0){ctx2.globalAlpha=Math.abs(warm)/200;ctx2.fillStyle=warm>0?'rgba(255,140,0,0.6)':'rgba(0,80,255,0.6)';ctx2.fillRect(0,0,fc.width,fc.height);ctx2.globalAlpha=1;}
  fc.toBlob(function(blob){var a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=(_ieFile?_ieFile.name.replace(/\.[^.]+$/,''):'edited')+'-edited.jpg';a.click();toast(_lang==='ar'?'تم التحميل':'Downloaded','ok');closeSheet();},'image/jpeg',0.95);
}

// ══ قارئ باركود ══
var _bcStorage=JSON.parse(localStorage.getItem('bcStore')||'[]');

function buildBarcode(){
  document.getElementById('sheetBody').innerHTML=`
    ${desc('يقرأ QR Code وباركود من الكاميرا أو صورة، ويحفظها في مخزن شخصي.','Reads QR/barcodes from camera or image, and saves them in personal storage.')}

    <!-- Tabs -->
    <div style="display:flex;gap:8px;margin-bottom:12px">
      <button id="bcTabScan" onclick="bcShowTab('scan')" style="flex:1;padding:10px;border-radius:8px;border:2px solid var(--red);background:rgba(229,57,53,0.1);color:var(--red);font-family:inherit;font-size:12px;font-weight:600;cursor:pointer">${_lang==='ar'?'مسح':'Scan'}</button>
      <button id="bcTabStore" onclick="bcShowTab('store')" style="flex:1;padding:10px;border-radius:8px;border:2px solid var(--border);background:var(--card2);color:var(--text2);font-family:inherit;font-size:12px;font-weight:600;cursor:pointer">${_lang==='ar'?'مستودع الباركود':'BC Storage'}</button>
    </div>

    <!-- SCAN PANEL -->
    <div id="bcPanelScan">
      <div style="background:var(--card);border-radius:10px;padding:14px;margin-bottom:10px">
        <div style="display:flex;gap:8px;margin-bottom:12px">
          <button onclick="bcStartCamera()" style="flex:1;padding:12px;background:var(--red);border:none;border-radius:8px;color:white;font-family:inherit;font-size:13px;font-weight:600;cursor:pointer">${_lang==='ar'?'كاميرا':'Camera'}</button>
          <label style="flex:1;padding:12px;background:var(--card2);border:1px solid var(--border);border-radius:8px;color:var(--text);font-family:inherit;font-size:13px;font-weight:600;cursor:pointer;text-align:center">
            ${_lang==='ar'?'من صورة':'From Image'}
            <input type="file" id="bcImgIn" accept="image/*" style="display:none">
          </label>
        </div>
        <div id="bcCameraWrap" style="display:none;margin-bottom:10px">
          <video id="bcVideo" style="width:100%;border-radius:8px;background:#000;max-height:260px;object-fit:cover" autoplay playsinline muted></video>
          <button onclick="bcStopCamera()" style="width:100%;margin-top:8px;padding:10px;background:var(--card2);border:1px solid var(--border);border-radius:8px;color:var(--text3);font-family:inherit;font-size:13px;cursor:pointer">${_lang==='ar'?'إيقاف الكاميرا':'Stop Camera'}</button>
        </div>
        <div id="bcCaptureConfirm" style="display:none;margin-bottom:10px">
          <div style="font-size:12px;color:var(--text2);margin-bottom:6px">${_lang==='ar'?'تم اكتشاف باركود — تأكد أن الصورة واضحة:':'Barcode detected — make sure the image is clear:'}</div>
          <img id="bcCaptureImg" style="width:100%;border-radius:8px;margin-bottom:10px;border:1px solid var(--border)">
          <div style="display:flex;gap:8px">
            <button onclick="bcConfirmRetry()" style="flex:1;padding:12px;background:var(--card2);border:1px solid var(--border);border-radius:8px;color:var(--text);font-family:inherit;font-size:13px;font-weight:600;cursor:pointer">${_lang==='ar'?'إعادة المسح':'Rescan'}</button>
            <button onclick="bcConfirmUse()" style="flex:1;padding:12px;background:var(--red);border:none;border-radius:8px;color:white;font-family:inherit;font-size:13px;font-weight:600;cursor:pointer">${_lang==='ar'?'استخدام هذه الصورة':'Use This Image'}</button>
          </div>
        </div>
        <canvas id="bcCanvas" style="display:none"></canvas>
      </div>

      <!-- Result -->
      <div id="bcResult" style="display:none;background:var(--card);border-radius:10px;padding:14px;margin-bottom:10px">
        <div style="font-size:12px;color:var(--text2);margin-bottom:6px">${_lang==='ar'?'النتيجة:':'Result:'}</div>
        <div id="bcText" style="font-size:15px;font-weight:600;color:var(--text);word-break:break-all;margin-bottom:12px;padding:10px;background:var(--card2);border-radius:8px"></div>
        <div style="display:flex;gap:8px;margin-bottom:10px">
          <button onclick="navigator.clipboard.writeText(document.getElementById('bcText').textContent);toast(_lang==='ar'?'تم النسخ':'Copied','ok')" style="flex:1;padding:10px;background:var(--card2);border:1px solid var(--border);border-radius:8px;color:var(--text);font-family:inherit;font-size:12px;cursor:pointer"> ${_lang==='ar'?'نسخ':'Copy'}</button>
          <button id="bcOpenBtn" style="flex:1;padding:10px;background:var(--red);border:none;border-radius:8px;color:white;font-family:inherit;font-size:12px;cursor:pointer;display:none">${_lang==='ar'?'فتح':'Open'}</button>
        </div>
        <!-- Save to storage -->
        <div style="border-top:1px solid var(--border);padding-top:10px;margin-top:4px">
          <div style="font-size:12px;color:var(--text2);margin-bottom:8px">${_lang==='ar'?'حفظ في المخزن:':'Save to Storage:'}</div>
          <div class="field" style="margin-bottom:8px"><label>${_lang==='ar'?'العنوان':'Title'}</label><input type="text" id="bcSaveTitle" placeholder="${_lang==='ar'?'مثال: باركود هويتي':'e.g. My ID barcode'}"></div>
          <div class="field" style="margin-bottom:8px"><label>${_lang==='ar'?'الوصف (اختياري)':'Description (optional)'}</label><input type="text" id="bcSaveDesc" placeholder="${_lang==='ar'?'وصف مختصر...':'Short description...'}"></div>
          <div class="field" style="margin-bottom:8px">
            <label>${_lang==='ar'?'صورة مرفقة (اختياري)':'Attached image (optional)'}</label>
            <div style="display:flex;gap:8px">
              <label style="flex:1;display:block;padding:10px;background:var(--card2);border:1px dashed var(--border);border-radius:8px;color:var(--text2);font-size:12px;text-align:center;cursor:pointer">
                ${_lang==='ar'?'إعادة التقاط بالكاميرا':'Retake with Camera'}
                <input type="file" id="bcSaveImgCam" accept="image/*" capture="environment" style="display:none">
              </label>
              <label style="flex:1;display:block;padding:10px;background:var(--card2);border:1px dashed var(--border);border-radius:8px;color:var(--text2);font-size:12px;text-align:center;cursor:pointer">
                ${_lang==='ar'?'من المعرض':'From Gallery'}
                <input type="file" id="bcSaveImg" accept="image/*" style="display:none">
              </label>
            </div>
            <div id="bcImgLabel" style="font-size:11px;color:var(--text3);margin-top:6px;text-align:center"></div>
            <img id="bcSaveImgEl" style="display:none;width:100%;max-height:160px;object-fit:contain;border-radius:8px;margin-top:8px;border:1px solid var(--border)">
          </div>
          <button onclick="bcSaveToStorage()" style="width:100%;padding:11px;background:var(--red);border:none;border-radius:8px;color:white;font-family:inherit;font-size:13px;font-weight:600;cursor:pointer"> ${_lang==='ar'?'حفظ':'Save'}</button>
        </div>
      </div>
    </div>

    <!-- STORAGE PANEL -->
    <div id="bcPanelStore" style="display:none">
      <button onclick="bcShowTab('scan')" style="width:100%;padding:12px;margin-bottom:12px;background:var(--red);border:none;border-radius:8px;color:white;font-family:inherit;font-size:13px;font-weight:600;cursor:pointer">+ ${_lang==='ar'?'إضافة باركود جديد':'Add New Barcode'}</button>
      <div id="bcStoreList"></div>
    </div>
  `;

  // Load jsQR
  if(!window.jsQR){
    var s=document.createElement('script');
    s.src='https://cdn.jsdelivr.net/npm/jsqr@1.4.0/dist/jsQR.js';
    document.head.appendChild(s);
  }

  document.getElementById('bcImgIn').addEventListener('change',function(e){
    var f=e.target.files[0];if(!f)return;
    var url=URL.createObjectURL(f);var img=new Image();
    img.onload=function(){
      var cv=document.getElementById('bcCanvas');
      cv.width=img.naturalWidth;cv.height=img.naturalHeight;
      cv.getContext('2d').drawImage(img,0,0);
      var imgData=cv.getContext('2d').getImageData(0,0,cv.width,cv.height);
      if(!window.jsQR){setTimeout(function(){bcScanImageData(imgData);},1200);return;}
      bcScanImageData(imgData);
    };img.src=url;
  });

  window._bcEditId=null;
  setTimeout(function(){
    function wireImgInput(id){
      var imgIn=document.getElementById(id);
      if(imgIn)imgIn.addEventListener('change',function(e){
        var f=e.target.files[0];if(!f)return;
        window._bcSaveImgUrl=URL.createObjectURL(f);
        var el=document.getElementById('bcSaveImgEl');var lbl=document.getElementById('bcImgLabel');
        if(el){el.src=window._bcSaveImgUrl;el.style.display='block';}
        if(lbl)lbl.textContent=_lang==='ar'?'تم اختيار صورة جديدة':'New image selected';
      });
    }
    wireImgInput('bcSaveImg');
    wireImgInput('bcSaveImgCam');
  },100);
}

function bcShowTab(t){
  var isScan=t==='scan';
  var btnScan=document.getElementById('bcTabScan'),btnStore=document.getElementById('bcTabStore');
  btnScan.style.borderColor=isScan?'var(--red)':'var(--border)';btnScan.style.background=isScan?'rgba(229,57,53,0.1)':'var(--card2)';btnScan.style.color=isScan?'var(--red)':'var(--text2)';
  btnStore.style.borderColor=!isScan?'var(--red)':'var(--border)';btnStore.style.background=!isScan?'rgba(229,57,53,0.1)':'var(--card2)';btnStore.style.color=!isScan?'var(--red)':'var(--text2)';
  document.getElementById('bcPanelScan').style.display=isScan?'block':'none';
  document.getElementById('bcPanelStore').style.display=!isScan?'block':'none';
  if(!isScan)bcRenderStore();
}

function bcScanImageData(imgData){
  if(!window.jsQR){toast(_lang==='ar'?'المكتبة لم تُحمَّل، حاول مرة أخرى':'Library not loaded, try again','err');return;}
  var code=jsQR(imgData.data,imgData.width,imgData.height);
  if(code){bcShowResult(code.data);}
  else{toast(_lang==='ar'?'لم يُعثر على باركود':'No barcode found','err');}
}

function bcShowResult(text){
  var res=document.getElementById('bcResult');
  var txt=document.getElementById('bcText');
  var openBtn=document.getElementById('bcOpenBtn');
  if(!res||!txt)return;
  txt.textContent=text;res.style.display='block';
  var isURL=/^https?:\/\//i.test(text);
  if(openBtn){openBtn.style.display=isURL?'block':'none';openBtn.onclick=function(){window.open(text,'_blank');};}
  // التقاط الصورة الأصلية (من الكاميرا وقت الاكتشاف، أو من الصورة المرفوعة) تلقائياً لتُحفظ كما هي
  var cv=document.getElementById('bcCanvas');
  if(cv&&cv.width>0){
    try{
      window._bcSaveImgUrl=cv.toDataURL('image/jpeg',0.85);
      var el=document.getElementById('bcSaveImgEl');var lbl=document.getElementById('bcImgLabel');
      if(el){el.src=window._bcSaveImgUrl;el.style.display='block';}
      if(lbl)lbl.textContent=_lang==='ar'?'تم التقاط الصورة تلقائياً (اضغط لتغييرها)':'Image captured automatically (tap to change)';
    }catch(e){}
  }
  toast(_lang==='ar'?'تم قراءة الباركود':'Barcode detected','ok');
}

var _bcStream=null;
function bcStartCamera(){
  document.getElementById('bcCameraWrap').style.display='block';
  navigator.mediaDevices.getUserMedia({video:{facingMode:'environment'}}).then(function(stream){
    _bcStream=stream;var vid=document.getElementById('bcVideo');
    vid.srcObject=stream;vid.play();bcScanLoop();
  }).catch(function(err){var isPermission=err&&(err.name==='NotAllowedError'||err.name==='PermissionDeniedError');var msg=isPermission?(_lang==='ar'?'يحتاج رابط https لمنح إذن الكاميرا. ارفع الملف على netlify.com':'Needs https for camera permission. Upload to netlify.com'):(_lang==='ar'?'خطأ في الكاميرا':'Camera error');toast(msg,'err');document.getElementById('bcCameraWrap').style.display='none';});
}
function bcScanLoop(){
  var vid=document.getElementById('bcVideo');var cv=document.getElementById('bcCanvas');
  if(!vid||!cv||!_bcStream)return;
  if(vid.readyState===vid.HAVE_ENOUGH_DATA){
    cv.width=vid.videoWidth;cv.height=vid.videoHeight;
    cv.getContext('2d').drawImage(vid,0,0);
    if(window.jsQR){
      var imgData=cv.getContext('2d').getImageData(0,0,cv.width,cv.height);
      var code=jsQR(imgData.data,imgData.width,imgData.height);
      if(code){bcStopCamera();bcShowCaptureConfirm(code.data);return;}
    }
  }
  if(_bcStream)requestAnimationFrame(bcScanLoop);
}
function bcStopCamera(){
  if(_bcStream){_bcStream.getTracks().forEach(function(t){t.stop();});_bcStream=null;}
  var w=document.getElementById('bcCameraWrap');if(w)w.style.display='none';
}
var _bcPendingCode=null;
function bcShowCaptureConfirm(code){
  _bcPendingCode=code;
  var cv=document.getElementById('bcCanvas');
  var img=document.getElementById('bcCaptureImg');
  if(cv&&img)img.src=cv.toDataURL('image/jpeg',0.9);
  var c=document.getElementById('bcCaptureConfirm');if(c)c.style.display='block';
}
function bcConfirmUse(){
  var c=document.getElementById('bcCaptureConfirm');if(c)c.style.display='none';
  if(_bcPendingCode)bcShowResult(_bcPendingCode);
  _bcPendingCode=null;
}
function bcConfirmRetry(){
  var c=document.getElementById('bcCaptureConfirm');if(c)c.style.display='none';
  _bcPendingCode=null;
  bcStartCamera();
}

// ── Storage ──
function bcSaveToStorage(){
  var text=document.getElementById('bcText')?.textContent?.trim();
  if(!text){toast(_lang==='ar'?'لا يوجد باركود للحفظ':'No barcode to save','err');return;}
  var title=document.getElementById('bcSaveTitle')?.value?.trim()||text.substring(0,30);
  var desc2=document.getElementById('bcSaveDesc')?.value?.trim()||'';
  if(window._bcEditId!==null){
    // Edit mode
    var idx2=_bcStorage.findIndex(function(x){return x.id===window._bcEditId;});
    if(idx2>=0){_bcStorage[idx2].title=title;_bcStorage[idx2].desc=desc2;_bcStorage[idx2].value=text;_bcStorage[idx2].img=window._bcSaveImgUrl||_bcStorage[idx2].img||null;}
    window._bcEditId=null;window._bcSaveImgUrl=null;
  }else{
    var imgUrl=window._bcSaveImgUrl||null;window._bcSaveImgUrl=null;
  _bcStorage.unshift({id:Date.now(),value:text,title:title,desc:desc2,date:new Date().toLocaleDateString('ar-SA'),img:imgUrl});
  }
  localStorage.setItem('bcStore',JSON.stringify(_bcStorage));
  document.getElementById('bcSaveTitle').value='';document.getElementById('bcSaveDesc').value='';
  var lbl=document.getElementById('bcImgLabel');if(lbl)lbl.textContent=_lang==='ar'?'اختر صورة...':'Choose image...';
  var el=document.getElementById('bcSaveImgEl');if(el){el.src='';el.style.display='none';}
  document.getElementById('bcResult').style.display='none';
  document.getElementById('bcText').textContent='';
  toast(_lang==='ar'?'تم الحفظ في المخزن':'Saved to storage','ok');
  bcShowTab('store');
}

function bcRenderStore(){
  var list=document.getElementById('bcStoreList');if(!list)return;
  if(!_bcStorage.length){
    list.innerHTML='<div class="empty-state"><p>'+(_lang==='ar'?'المخزن فارغ — امسح باركود واحفظه':'Storage is empty — scan a barcode and save it')+'</p></div>';return;
  }
  list.innerHTML=_bcStorage.map(function(item){
    return '<div style="background:var(--card);border-radius:10px;padding:14px;margin-bottom:10px;border:1px solid var(--border)">'
      +'<div style="display:flex;align-items:flex-start;gap:8px;margin-bottom:8px">'
      +'<div style="flex:1">'
      +'<div style="font-size:14px;font-weight:700;color:var(--text);margin-bottom:3px">'+item.title+'</div>'
      +(item.desc?'<div style="font-size:12px;color:var(--text2);margin-bottom:4px">'+item.desc+'</div>':'')
      +'<div style="font-size:11px;color:var(--text3)">'+item.date+'</div>'
      +'</div>'
      +'<div style="display:flex;gap:4px;flex-shrink:0">'
      +'<button onclick="bcEditItem('+item.id+')" style="background:var(--card2);border:1px solid var(--border);border-radius:6px;color:var(--text2);cursor:pointer;padding:6px 10px;font-size:11px;font-family:inherit">'+(_lang==='ar'?'تعديل':'Edit')+'</button>'
      +'<button onclick="bcDeleteItem('+item.id+')" style="background:none;border:none;color:var(--red);cursor:pointer;padding:6px 8px;font-size:16px">✕</button>'
      +'</div>'
      +'</div>'
      +(item.img?'<img src="'+item.img+'" style="width:100%;max-height:240px;object-fit:contain;border-radius:8px;border:1px solid var(--border);margin-bottom:8px;background:#fff">':'')
      +'<div style="background:var(--card2);border-radius:6px;padding:8px;font-size:12px;color:var(--text);word-break:break-all;margin-bottom:8px">'+item.value+'</div>'
      +'<div style="display:flex;gap:6px">'
      +'<button onclick="navigator.clipboard.writeText(\''+item.value.replace(/'/g,"\\'")+'\')" style="flex:1;padding:8px;background:var(--card2);border:1px solid var(--border);border-radius:6px;color:var(--text2);font-family:inherit;font-size:11px;cursor:pointer"> '+(_lang==='ar'?'نسخ':'Copy')+'</button>'
      +(/^https?:\/\//i.test(item.value)?'<button onclick="window.open(\''+item.value+'\')" style="flex:1;padding:8px;background:var(--red);border:none;border-radius:6px;color:white;font-family:inherit;font-size:11px;cursor:pointer">'+(_lang==='ar'?'فتح':'Open')+'</button>':'')
      +'</div>'
      +'</div>';
  }).join('');
}

function bcEditItem(id){
  var item=_bcStorage.find(function(x){return x.id===id;});if(!item)return;
  bcShowTab('scan');
  window._bcEditId=id;
  var txt=document.getElementById('bcText');if(txt){txt.textContent=item.value;document.getElementById('bcResult').style.display='block';}
  var t=document.getElementById('bcSaveTitle');if(t)t.value=item.title;
  var d=document.getElementById('bcSaveDesc');if(d)d.value=item.desc||'';
  if(item.img){window._bcSaveImgUrl=item.img;var el=document.getElementById('bcSaveImgEl');if(el){el.src=item.img;el.style.display='block';}var lbl=document.getElementById('bcImgLabel');if(lbl)lbl.textContent=_lang==='ar'?'الصورة المحفوظة (اضغط أعلاه لتغييرها)':'Saved image (tap above to change)';}
  toast(_lang==='ar'?'عدّل البيانات ثم اضغط حفظ':'Edit and press Save','ok');
}

function bcDeleteItem(id){
  _bcStorage=_bcStorage.filter(function(x){return x.id!==id;});
  localStorage.setItem('bcStore',JSON.stringify(_bcStorage));
  bcRenderStore();
  toast(_lang==='ar'?'تم الحذف':'Deleted','ok');
}

// ══ صوت إلى نص ══
function buildSTT(){
  document.getElementById('sheetBody').innerHTML=`
    ${desc('تكلم والتطبيق يكتب ما تقوله. يدعم العربي والإنجليزي.','Speak and the app writes what you say.')}
    <div style="background:var(--card);border-radius:10px;padding:14px;margin-bottom:10px">
      <div class="field">
        <label>${_lang==='ar'?'اللغة:':'Language:'}</label>
        <select id="sttLang" style="width:100%;padding:10px;background:var(--card2);border:1px solid var(--border);border-radius:8px;color:var(--text);font-family:inherit">
          <option value="ar-SA">${_lang==='ar'?'عربي (السعودية)':'Arabic (Saudi)'}</option>
          <option value="ar-EG">${_lang==='ar'?'عربي (مصر)':'Arabic (Egypt)'}</option>
          <option value="en-US">English (US)</option>
          <option value="en-GB">English (UK)</option>
        </select>
      </div>
      <button id="sttBtn" onclick="sttToggle()" class="action-btn">
        ${_lang==='ar'?'ابدأ التسجيل':'Start Recording'}
      </button>
      <div id="sttStatus" style="text-align:center;font-size:12px;color:var(--text3);margin-top:8px"></div>
    </div>
    <div style="background:var(--card);border-radius:10px;padding:14px">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px">
        <label style="font-size:13px;font-weight:600;color:var(--text)">${_lang==='ar'?'النص:':'Text:'}</label>
        <button onclick="document.getElementById('sttOutput').value=''" style="background:none;border:none;color:var(--text3);font-size:11px;cursor:pointer">${_lang==='ar'?'مسح':'Clear'}</button>
      </div>
      <textarea id="sttOutput" style="width:100%;min-height:150px;background:var(--card2);border:1px solid var(--border);border-radius:8px;padding:10px;color:var(--text);font-family:inherit;font-size:14px;resize:vertical" placeholder="${_lang==='ar'?'سيظهر النص هنا...':'Text will appear here...'}"></textarea>
      <div style="display:flex;gap:8px;margin-top:8px">
        <button onclick="navigator.clipboard.writeText(document.getElementById('sttOutput').value);toast(_lang==='ar'?'تم النسخ':'Copied','ok')" style="flex:1;padding:10px;background:var(--card2);border:1px solid var(--border);border-radius:8px;color:var(--text);font-family:inherit;font-size:12px;cursor:pointer"></button>
        <button onclick="var t=document.getElementById('sttOutput').value;if(t){var b=new Blob([t],{type:'text/plain'});var a=document.createElement('a');a.href=URL.createObjectURL(b);a.download='transcript.txt';a.click();}" style="flex:1;padding:10px;background:var(--card2);border:1px solid var(--border);border-radius:8px;color:var(--text);font-family:inherit;font-size:12px;cursor:pointer"></button>
      </div>
    </div>`;
  if(!('webkitSpeechRecognition' in window)&&!('SpeechRecognition' in window)){
    toast(_lang==='ar'?'استخدم Chrome للحصول على هذه الميزة':'Use Chrome for this feature','err');
  }
}

var _sttRec=null,_sttActive=false;
function sttToggle(){
  if(_sttActive){if(_sttRec)_sttRec.stop();_sttActive=false;var btn=document.getElementById('sttBtn');if(btn){btn.textContent=''+(_lang==='ar'?'ابدأ التسجيل':'Start Recording');btn.style.background='var(--red)';}return;}
  var SR=window.SpeechRecognition||window.webkitSpeechRecognition;
  if(!SR){toast(_lang==='ar'?'غير مدعوم':'Not supported','err');return;}
  _sttRec=new SR();_sttRec.lang=document.getElementById('sttLang')?.value||'ar-SA';
  _sttRec.continuous=true;_sttRec.interimResults=true;
  var finalText='';
  _sttRec.onstart=function(){_sttActive=true;var btn=document.getElementById('sttBtn');if(btn){btn.textContent=' '+(_lang==='ar'?'إيقاف':'Stop');btn.style.background='#b71c1c';}var st=document.getElementById('sttStatus');if(st)st.textContent=''+(_lang==='ar'?'جاري التسجيل...':'Recording...');};
  _sttRec.onresult=function(e){var interim='';for(var i=e.resultIndex;i<e.results.length;i++){if(e.results[i].isFinal)finalText+=e.results[i][0].transcript+' ';else interim+=e.results[i][0].transcript;}var out=document.getElementById('sttOutput');if(out)out.value=finalText+interim;};
  _sttRec.onerror=function(e){_sttActive=false;var btn=document.getElementById('sttBtn');if(btn){btn.textContent=_lang==='ar'?'ابدأ التسجيل':'Start Recording';btn.style.background='var(--red)';}if(e.error==='not-allowed'){var st=document.getElementById('sttStatus');if(st)st.textContent=_lang==='ar'?'يحتاج رابط https — ارفع الملف على Netlify.com مجاناً':'Needs https — upload file to Netlify.com for free';}else{toast('Error: '+e.error,'err');}};
  _sttRec.onend=function(){_sttActive=false;var btn=document.getElementById('sttBtn');if(btn){btn.textContent=''+(_lang==='ar'?'ابدأ التسجيل':'Start Recording');btn.style.background='var(--red)';}var st=document.getElementById('sttStatus');if(st)st.textContent=''+(_lang==='ar'?'انتهى التسجيل':'Recording ended');};
  _sttRec.start();
}

// ══ تحويل صيغة الصوت ══
function buildAudioConv(){
  document.getElementById('sheetBody').innerHTML=`
    ${desc('يحوّل ملفات الصوت بين الصيغ المختلفة مباشرة في المتصفح.','Converts audio files between formats directly in browser.')}
    <div class="drop-zone"><input type="file" id="acIn" accept="audio/*">
      <div class="dz-icwrap"><svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#a78bfa" stroke-width="1.8" stroke-linecap="round"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg></div>
      <div class="dz-t">${_lang==='ar'?'اختر ملف صوتي':'Choose Audio File'}</div>
      <div class="dz-s">MP3 · WAV · OGG · M4A</div>
    </div>
    <div id="acCont" style="display:none">
      <div class="sel-list" id="acFileInfo"></div>
      <div class="field"><label>${_lang==='ar'?'حوّل إلى:':'Convert to:'}</label>
        <select id="acTo" style="width:100%;padding:11px;background:var(--card);border:1px solid var(--border);border-radius:10px;color:var(--text);font-family:inherit;font-size:14px">
          <option value="wav">WAV</option><option value="ogg">OGG</option>
        </select>
      </div>
      <audio id="acPlayer" controls style="width:100%;margin-bottom:12px;border-radius:8px"></audio>
      <div id="acProg" style="display:none;margin-bottom:10px">
        <div style="font-size:12px;color:var(--text2);margin-bottom:6px">${_lang==='ar'?'جاري المعالجة...':'Processing...'}</div>
        <div style="height:4px;background:var(--border);border-radius:4px"><div id="acProgBar" style="height:100%;background:var(--red);width:0%;border-radius:4px;transition:width .3s"></div></div>
      </div>
      <button class="action-btn" onclick="doAudioConv()">${icoDl()} ${_lang==='ar'?'تحويل وتحميل':'Convert & Download'}</button>
    </div>`;
  document.getElementById('acIn').addEventListener('change',function(e){
    var f=e.target.files[0];if(!f)return;window._acFile=f;
    document.getElementById('acPlayer').src=URL.createObjectURL(f);
    document.getElementById('acFileInfo').innerHTML='<div class="sel-item"><span class="si-name">'+f.name+'</span><span class="si-size">'+fmtSize(f.size)+'</span></div>';
    document.getElementById('acCont').style.display='block';
  });
}

async function doAudioConv(){
  var f=window._acFile;if(!f){toast(_lang==='ar'?'اختر ملفاً':'Choose a file','err');return;}
  var ext=document.getElementById('acTo').value;
  var prog=document.getElementById('acProg');var bar=document.getElementById('acProgBar');
  prog.style.display='block';bar.style.width='30%';
  try{
    var ctx=new(window.AudioContext||window.webkitAudioContext)();
    var ab=await f.arrayBuffer();bar.style.width='55%';
    var decoded=await ctx.decodeAudioData(ab);bar.style.width='80%';
    var offline=new OfflineAudioContext(decoded.numberOfChannels,decoded.length,decoded.sampleRate);
    var src=offline.createBufferSource();src.buffer=decoded;src.connect(offline.destination);src.start();
    var rendered=await offline.startRendering();bar.style.width='95%';
    var wav=audioBufferToWav(rendered);
    var blob=new Blob([wav],{type:'audio/wav'});
    var a=document.createElement('a');a.href=URL.createObjectURL(blob);
    a.download=f.name.replace(/\.[^.]+$/,'')+'.'+ext;a.click();
    bar.style.width='100%';setTimeout(function(){prog.style.display='none';},500);
    toast(_lang==='ar'?'تم التحويل':'Converted','ok');
  }catch(e){prog.style.display='none';toast('Error: '+e.message,'err');}
}

function audioBufferToWav(buffer){
  var nc=buffer.numberOfChannels,sr=buffer.sampleRate,len=buffer.length;
  var wav=new ArrayBuffer(44+len*nc*2);var view=new DataView(wav);
  function ws(o,s){for(var i=0;i<s.length;i++)view.setUint8(o+i,s.charCodeAt(i));}
  ws(0,'RIFF');view.setUint32(4,36+len*nc*2,true);ws(8,'WAVE');ws(12,'fmt ');
  view.setUint32(16,16,true);view.setUint16(20,1,true);view.setUint16(22,nc,true);
  view.setUint32(24,sr,true);view.setUint32(28,sr*nc*2,true);
  view.setUint16(32,nc*2,true);view.setUint16(34,16,true);ws(36,'data');
  view.setUint32(40,len*nc*2,true);
  var off=44;
  for(var i=0;i<len;i++){for(var ch=0;ch<nc;ch++){
    var s=Math.max(-1,Math.min(1,buffer.getChannelData(ch)[i]));
    view.setInt16(off,s<0?s*0x8000:s*0x7FFF,true);off+=2;
  }}
  return wav;
}

// ══ تحويل إلى بكسل v6 ══
function buildPixelate(){
  document.getElementById('sheetBody').innerHTML=`
    ${desc('يحوّل صورتك لشبكة بكسل احترافية للرسم اليدوي في دفتر أو تيفو.','Converts image to a professional pixel grid for hand drawing.')}
    <div class="drop-zone"><input type="file" id="pxIn" accept="image/*">
      <div class="dz-icwrap"><svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#818cf8" stroke-width="1.8" stroke-linecap="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg></div>
      <div class="dz-t">${_lang==='ar'?'اختر الصورة':'Choose Image'}</div>
    </div>
    <div id="pxCont" style="display:none">
      <div style="background:var(--card);border-radius:10px;padding:14px;margin-bottom:10px">

        <!-- Mode -->
        <div style="font-size:13px;font-weight:700;color:var(--text);margin-bottom:8px">${_lang==='ar'?'نوع الصورة:':'Image Type:'}</div>
        <div style="display:flex;gap:8px;margin-bottom:14px">
          <button id="pxModeSimple" onclick="pxSetMode('simple')" style="flex:1;padding:10px 6px;border-radius:8px;border:2px solid var(--red);background:rgba(229,57,53,0.1);color:var(--red);font-family:inherit;font-size:12px;font-weight:600;cursor:pointer">
            ${_lang==='ar'?'بسيطة\n(كارتون، لوجو، رموز)':'Simple\n(cartoon, logo, icons)'}
          </button>
          <button id="pxModeDetail" onclick="pxSetMode('detail')" style="flex:1;padding:10px 6px;border-radius:8px;border:2px solid var(--border);background:var(--card2);color:var(--text2);font-family:inherit;font-size:12px;font-weight:600;cursor:pointer">
            ${_lang==='ar'?'تفصيلية كبيرة جداً':'Very Detailed\n(photos, cities)'}
          </button>
        </div>

        <!-- Cell size -->
        <div style="font-size:13px;font-weight:700;color:var(--text);margin-bottom:4px">${_lang==='ar'?'حجم خلية البكسل:':'Cell Size:'}</div>
        <div class="slider-row">
          <label>${_lang==='ar'?'الحجم':'Size'}</label>
          <input type="range" id="pxCell" min="2" max="80" value="16" style="flex:1;accent-color:var(--red)" oninput="document.getElementById('pxCellN').value=this.value;pxPreview()">
          <input type="number" class="slider-num" id="pxCellN" min="2" max="80" value="16" oninput="var v=Math.min(80,+this.value||0);this.value=v;document.getElementById('pxCell').value=v;pxPreview()" onblur="var mn=2;var v2=+this.value;if(!v2||v2<mn)this.value=mn;document.getElementById('pxCell').value=this.value;document.getElementById('pxCell').value=v;pxPreview()">
        </div>

        <div id="pxPresetsSimple">
          <div style="font-size:11px;color:var(--text2);margin-bottom:5px">${_lang==='ar'?'أحجام جاهزة:':'Presets:'}</div>
          <div style="display:flex;flex-wrap:wrap;gap:5px;margin-bottom:10px">
            ${[[8,'8px Mini'],[12,'12px Small'],[16,'16px Medium'],[20,'20px Clear'],[28,'28px Large'],[40,'40px Huge']].map(p=>`<button onclick="document.getElementById('pxCell').value=${p[0]};document.getElementById('pxCellN').value=${p[0]};pxPreview()" style="padding:5px 8px;background:var(--card2);border:1px solid var(--border);border-radius:6px;color:var(--text2);font-family:inherit;font-size:10px;cursor:pointer">${p[1]}</button>`).join('')}
          </div>
        </div>
        <div id="pxPresetsDetail" style="display:none">
          <div style="font-size:11px;color:var(--text2);margin-bottom:5px">${_lang==='ar'?'أحجام جاهزة:':'Presets:'}</div>
          <div style="display:flex;flex-wrap:wrap;gap:5px;margin-bottom:10px">
            ${[[2,'2px Ultra'],[3,'3px Fine'],[4,'4px Sharp'],[6,'6px Detail'],[8,'8px Good'],[10,'10px Std']].map(p=>`<button onclick="document.getElementById('pxCell').value=${p[0]};document.getElementById('pxCellN').value=${p[0]};pxPreview()" style="padding:5px 8px;background:var(--card2);border:1px solid var(--border);border-radius:6px;color:var(--text2);font-family:inherit;font-size:10px;cursor:pointer">${p[1]}</button>`).join('')}
          </div>
        </div>

        <div id="pxInfo" style="font-size:11px;color:var(--red);font-weight:600;margin-bottom:12px;padding:6px 10px;background:rgba(229,57,53,0.08);border-radius:6px;border:1px solid rgba(229,57,53,0.25)"></div>

        <!-- Number density -->
        <div style="font-size:13px;font-weight:700;color:var(--text);margin-bottom:8px">${_lang==='ar'?'الأرقام:':'Numbers:'}</div>
        <div class="fields-row">
          <div class="field">
            <label>${_lang==='ar'?'أرقام الأعمدة':'Columns (every N)'}</label>
            <select id="pxColStep" onchange="pxPreview()" style="width:100%;padding:10px;background:var(--card2);border:1px solid var(--border);border-radius:8px;color:var(--text);font-family:inherit">
              ${Array.from({length:20},(_,i)=>i+1).map(n=>`<option value="${n}" ${n===2?'selected':''}>${_lang==='ar'?'كل ':'Every '}${n}</option>`).join('')}
              <option value="0">${_lang==='ar'?'بدون':'None'}</option>
            </select>
          </div>
          <div class="field">
            <label>${_lang==='ar'?'أرقام الصفوف':'Rows (every N)'}</label>
            <select id="pxRowStep" onchange="pxPreview()" style="width:100%;padding:10px;background:var(--card2);border:1px solid var(--border);border-radius:8px;color:var(--text);font-family:inherit">
              ${Array.from({length:20},(_,i)=>i+1).map(n=>`<option value="${n}" ${n===2?'selected':''}>${_lang==='ar'?'كل ':'Every '}${n}</option>`).join('')}
              <option value="0">${_lang==='ar'?'بدون':'None'}</option>
            </select>
          </div>
        </div>
        <div style="display:flex;flex-wrap:wrap;gap:10px;margin-bottom:10px">
          <label style="display:flex;align-items:center;gap:6px;font-size:13px;color:var(--text2);cursor:pointer"><input type="checkbox" id="pxGrid" checked onchange="pxPreview()" style="accent-color:var(--red);width:16px;height:16px">${_lang==='ar'?'شبكة':'Grid'}</label>
          <label style="display:flex;align-items:center;gap:6px;font-size:13px;color:var(--text2);cursor:pointer"><input type="checkbox" id="pxNums" checked onchange="pxPreview()" style="accent-color:var(--red);width:16px;height:16px">${_lang==='ar'?'أرقام':'Numbers'}</label>
          <label style="display:flex;align-items:center;gap:6px;font-size:13px;color:var(--text2);cursor:pointer"><input type="checkbox" id="pxBold5" checked onchange="pxPreview()" style="accent-color:var(--red);width:16px;height:16px">${_lang==='ar'?'خط سميك كل 5':'Bold every 5'}</label>
        </div>
        <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap">
          <span style="font-size:12px;color:var(--text2)">${_lang==='ar'?'لون الشبكة:':'Grid:'}</span>
          ${['#000000','#444444','#888888','#cccccc','#e53935','#1565c0'].map(gc=>`<div onclick="window._pxGC='${gc}';pxPreview()" style="width:24px;height:24px;border-radius:4px;background:${gc};cursor:pointer;border:2px solid rgba(128,128,128,0.35)"></div>`).join('')}
          <input type="color" value="#000000" oninput="window._pxGC=this.value;pxPreview()" style="width:30px;height:30px;border:none;border-radius:4px;cursor:pointer;padding:0">
        </div>
      </div>

      <!-- Batch split -->
      <div style="background:var(--card);border-radius:10px;padding:14px;margin-bottom:10px">
        <div style="font-size:13px;font-weight:700;color:var(--text);margin-bottom:4px">${_lang==='ar'?'تقسيم لدفعات:':'Split into Batches:'}</div>
        <div style="font-size:11px;color:var(--text3);margin-bottom:10px">${_lang==='ar'?'يقسّم الشبكة لأجزاء لتسهيل الرسم. الصورة الصغيرة تعرض الموقع الكامل.':'Splits grid into sections. The small image shows position in full grid.'}</div>
        <div class="slider-row" style="margin-bottom:10px">
          <label>${_lang==='ar'?'الدفعات':'Batches'}</label>
          <input type="range" id="pxBatch" min="1" max="100" value="1" style="flex:1;accent-color:var(--red)" oninput="document.getElementById('pxBatchN').value=this.value;window._pxBatchIdx=0;pxPreview()">
          <input type="number" class="slider-num" id="pxBatchN" min="1" max="100" value="1" oninput="var v=Math.min(100,+this.value||0);this.value=v;document.getElementById('pxBatch').value=v;window._pxBatchIdx=0;pxPreview()" onblur="var mn=1;var v2=+this.value;if(!v2||v2<mn)this.value=mn;document.getElementById('pxBatch').value=this.value;document.getElementById('pxBatch').value=v;window._pxBatchIdx=0;pxPreview()">
        </div>
        <div id="pxBatchNav" style="display:none">
          <!-- Minimap: SMALL image with highlight -->
          <div style="margin-bottom:10px">
            <div style="font-size:11px;color:var(--text2);margin-bottom:5px">${_lang==='ar'?'الصورة الكاملة — الجزء الأحمر = الدفعة الحالية:':'Full image — red area = current batch:'}</div>
            <div style="position:relative;display:inline-block;border-radius:6px;overflow:hidden;border:1px solid var(--border)">
              <canvas id="pxMinimapCanvas" style="display:block;max-width:160px;max-height:120px"></canvas>
              <div id="pxMinimapHL" style="position:absolute;background:rgba(229,57,53,0.45);border:2px solid #e53935;pointer-events:none;box-sizing:border-box"></div>
            </div>
            <div id="pxBatchLabel" style="font-size:12px;font-weight:600;color:var(--text);margin-top:6px"></div>
          </div>
          <div style="display:flex;align-items:center;gap:8px">
            <button onclick="pxBatchGo(-1)" style="padding:10px 18px;background:var(--card2);border:1px solid var(--border);border-radius:8px;color:var(--text);font-family:inherit;font-size:16px;cursor:pointer">◀</button>
            <div style="flex:1;text-align:center;font-size:12px;color:var(--text3)" id="pxBatchCounter"></div>
            <button onclick="pxBatchGo(1)" style="padding:10px 18px;background:var(--card2);border:1px solid var(--border);border-radius:8px;color:var(--text);font-family:inherit;font-size:16px;cursor:pointer">▶</button>
          </div>
        </div>
      </div>

      <!-- Zoom hint -->
      <div style="font-size:11px;color:var(--text3);margin-bottom:8px;text-align:center">
        ${_lang==='ar'?'🤏 إصبعان للتكبير/التصغير على الجوال — Ctrl+Scroll على الكمبيوتر':'🤏 Pinch to zoom on mobile — Ctrl+Scroll on desktop'}
      </div>

      <!-- Page scrollbar (red, left side, full sheet height) -->
      <div id="pxPageSB" style="position:fixed;left:0;top:0;width:14px;height:100vh;z-index:500;display:none;flex-direction:column;background:rgba(229,57,53,0.12);border-right:2px solid var(--red)">
        <div id="pxPageThumb" style="position:absolute;left:1px;right:1px;background:var(--red);border-radius:4px;min-height:32px;cursor:grab;touch-action:none"></div>
      </div>

      <!-- Canvas wrapper -->
      <div id="pxCanvasWrap" style="width:100%;height:70vh;overflow:hidden;border-radius:8px;border:2px solid var(--border);background:#fff;position:relative;cursor:grab;touch-action:none;margin-bottom:10px">
        <div id="pxInner" style="position:absolute;top:0;left:0;transform-origin:0 0;will-change:transform">
          <canvas id="pxCanvas" style="display:block"></canvas>
        </div>
      </div>
      <div style="display:flex;gap:6px;margin-bottom:10px;align-items:center">
        <button onclick="pxResetZoom()" style="padding:7px 12px;background:var(--card);border:1px solid var(--border);border-radius:6px;color:var(--text2);font-family:inherit;font-size:11px;cursor:pointer">${_lang==='ar'?'إعادة تعيين الزوم':'Reset Zoom'}</button>
        <span style="font-size:11px;color:var(--text3)" id="pxZoomLbl">100%</span>
        <span style="font-size:11px;color:var(--text3)">${_lang==='ar'?'• إصبع للتحريك • إصبعان للتكبير':'• 1 finger pan • 2 zoom'}</span>
      </div>

      <div style="display:flex;gap:8px">
        <button class="action-btn" style="flex:2;margin:0" onclick="pxDownload('png')">${icoDl()} PNG</button>
        <button style="flex:1;padding:12px;background:var(--card);border:1px solid var(--border);border-radius:8px;color:var(--text);font-family:inherit;font-size:13px;font-weight:600;cursor:pointer" onclick="pxDownload('jpg')">JPG</button>
      </div>
    </div>`;

  window._pxGC='#000000';window._pxMode='simple';window._pxBatchIdx=0;window._pxZoom=1;
  document.getElementById('pxIn').addEventListener('change',function(e){
    var f=e.target.files[0];if(!f)return;window._pxFile=f;
    var url=URL.createObjectURL(f);var img=new Image();
    img.onload=function(){window._pxImg=img;document.getElementById('pxCont').style.display='block';pxPreview();pxSetupZoom();pxInitPageScrollbar();};
    img.src=url;
  });
}

function pxSetMode(mode){
  window._pxMode=mode;
  var isS=mode==='simple';
  var btnS=document.getElementById('pxModeSimple'),btnD=document.getElementById('pxModeDetail');
  btnS.style.borderColor=isS?'var(--red)':'var(--border)';btnS.style.background=isS?'rgba(229,57,53,0.1)':'var(--card2)';btnS.style.color=isS?'var(--red)':'var(--text2)';
  btnD.style.borderColor=!isS?'var(--red)':'var(--border)';btnD.style.background=!isS?'rgba(229,57,53,0.1)':'var(--card2)';btnD.style.color=!isS?'var(--red)':'var(--text2)';
  document.getElementById('pxPresetsSimple').style.display=isS?'block':'none';
  document.getElementById('pxPresetsDetail').style.display=!isS?'block':'none';
  var def=isS?16:4;
  document.getElementById('pxCell').value=def;document.getElementById('pxCellN').value=def;
  document.getElementById('pxCell').min=isS?6:2;
  pxPreview();
}

function pxBatchGo(dir){
  var batches=+(document.getElementById('pxBatch')?.value||1);
  window._pxBatchIdx=Math.max(0,Math.min(batches-1,(window._pxBatchIdx||0)+dir));
  pxPreview();
}

// ── Minimap drawing ──
function pxDrawMinimap(totalCols,totalRows,batchIdx,batches){
  var img=window._pxImg;if(!img)return;
  var mc=document.getElementById('pxMinimapCanvas');if(!mc)return;

  var mmW=Math.min(160,img.naturalWidth);
  var mmH=Math.round(mmW*(img.naturalHeight/img.naturalWidth));
  mc.width=mmW;mc.height=mmH;
  mc.style.width=mmW+'px';mc.style.height=mmH+'px';

  // Always redraw full image
  var mctx=mc.getContext('2d');
  mctx.imageSmoothingEnabled=true;mctx.imageSmoothingQuality='high';
  mctx.drawImage(img,0,0,mmW,mmH);

  // Recalculate highlight every call
  var hl=document.getElementById('pxMinimapHL');if(!hl)return;
  var rowsPerBatch=Math.ceil(totalRows/batches);
  var rowStart=batchIdx*rowsPerBatch;
  var rowEnd=Math.min(totalRows,rowStart+rowsPerBatch);

  // Position relative to canvas element size
  var rect=mc.getBoundingClientRect();
  var dispW=rect.width||mmW;var dispH=rect.height||mmH;

  var y1=Math.round(rowStart/totalRows*dispH);
  var y2=Math.round(rowEnd/totalRows*dispH);
  hl.style.left='0';hl.style.top=y1+'px';
  hl.style.width='100%';hl.style.height=(y2-y1)+'px';

  // Labels
  var bl=document.getElementById('pxBatchLabel');var bc=document.getElementById('pxBatchCounter');
  var ar=_lang==='ar';
  var pct1=Math.round(rowStart/totalRows*100);var pct2=Math.round(rowEnd/totalRows*100);
  var pos='';
  if(batches===2){pos=ar?(batchIdx===0?'النصف العلوي':'النصف السفلي'):(batchIdx===0?'Top Half':'Bottom Half');}
  else if(batches===4){var lb=ar?['الربع الأول','الربع الثاني','الربع الثالث','الربع الرابع']:['Quarter 1','Quarter 2','Quarter 3','Quarter 4'];pos=lb[batchIdx]||'';}
  else{pos=(ar?'الصفوف ':'Rows ')+(rowStart+1)+'-'+rowEnd+' ('+pct1+'%-'+pct2+'%)';}
  if(bl)bl.textContent=ar?('الدفعة '+(batchIdx+1)+' من '+batches+' — '+pos):('Batch '+(batchIdx+1)+' of '+batches+' — '+pos);
  if(bc)bc.textContent=(batchIdx+1)+' / '+batches;
}

// ── Pan + Pinch Zoom — accurate manual tracking ──
function pxSetupZoom(){
  var wrap=document.getElementById('pxCanvasWrap');
  var inner=document.getElementById('pxInner');
  if(!wrap||!inner)return;

  window._pxZoom=1;
  window._pxPanX=0;
  window._pxPanY=0;

  var lastDist=null;
  var panStart=null;
  function clampPan(x,y){
    var z=window._pxZoom;
    var bw=(window._pxBaseW||300)*z;
    var bh=(window._pxBaseH||400)*z;
    var ww=wrap.offsetWidth;var wh=wrap.offsetHeight;
    // Allow a small margin so image never goes fully off screen
    x=Math.min(0,Math.max(ww-bw,x));
    y=Math.min(0,Math.max(wh-bh,y));
    return{x:x,y:y};
  }

  function applyTransform(){
    var p=clampPan(window._pxPanX,window._pxPanY);
    window._pxPanX=p.x;window._pxPanY=p.y;
    inner.style.transform='translate('+p.x+'px,'+p.y+'px) scale('+window._pxZoom+')';
    var lbl=document.getElementById('pxZoomLbl');
    if(lbl)lbl.textContent=Math.round(window._pxZoom*100)+'%';
  }



  function zoomAt(factor,clientX,clientY){
    var oldZ=window._pxZoom;
    var newZ=Math.min(10,Math.max(0.15,oldZ*factor));
    if(Math.abs(newZ-oldZ)<0.001)return;
    var wRect=wrap.getBoundingClientRect();
    // Point in inner (unscaled) coords
    var px=(clientX-wRect.left-window._pxPanX)/oldZ;
    var py=(clientY-wRect.top-window._pxPanY)/oldZ;
    window._pxZoom=newZ;
    window._pxPanX=clientX-wRect.left-px*newZ;
    window._pxPanY=clientY-wRect.top-py*newZ;
    applyTransform();
  }

  // ── Touch ──
  wrap.addEventListener('touchstart',function(e){
    e.preventDefault();
    if(e.touches.length===1){
      lastDist=null;
      panStart={sx:e.touches[0].clientX,sy:e.touches[0].clientY,px0:window._pxPanX,py0:window._pxPanY};
    }else if(e.touches.length===2){
      panStart=null;
      lastDist=Math.hypot(
        e.touches[0].clientX-e.touches[1].clientX,
        e.touches[0].clientY-e.touches[1].clientY
      );
    }
  },{passive:false});

  wrap.addEventListener('touchmove',function(e){
    e.preventDefault();
    if(e.touches.length===1&&panStart){
      window._pxPanX=panStart.px0+(e.touches[0].clientX-panStart.sx);
      window._pxPanY=panStart.py0+(e.touches[0].clientY-panStart.sy);
      applyTransform();
    }else if(e.touches.length===2){
      panStart=null;
      var dist=Math.hypot(
        e.touches[0].clientX-e.touches[1].clientX,
        e.touches[0].clientY-e.touches[1].clientY
      );
      if(lastDist&&lastDist>0&&dist>0){
        var midX=(e.touches[0].clientX+e.touches[1].clientX)/2;
        var midY=(e.touches[0].clientY+e.touches[1].clientY)/2;
        zoomAt(dist/lastDist,midX,midY);
      }
      lastDist=dist;
    }
  },{passive:false});

  wrap.addEventListener('touchend',function(e){
    if(e.touches.length<2)lastDist=null;
    if(e.touches.length===0)panStart=null;
  });

  // ── Mouse pan ──
  var mouseDown=false,msx=0,msy=0,mpx0=0,mpy0=0;
  wrap.addEventListener('mousedown',function(e){
    mouseDown=true;wrap.style.cursor='grabbing';
    msx=e.clientX;msy=e.clientY;mpx0=window._pxPanX;mpy0=window._pxPanY;
  });
  document.addEventListener('mousemove',function(e){
    if(!mouseDown)return;
    window._pxPanX=mpx0+(e.clientX-msx);
    window._pxPanY=mpy0+(e.clientY-msy);
    applyTransform();
  });
  document.addEventListener('mouseup',function(){mouseDown=false;wrap.style.cursor='grab';});

  // ── Ctrl+Scroll zoom / normal scroll pan ──
  wrap.addEventListener('wheel',function(e){
    e.preventDefault();
    if(e.ctrlKey||e.metaKey){
      zoomAt(e.deltaY>0?0.88:1.13,e.clientX,e.clientY);
    }else{
      window._pxPanX-=e.deltaX;window._pxPanY-=e.deltaY;
      applyTransform();
    }
  },{passive:false});

}

function pxScrollPage(delta){
  var sb=document.getElementById('sheetBody');
  if(sb)sb.scrollTop+=delta;
}

// ── Red page scrollbar (left side, controls full sheet scroll) ──
function pxInitPageScrollbar(){
  var psb=document.getElementById('pxPageSB');
  var thumb=document.getElementById('pxPageThumb');
  var sheet=document.getElementById('sheetBody');
  if(!psb||!thumb||!sheet)return;

  // Show scrollbar
  psb.style.display='flex';

  var dragging=false;
  var dragStartY=0;
  var dragStartScroll=0;

  function updateThumb(){
    var scrollH=sheet.scrollHeight;
    var clientH=sheet.clientHeight;
    var sbH=psb.offsetHeight;
    if(scrollH<=clientH){thumb.style.display='none';return;}
    thumb.style.display='block';
    var ratio=clientH/scrollH;
    var thumbH=Math.max(32,sbH*ratio);
    var scrollFrac=sheet.scrollTop/(scrollH-clientH);
    var thumbTop=(sbH-thumbH)*scrollFrac;
    thumb.style.height=thumbH+'px';
    thumb.style.top=thumbTop+'px';
  }

  // Update on sheet scroll
  sheet.addEventListener('scroll',updateThumb);
  updateThumb();

  // Thumb drag — mouse
  thumb.addEventListener('mousedown',function(e){
    e.preventDefault();e.stopPropagation();
    dragging=true;dragStartY=e.clientY;dragStartScroll=sheet.scrollTop;
    thumb.style.cursor='grabbing';
  });
  document.addEventListener('mousemove',function(e){
    if(!dragging)return;
    var sbH=psb.offsetHeight;
    var scrollH=sheet.scrollHeight;var clientH=sheet.clientHeight;
    var ratio=clientH/scrollH;
    var thumbH=Math.max(32,sbH*ratio);
    var trackRange=sbH-thumbH;
    var contentRange=scrollH-clientH;
    var dy=e.clientY-dragStartY;
    sheet.scrollTop=dragStartScroll+(trackRange>0?dy/trackRange*contentRange:0);
    updateThumb();
  });
  document.addEventListener('mouseup',function(){
    if(dragging){dragging=false;thumb.style.cursor='grab';}
  });

  // Click on track
  psb.addEventListener('click',function(e){
    if(e.target===thumb)return;
    var rect=psb.getBoundingClientRect();
    var frac=(e.clientY-rect.top)/rect.height;
    sheet.scrollTop=(sheet.scrollHeight-sheet.clientHeight)*frac;
    updateThumb();
  });

  // Thumb drag — touch
  thumb.addEventListener('touchstart',function(e){
    e.preventDefault();e.stopPropagation();
    dragging=true;dragStartY=e.touches[0].clientY;dragStartScroll=sheet.scrollTop;
  },{passive:false});
  document.addEventListener('touchmove',function(e){
    if(!dragging)return;
    e.preventDefault();
    var sbH=psb.offsetHeight;
    var scrollH=sheet.scrollHeight;var clientH=sheet.clientHeight;
    var ratio=clientH/scrollH;
    var thumbH=Math.max(32,sbH*ratio);
    var trackRange=sbH-thumbH;
    var contentRange=scrollH-clientH;
    var dy=e.touches[0].clientY-dragStartY;
    sheet.scrollTop=dragStartScroll+(trackRange>0?dy/trackRange*contentRange:0);
    updateThumb();
  },{passive:false});
  document.addEventListener('touchend',function(){dragging=false;});

  // Hide when sheet closes
  window._pxHideSB=function(){psb.style.display='none';};
}

function pxResetZoom(){
  window._pxZoom=1;window._pxPanX=0;window._pxPanY=0;
  var inner=document.getElementById('pxInner');
  if(inner)inner.style.transform='translate(0,0) scale(1)';
  var lbl=document.getElementById('pxZoomLbl');if(lbl)lbl.textContent='100%';
}

function pxApplyZoom(){
  window._pxPanX=0;window._pxPanY=0;
  var inner=document.getElementById('pxInner');
  if(inner)inner.style.transform='translate(0,0) scale('+(window._pxZoom||1)+')';
}

function pxPreview(){
  var img=window._pxImg;if(!img)return;
  var cellPx=Math.max(2,+(document.getElementById('pxCell')?.value||16));
  var showGrid=document.getElementById('pxGrid')?.checked!==false;
  var showNums=document.getElementById('pxNums')?.checked!==false;
  var bold5=document.getElementById('pxBold5')?.checked!==false;
  var gridColor=window._pxGC||'#000000';
  var colStep=+(document.getElementById('pxColStep')?.value||2);
  var rowStep=+(document.getElementById('pxRowStep')?.value||2);
  var mode=window._pxMode||'simple';
  var batches=Math.max(1,+(document.getElementById('pxBatch')?.value||1));
  var batchIdx=Math.max(0,Math.min(batches-1,window._pxBatchIdx||0));

  // Show/hide batch nav
  document.getElementById('pxBatchNav').style.display=batches>1?'block':'none';

  // Total grid from image ratio
  var maxPx=mode==='detail'?600:320;
  var totalCols=Math.max(4,Math.min(500,Math.round(maxPx/cellPx)));
  var totalRows=Math.max(4,Math.round(totalCols*(img.naturalHeight/img.naturalWidth)));

  // ── Batch split: HORIZONTAL STRIPS (rows divided equally) ──
  var rowsPerBatch=Math.ceil(totalRows/batches);
  var rowStart=batchIdx*rowsPerBatch;
  var rowEnd=Math.min(totalRows,rowStart+rowsPerBatch);
  var colStart=0;var colEnd=totalCols;
  var cols=colEnd-colStart;var rows=rowEnd-rowStart;
  if(rows<=0)return;

  // Update minimap
  if(batches>1)pxDrawMinimap(totalCols,totalRows,batchIdx,batches);

  // Info
  var info=document.getElementById('pxInfo');
  if(info){
    var txt=(_lang==='ar'?'الشبكة الكاملة: ':'Full Grid: ')+totalCols+' × '+totalRows;
    if(batches>1)txt+=(_lang==='ar'?' | الدفعة الحالية: ':' | Batch: ')+cols+' × '+rows;
    info.textContent=txt+(_lang==='ar'?' خلية':' cells');
  }

  // Margins
  var numFontSz=Math.max(7,Math.min(13,cellPx*0.7));if(cellPx<=4)numFontSz=6;
  var topPad=showNums&&colStep>0?Math.ceil(numFontSz*2.4):4;
  var leftPad=4;
  var rightPad=showNums&&rowStep>0?Math.ceil(numFontSz*3.8):4;
  var botPad=4;
  var thinLine=Math.max(0.3,cellPx*0.04);
  var thickLine=Math.max(0.8,cellPx*0.1);

  var W=leftPad+cols*cellPx+rightPad;
  var H=topPad+rows*cellPx+botPad;

  var cv=document.getElementById('pxCanvas');if(!cv)return;
  var dpr=window.devicePixelRatio||1;
  cv.width=W*dpr;cv.height=H*dpr;

  // CSS size: fit sheet width naturally
  var sheetW=(document.getElementById('sheetBody')?.offsetWidth||320)-8;
  var baseScale=Math.min(1,sheetW/W);
  cv.style.width=(W*baseScale)+'px';
  cv.style.height=(H*baseScale)+'px';
  window._pxBaseW=W*baseScale;window._pxBaseH=H*baseScale;
  window._pxBaseW=W*baseScale;window._pxBaseH=H*baseScale;
  cv.style.width=(W*baseScale)+'px';
  cv.style.height=(H*baseScale)+'px';

  var ctx=cv.getContext('2d');
  ctx.setTransform(dpr,0,0,dpr,0,0);
  ctx.imageSmoothingEnabled=false;
  ctx.fillStyle='#ffffff';ctx.fillRect(0,0,W,H);

  // Sample at 8x then down to totalCols×totalRows
  var overW=totalCols*8;var overH=totalRows*8;
  var big=document.createElement('canvas');big.width=overW;big.height=overH;
  var bc=big.getContext('2d');bc.imageSmoothingEnabled=true;bc.imageSmoothingQuality='high';
  bc.drawImage(img,0,0,overW,overH);
  var tmp=document.createElement('canvas');tmp.width=totalCols;tmp.height=totalRows;
  var tc=tmp.getContext('2d');tc.imageSmoothingEnabled=true;tc.imageSmoothingQuality='high';
  tc.drawImage(big,0,0,totalCols,totalRows);
  var px=tc.getImageData(0,0,totalCols,totalRows).data;

  // Draw cells
  for(var row=0;row<rows;row++){
    for(var col=0;col<cols;col++){
      var sr=rowStart+row;var sc2=colStart+col;
      var idx=(sr*totalCols+sc2)*4;
      ctx.fillStyle='rgb('+px[idx]+','+px[idx+1]+','+px[idx+2]+')';
      ctx.fillRect(leftPad+col*cellPx,topPad+row*cellPx,cellPx,cellPx);
    }
  }

  // Grid
  if(showGrid){
    ctx.strokeStyle=gridColor;
    ctx.lineWidth=thinLine;
    for(var col=0;col<=cols;col++){var x=leftPad+col*cellPx+0.5;ctx.beginPath();ctx.moveTo(x,topPad);ctx.lineTo(x,topPad+rows*cellPx);ctx.stroke();}
    for(var row=0;row<=rows;row++){var y=topPad+row*cellPx+0.5;ctx.beginPath();ctx.moveTo(leftPad,y);ctx.lineTo(leftPad+cols*cellPx,y);ctx.stroke();}
    if(bold5&&cellPx>=6){
      ctx.lineWidth=thickLine;
      for(var col=0;col<=cols;col++){if(col%5===0){var x=leftPad+col*cellPx;ctx.beginPath();ctx.moveTo(x,topPad);ctx.lineTo(x,topPad+rows*cellPx);ctx.stroke();}}
      for(var row=0;row<=rows;row++){if(row%5===0){var y=topPad+row*cellPx;ctx.beginPath();ctx.moveTo(leftPad,y);ctx.lineTo(leftPad+cols*cellPx,y);ctx.stroke();}}
    }
  }
  ctx.strokeStyle=gridColor;ctx.lineWidth=Math.max(1.5,thickLine*2);
  ctx.strokeRect(leftPad,topPad,cols*cellPx,rows*cellPx);

  // Numbers — global indices
  if(showNums){
    ctx.fillStyle='#111111';ctx.font='bold '+numFontSz+'px sans-serif';
    if(colStep>0){
      ctx.textAlign='center';ctx.textBaseline='middle';
      for(var col=0;col<cols;col++){
        var gCol=colStart+col+1;
        if(col===0||(gCol%colStep===0)||(col===cols-1)){ctx.fillText(gCol,leftPad+col*cellPx+cellPx/2,topPad/2);}
      }
    }
    if(rowStep>0){
      ctx.textAlign='left';ctx.textBaseline='middle';
      for(var row=0;row<rows;row++){
        var gRow=rowStart+row+1;
        if(row===0||(gRow%rowStep===0)||(row===rows-1)){ctx.fillText(gRow,leftPad+cols*cellPx+5,topPad+row*cellPx+cellPx/2);}
      }
    }
  }
}

function pxDownload(fmt){
  var cv=document.getElementById('pxCanvas');if(!cv)return;
  // Save original transform, render clean
  var savedTransform=cv.style.transform;cv.style.transform='scale(1)';
  var mtype=fmt==='png'?'image/png':'image/jpeg';
  var batches=+(document.getElementById('pxBatch')?.value||1);
  var bIdx=window._pxBatchIdx||0;
  var suffix=batches>1?('-batch'+(bIdx+1)+'of'+batches):'';
  cv.toBlob(function(blob){
    cv.style.transform=savedTransform;
    var a=document.createElement('a');a.href=URL.createObjectURL(blob);
    a.download=(window._pxFile?window._pxFile.name.replace(/\.[^.]+$/,''):'pixel')+suffix+'-grid.'+fmt;
    a.click();toast(_lang==='ar'?'تم التحميل':'Downloaded','ok');
  },mtype,1.0);
}
// ══ علامة مائية — نظام Scratch ══
let _wmItems=[],_wmSelected=null,_wmBaseImg2=null,_wmAddType2='text',_wmMoveMode=false;

function buildWatermark(){
  _wmItems=[];_wmSelected=null;_wmBaseImg2=null;_wmAddType2='text';_wmMoveMode=false;
  document.getElementById('sheetBody').innerHTML=`
    ${desc('أضف علامات مائية متعددة. تحكم بكل عنصر من القائمة العلوية.','Add multiple watermarks. Control each element from the panel above.')}
    <div class="drop-zone"><input type="file" id="wmIn" accept="image/*">
      <div class="dz-icwrap"><svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#a78bfa" stroke-width="1.8" stroke-linecap="round"><path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z"/></svg></div>
      <div class="dz-t">${_lang==='ar'?'اختر الصورة الأساسية':'Choose Base Image'}</div></div>
    <div id="wmCont" style="display:none">

      <!-- ═══ PANEL: ADD ═══ -->
      <div style="background:var(--card);border-radius:12px;padding:14px;margin-bottom:10px">
        <div style="font-size:13px;font-weight:700;color:var(--text);margin-bottom:10px">
          ${_lang==='ar'?'➕ إضافة عنصر جديد':'➕ Add New Element'}
        </div>
        <div class="wm-toolbar" style="margin-bottom:10px">
          <button class="wm-tab active" id="wmTabTxt" onclick="wmSetAddType('text')">${_lang==='ar'?'نص':'Text'}</button>
          <button class="wm-tab" id="wmTabStamp" onclick="wmSetAddType('stamp')">${_lang==='ar'?'ختم':'Stamp'}</button>
          <button class="wm-tab" id="wmTabX" onclick="wmSetAddType('cross')">✕</button>
          <label class="wm-tab" style="cursor:pointer">🖼 ${_lang==='ar'?'ملصق':'Sticker'}<input type="file" accept="image/*" id="wmStickerIn" style="display:none"></label>
        </div>
        <div id="wmTxtRow" style="margin-bottom:8px">
          <div class="field" style="margin-bottom:0"><label>${_lang==='ar'?'النص':'Text'}</label><input type="text" id="wmTxt" value="${_lang==='ar'?'سري':'CONFIDENTIAL'}"></div>
        </div>
        <!-- FULL COLOR PICKER -->
        <div style="margin-bottom:10px">
          <label style="font-size:12px;color:var(--text2);display:block;margin-bottom:6px">${_lang==='ar'?'اللون':'Color'}</label>
          <div style="display:flex;flex-wrap:wrap;gap:5px;margin-bottom:8px" id="wmColorGrid">
            ${['#ff0000','#ff4400','#ff8800','#ffcc00','#ffff00','#aaff00','#00cc00','#00ffaa','#00ffff','#00aaff','#0055ff','#4400ff','#aa00ff','#ff00ff','#ff0088','#ffffff','#cccccc','#999999','#555555','#000000'].map((c2,i)=>`<div class="color-dot${i===0?' sel':''}" style="background:${c2};${c2==='#ffffff'||c2==='#ffff00'?'border:1px solid #555':''}" data-c="${c2}" onclick="wmPickAddColor('${c2}',this)"></div>`).join('')}
          </div>
          <div style="display:flex;align-items:center;gap:8px">
            <label style="font-size:12px;color:var(--text2)">${_lang==='ar'?'أي لون:':'Any color:'}</label>
            <input type="color" id="wmCustomColor" value="#ff0000" oninput="wmPickAddColor(this.value,null)" style="width:44px;height:30px;border:none;border-radius:8px;cursor:pointer;padding:0">
          </div>
        </div>
        <div class="slider-row">
          <label>${_lang==='ar'?'الحجم':'Size'}</label>
          <input type="range" id="wmAddSz" min="1" max="10000" value="80" style="flex:1;accent-color:var(--red)" oninput="document.getElementById('wmAddSzNum').value=this.value">
          <input type="number" class="slider-num" id="wmAddSzNum" min="1" max="10000" value="80" oninput="var v=Math.min(10000,+this.value||0);this.value=v;document.getElementById('wmAddSz').value=v" onblur="var mn=1;var v2=+this.value;if(!v2||v2<mn)this.value=mn;document.getElementById('wmAddSz').value=this.value;document.getElementById('wmAddSz').value=v">
        </div>
        <div class="slider-row">
          <label>${_lang==='ar'?'الشفافية':'Opacity'}</label>
          <input type="range" id="wmAddOp" min="5" max="100" value="50" style="flex:1;accent-color:var(--red)" oninput="document.getElementById('wmAddOpNum').value=this.value">
          <input type="number" class="slider-num" id="wmAddOpNum" min="5" max="100" value="50" oninput="var v=Math.min(100,+this.value||0);this.value=v;document.getElementById('wmAddOp').value=v" onblur="var mn=5;var v2=+this.value;if(!v2||v2<mn)this.value=mn;document.getElementById('wmAddOp').value=this.value;document.getElementById('wmAddOp').value=v">
        </div>
        <button class="action-btn" style="margin-top:8px" onclick="wmAddItem()">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          ${_lang==='ar'?'إضافة للصورة':'Add to Image'}
        </button>
      </div>

      <!-- ═══ PANEL: ELEMENTS LIST ═══ -->
      <div id="wmItemsPanel" style="display:none;background:var(--card);border-radius:12px;padding:14px;margin-bottom:10px">
        <div id="wmPanelHeader" style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px">
          <div style="font-size:13px;font-weight:700;color:var(--text)">${_lang==='ar'?'🎛 التحكم بالعناصر':'🎛 Element Controls'}</div>
        </div>
        <div id="wmItemsList"></div>
      </div>

      <!-- ═══ CANVAS ═══ -->
      <div style="margin-bottom:10px">
        <canvas id="wmCanvas" style="width:100%;border-radius:8px;display:block;border:1px solid var(--border)"></canvas>
      </div>

      <!-- ═══ ACTIONS ═══ -->
      <div style="display:flex;gap:8px">
        <button style="flex:1;padding:12px;background:var(--card);border:1px solid var(--border);border-radius:8px;color:var(--text3);font-family:inherit;font-size:13px;cursor:pointer" onclick="wmClearAll()">${_lang==='ar'?'🗑 مسح الكل':'🗑 Clear All'}</button>
        <button class="action-btn" style="flex:2;margin:0" onclick="doWM()">${icoDl()} ${_lang==='ar'?'تحميل الصورة':'Download Image'}</button>
      </div>
    </div>`;

  // sliders sync handled inline via oninput
  window._wmAddColor='#ff0000';

  document.getElementById('wmIn').addEventListener('change',e=>{
    const f=e.target.files[0];if(!f)return;window._wmF=f;
    const url=URL.createObjectURL(f);const img=new Image();
    img.onload=()=>{_wmBaseImg2=img;document.getElementById('wmCont').style.display='block';wmRedraw2();wmSetupDrag2();};
    img.src=url;
  });
  document.getElementById('wmStickerIn').addEventListener('change',e=>{
    const f=e.target.files[0];if(!f)return;const url=URL.createObjectURL(f);const img=new Image();
    img.onload=()=>{window._wmStickerImg=img;wmSetAddType('sticker');};img.src=url;
  });
}

function wmSetAddType(t){
  _wmAddType2=t;
  ['wmTabTxt','wmTabStamp','wmTabX'].forEach(id=>document.getElementById(id)?.classList.remove('active'));
  if(t==='text')document.getElementById('wmTabTxt')?.classList.add('active');
  else if(t==='stamp')document.getElementById('wmTabStamp')?.classList.add('active');
  else if(t==='cross')document.getElementById('wmTabX')?.classList.add('active');
  const r=document.getElementById('wmTxtRow');if(r)r.style.display=(t==='text'||t==='stamp')?'block':'none';
}

function wmPickAddColor(c,el){
  window._wmAddColor=c;
  document.querySelectorAll('#wmColorGrid .color-dot').forEach(d=>d.classList.remove('sel'));
  if(el)el.classList.add('sel');
  try{document.getElementById('wmCustomColor').value=c;}catch(e){}
}

function wmAddItem(){
  if(!_wmBaseImg2){toast(_lang==='ar'?'اختر صورة أولاً':'Choose image first','err');return;}
  const cv=document.getElementById('wmCanvas');
  // cv._disp.w/h are CSS pixel dimensions (what the user sees)
  // item x/y must be in CSS pixels to match drawing coords
  const cx=cv._disp?cv._disp.w/2:cv.offsetWidth/2;
  const cy=cv._disp?cv._disp.h/2:cv.offsetHeight/2;
  _wmItems.push({
    type:_wmAddType2,
    text:document.getElementById('wmTxt')?.value||'سري',
    color:window._wmAddColor||'#ff0000',
    sz:+document.getElementById('wmAddSz').value,
    op:+document.getElementById('wmAddOp').value/100,
    x:cx, y:cy,
    sticker:_wmAddType2==='sticker'?window._wmStickerImg:null,
    moveMode:false,
  });
  _wmSelected=_wmItems.length-1;
  wmRedraw2();wmRenderPanel();
  toast(_lang==='ar'?'تمت الإضافة':'Added','ok');
}

function wmRedraw2(){
  const cv=document.getElementById('wmCanvas');if(!cv||!_wmBaseImg2)return;
  const dpr=window.devicePixelRatio||1;
  const maxW=Math.min(window.innerWidth-40,600);
  const dispW=Math.min(maxW,_wmBaseImg2.naturalWidth);
  const dispH=dispW*(_wmBaseImg2.naturalHeight/_wmBaseImg2.naturalWidth);
  // Canvas actual pixels = display * dpr for sharpness
  cv.width=dispW*dpr;cv.height=dispH*dpr;
  cv.style.width=dispW+'px';cv.style.height=dispH+'px';
  const sc=dispW*dpr/_wmBaseImg2.naturalWidth;
  const ctx=cv.getContext('2d');
  ctx.scale(dpr,dpr);
  // Reset scale effect — work in display coords
  cv._disp={w:dispW,h:dispH,sc:dispW/_wmBaseImg2.naturalWidth};
  ctx.drawImage(_wmBaseImg2,0,0,dispW,dispH);
  _wmItems.forEach((item,idx)=>{
    const _sc=cv._disp?cv._disp.sc:1;const x=item.x,y=item.y,sz=item.sz*_sc;
    ctx.save();ctx.globalAlpha=item.op;ctx.fillStyle=item.color;ctx.strokeStyle=item.color;
    if(item.type==='sticker'&&item.sticker){ctx.drawImage(item.sticker,x-sz,y-sz,sz*2,sz*2);}
    else if(item.type==='text'){ctx.font=`bold ${Math.max(4,sz)}px IBM Plex Sans Arabic,sans-serif`;ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(item.text,x,y);}
    else if(item.type==='stamp'){const r=Math.max(4,sz);ctx.lineWidth=Math.max(1,r*.05);ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.stroke();ctx.font=`bold ${Math.max(4,r*.55)}px sans-serif`;ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(item.text,x,y);}
    else if(item.type==='cross'){const r=Math.max(4,sz);ctx.lineWidth=Math.max(2,r*.12);ctx.lineCap='round';ctx.beginPath();ctx.moveTo(x-r,y-r);ctx.lineTo(x+r,y+r);ctx.moveTo(x+r,y-r);ctx.lineTo(x-r,y+r);ctx.stroke();}
    ctx.restore();
    // selection ring + move indicator
    if(idx===_wmSelected){
      ctx.save();ctx.globalAlpha=.9;ctx.strokeStyle='#fff';ctx.lineWidth=2;ctx.setLineDash([5,3]);
      const _sc2=cv._disp?cv._disp.sc:1;const ring=Math.max(Math.abs(item.sz*_sc2),20)+10;
      ctx.beginPath();ctx.arc(x,y,ring,0,Math.PI*2);ctx.stroke();
      if(item.moveMode){
        ctx.setLineDash([]);ctx.fillStyle='rgba(229,57,53,.18)';ctx.beginPath();ctx.arc(x,y,ring,0,Math.PI*2);ctx.fill();
        ctx.globalAlpha=.85;ctx.fillStyle='#fff';ctx.font=`${Math.max(10,ring*.5)}px sans-serif`;ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText('✥',x,y);
      }
      ctx.restore();
    }
  });
}

// ── DRAG (only when moveMode is on) ──
function wmSetupDrag2(){
  const cv=document.getElementById('wmCanvas');if(!cv)return;
  let drag=false,ox=0,oy=0;
  const gp=e=>{const r=cv.getBoundingClientRect(),s=e.touches?e.touches[0]:e;return{x:(s.clientX-r.left),y:(s.clientY-r.top)};};

  cv.addEventListener('mousedown',e=>{
    if(_wmSelected===null||!_wmItems[_wmSelected]?.moveMode)return;
    drag=true;const p=gp(e);ox=p.x-_wmItems[_wmSelected].x;oy=p.y-_wmItems[_wmSelected].y;
  });
  document.addEventListener('mousemove',e=>{if(!drag||_wmSelected===null)return;const p=gp(e);_wmItems[_wmSelected].x=p.x-ox;_wmItems[_wmSelected].y=p.y-oy;wmRedraw2();});
  document.addEventListener('mouseup',()=>drag=false);

  cv.addEventListener('touchstart',e=>{
    if(_wmSelected===null||!_wmItems[_wmSelected]?.moveMode)return;
    drag=true;const p=gp(e);ox=p.x-_wmItems[_wmSelected].x;oy=p.y-_wmItems[_wmSelected].y;
  },{passive:true});
  cv.addEventListener('touchmove',e=>{if(!drag||_wmSelected===null)return;e.preventDefault();const p=gp(e);_wmItems[_wmSelected].x=p.x-ox;_wmItems[_wmSelected].y=p.y-oy;wmRedraw2();},{passive:false});
  cv.addEventListener('touchend',()=>drag=false);

  // Tap on canvas background (no item hit) = deselect
  cv.addEventListener('click',e=>{
    if(!_wmBaseImg2)return;
    const r=cv.getBoundingClientRect();
    const px=(e.clientX-r.left),py=(e.clientY-r.top);
    // item.x/y are in CSS pixels, px/py are in CSS pixels — direct comparison
    const dispSc=cv._disp?cv._disp.sc:1; // image scale factor
    let hit=-1;
    for(let i=_wmItems.length-1;i>=0;i--){
      const item=_wmItems[i];
      const sz=item.sz*dispSc; // visual size in CSS pixels
      const ring=Math.max(Math.abs(sz),20)+10;
      if(Math.hypot(px-item.x,py-item.y)<ring){hit=i;break;}
    }
    if(hit<0){wmDeselect();}
  });
}

// ── ELEMENTS PANEL (like Scratch) ──
function wmRenderPanel(){
  const panel=document.getElementById('wmItemsPanel');
  const list=document.getElementById('wmItemsList');
  if(!_wmItems.length){panel.style.display='none';list.innerHTML='';return;}
  panel.style.display='block';
  // Update header with deselect button
  const hdr=document.getElementById('wmPanelHeader');
  if(hdr){
    const ar=_lang==='ar';
    hdr.innerHTML=`<div style="font-size:13px;font-weight:700;color:var(--text)">${ar?'🎛 التحكم بالعناصر':'🎛 Element Controls'}</div>${_wmSelected!==null?`<button onclick="wmDeselect()" style="background:var(--card2);border:1px solid var(--border);border-radius:6px;color:var(--text2);font-family:inherit;font-size:11px;padding:4px 10px;cursor:pointer">${ar?'✕ إلغاء التحديد':'✕ Deselect'}</button>`:''}`;
  }
  list.innerHTML=_wmItems.map((item,i)=>`
    <div style="background:var(--surface);border-radius:10px;padding:10px 12px;margin-bottom:8px;border:2px solid ${i===_wmSelected?'var(--red)':'var(--border)'}">
      <!-- Row 1: name + select + delete -->
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px">
        <div style="width:14px;height:14px;border-radius:50%;background:${item.color};border:1px solid var(--border);flex-shrink:0"></div>
        <span style="flex:1;font-size:13px;font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" onclick="wmSelectItem(${i})">${item.type==='text'||item.type==='stamp'?item.text:item.type} #${i+1}</span>
        <button onclick="wmSelectItem(${i})" style="background:${i===_wmSelected?'var(--red)':'var(--card2)'};border:none;border-radius:6px;color:white;font-family:inherit;font-size:11px;padding:4px 8px;cursor:pointer">${i===_wmSelected?(_lang==='ar'?'محدد':'Selected'):(_lang==='ar'?'تحديد':'Select')}</button>
        <button onclick="wmDeleteItem(${i})" style="background:none;border:none;color:var(--red);cursor:pointer;font-size:18px;padding:2px 4px;line-height:1">✕</button>
      </div>
      ${i===_wmSelected?`
      <!-- Row 2: controls (only for selected) -->
      <div style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:8px">
        <button onclick="wmToggleMove(${i})" style="flex:1;min-width:80px;padding:8px;border-radius:8px;border:2px solid ${item.moveMode?'var(--red)':'var(--border)'};background:${item.moveMode?'rgba(229,57,53,.15)':'var(--card)'};color:${item.moveMode?'var(--red)':'var(--text2)'};font-family:inherit;font-size:12px;font-weight:600;cursor:pointer">
          ✥ ${item.moveMode?(_lang==='ar'?'إيقاف التحريك':'Stop Moving'):(_lang==='ar'?'تحريك':'Move')}
        </button>
        ${item.type!=='cross'&&item.type!=='sticker'?`
        <button onclick="wmInlineEdit(${i})" style="flex:1;min-width:80px;padding:8px;border-radius:8px;border:1px solid var(--border);background:var(--card);color:var(--text2);font-family:inherit;font-size:12px;cursor:pointer">
          ✎ ${_lang==='ar'?'تعديل النص':'Edit Text'}
        </button>`:''}
      </div>
      <!-- Size slider + number -->
      <div style="display:flex;align-items:center;gap:6px;margin-bottom:6px">
        <span style="font-size:11px;color:var(--text2);min-width:40px;flex-shrink:0">${_lang==='ar'?'الحجم':'Size'}</span>
        <input type="range" id="wmSzR${i}" min="1" max="10000" value="${item.sz}" style="flex:1;accent-color:var(--red)" oninput="wmUpdateSz(${i},+this.value);document.getElementById('wmSzN${i}').value=this.value">
        <input type="number" class="slider-num" id="wmSzN${i}" min="1" max="10000" value="${item.sz}" oninput="var v=Math.min(10000,+this.value||0);this.value=v;document.getElementById('wmSzR${i}').value=v;wmUpdateSz(${i},v)" onblur="var mn=1;var v2=+this.value;if(!v2||v2<mn)this.value=mn;document.getElementById('wmSzR${i}').value=this.value;document.getElementById('wmSzR${i}').value=v;wmUpdateSz(${i},v)">
      </div>
      <!-- Opacity slider + number -->
      <div style="display:flex;align-items:center;gap:6px;margin-bottom:6px">
        <span style="font-size:11px;color:var(--text2);min-width:40px;flex-shrink:0">${_lang==='ar'?'الشفافية':'Opacity'}</span>
        <input type="range" id="wmOpR${i}" min="5" max="100" value="${Math.round(item.op*100)}" style="flex:1;accent-color:var(--red)" oninput="wmUpdateOp(${i},+this.value/100);document.getElementById('wmOpN${i}').value=this.value">
        <input type="number" class="slider-num" id="wmOpN${i}" min="5" max="100" value="${Math.round(item.op*100)}" oninput="var v=Math.min(100,+this.value||0);this.value=v;document.getElementById('wmOpR${i}').value=v;wmUpdateOp(${i},v/100)" onblur="var mn=5;var v2=+this.value;if(!v2||v2<mn)this.value=mn;document.getElementById('wmOpR${i}').value=this.value;document.getElementById('wmOpR${i}').value=v;wmUpdateOp(${i},v/100)">
      </div>
      <!-- Color row -->
      <div style="display:flex;flex-wrap:wrap;gap:4px;margin-bottom:4px">
        ${['#ff0000','#ff8800','#ffff00','#00cc00','#00ffff','#0055ff','#aa00ff','#ff00ff','#ffffff','#000000'].map(c2=>`<div onclick="wmUpdateColor(${i},'${c2}')" style="width:22px;height:22px;border-radius:50%;background:${c2};cursor:pointer;border:2px solid ${item.color===c2?'white':'transparent'};${c2==='#ffffff'||c2==='#ffff00'?'outline:1px solid #555':''}"></div>`).join('')}
        <input type="color" value="${item.color}" oninput="wmUpdateColor(${i},this.value)" style="width:26px;height:26px;border:none;border-radius:50%;cursor:pointer;padding:0">
      </div>`:''}
    </div>`).join('');
}

function wmSelectItem(i){_wmSelected=i;wmRenderPanel();wmRedraw2();}
function wmDeselect(){_wmSelected=null;wmRenderPanel();wmRedraw2();}
function wmDeleteItem(i){_wmItems.splice(i,1);_wmSelected=_wmItems.length?Math.min(i,_wmItems.length-1):null;wmRedraw2();wmRenderPanel();}
function wmToggleMove(i){_wmItems[i].moveMode=!_wmItems[i].moveMode;wmRenderPanel();wmRedraw2();if(_wmItems[i].moveMode)toast(_lang==='ar'?'وضع التحريك مفعّل — اسحب على الصورة':'Move mode ON — drag on image','ok');}
function wmUpdateSz(i,v){_wmItems[i].sz=v;wmRedraw2();}
function wmUpdateOp(i,v){_wmItems[i].op=v;wmRedraw2();}
function wmUpdateColor(i,c){_wmItems[i].color=c;wmRedraw2();wmRenderPanel();}
function wmInlineEdit(i){const t=prompt(_lang==='ar'?'النص الجديد:':'New text:',_wmItems[i].text);if(t!==null){_wmItems[i].text=t;wmRedraw2();wmRenderPanel();}}
function wmClearAll(){_wmItems=[];_wmSelected=null;wmRedraw2();wmRenderPanel();}

function doWM(){
  if(!_wmBaseImg2){toast(_lang==='ar'?'اختر صورة':'Choose image','err');return;}
  if(!_wmItems.length){toast(_lang==='ar'?'أضف علامة أولاً':'Add a watermark first','err');return;}
  const fc=document.createElement('canvas');fc.width=_wmBaseImg2.naturalWidth;fc.height=_wmBaseImg2.naturalHeight;
  const ctx=fc.getContext('2d');ctx.drawImage(_wmBaseImg2,0,0);
  const cv=document.getElementById('wmCanvas');
  const dispSc=cv._disp?cv._disp.sc:1;
  const toNat=1/dispSc; // convert display px to natural px
  _wmItems.forEach(item=>{
    const x=item.x*toNat,y=item.y*toNat,sz=item.sz;
    ctx.save();ctx.globalAlpha=item.op;ctx.fillStyle=item.color;ctx.strokeStyle=item.color;
    if(item.type==='sticker'&&item.sticker){ctx.drawImage(item.sticker,x-sz,y-sz,sz*2,sz*2);}
    else if(item.type==='text'){ctx.font=`bold ${Math.max(1,sz)}px sans-serif`;ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(item.text,x,y);}
    else if(item.type==='stamp'){ctx.lineWidth=Math.max(1,sz*.05);ctx.beginPath();ctx.arc(x,y,sz,0,Math.PI*2);ctx.stroke();ctx.font=`bold ${Math.max(1,sz*.55)}px sans-serif`;ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(item.text,x,y);}
    else if(item.type==='cross'){ctx.lineWidth=Math.max(2,sz*.12);ctx.lineCap='round';ctx.beginPath();ctx.moveTo(x-sz,y-sz);ctx.lineTo(x+sz,y+sz);ctx.moveTo(x+sz,y-sz);ctx.lineTo(x-sz,y+sz);ctx.stroke();}
    ctx.restore();
  });
  fc.toBlob(b=>{const a=document.createElement('a');a.href=URL.createObjectURL(b);a.download=(window._wmF?.name.replace(/\.[^.]+$/,'')||'img')+'-wm.jpg';a.click();toast(_lang==='ar'?'تم':'Done','ok');closeSheet();},'image/jpeg',.92);
}
// إضافة نص
let _atTexts=[],_atImg2=null;
function buildAddText(){
  _atTexts=[];
  document.getElementById('sheetBody').innerHTML=`
    ${desc('اكتب نصوصاً فوق الصورة واسحبها لأي مكان.','Write text over image and drag it anywhere.')}
    <div class="drop-zone"><input type="file" id="atIn" accept="image/*">
      <div class="dz-icwrap"><svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#4ad9d9" stroke-width="1.8" stroke-linecap="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg></div>
      <div class="dz-t">${_lang==='ar'?'اختر الصورة':'Choose Image'}</div></div>
    <div id="atEditor" style="display:none">
      <div class="field"><label>${_lang==='ar'?'النص':'Text'}</label><input type="text" id="atTxt" placeholder="${_lang==='ar'?'اكتب هنا...':'Type here...'}"></div>
      <div class="fields-row">
        <div class="field"><label>${_lang==='ar'?'الحجم':'Size'}</label><select id="atSz"><option value="16">16</option><option value="24">24</option><option value="32" selected>32</option><option value="48">48</option><option value="64">64</option></select></div>
        <div class="field"><label>${_lang==='ar'?'النمط':'Style'}</label><select id="atSt"><option value="bold">${_lang==='ar'?'عريض':'Bold'}</option><option value="normal">${_lang==='ar'?'عادي':'Normal'}</option><option value="italic">${_lang==='ar'?'مائل':'Italic'}</option></select></div>
      </div>
      <div style="margin-bottom:12px">
        <label style="font-size:12px;color:var(--text2);display:block;margin-bottom:8px">${_lang==='ar'?'اللون':'Color'}</label>
        <div class="color-row" id="atColors">
          <div class="color-dot sel" style="background:white;border:1px solid #555" onclick="atPickColor('white',this)"></div>
          <div class="color-dot" style="background:black;border:1px solid #555" onclick="atPickColor('black',this)"></div>
          <div class="color-dot" style="background:#e53935" onclick="atPickColor('#e53935',this)"></div>
          <div class="color-dot" style="background:#ffd700" onclick="atPickColor('#ffd700',this)"></div>
          <div class="color-dot" style="background:#4a9eff" onclick="atPickColor('#4a9eff',this)"></div>
          <div class="color-dot" style="background:#4ade80" onclick="atPickColor('#4ade80',this)"></div>
        </div>
      </div>
      <button style="width:100%;padding:10px;margin-bottom:10px;background:var(--card);border:1px solid var(--border);border-radius:8px;color:var(--text);font-family:inherit;font-size:13px;cursor:pointer" onclick="atAddText()">${_lang==='ar'?'➕ إضافة النص':'➕ Add Text'}</button>
      <p style="font-size:11px;color:var(--text3);margin-bottom:8px">${_lang==='ar'?'💡 اسحب آخر نص مضاف لتغيير مكانه':'💡 Drag the last added text to reposition it'}</p>
      <canvas id="atCanvas" style="width:100%;border-radius:8px;border:1px solid var(--border);background:#fff;display:block;margin-bottom:12px"></canvas>
      <div style="display:flex;gap:8px">
        <button style="flex:1;padding:10px;background:var(--card);border:1px solid var(--border);border-radius:8px;color:var(--text3);font-family:inherit;font-size:12px;cursor:pointer" onclick="_atTexts.pop();atRedraw()">${_lang==='ar'?'↩ تراجع':'↩ Undo'}</button>
        <button class="action-btn" style="flex:2;margin:0" onclick="doAT()">${icoDl()} ${_lang==='ar'?'تحميل':'Download'}</button>
      </div>
    </div>`;
  window._atColor='white';
  document.getElementById('atIn').addEventListener('change',e=>{
    window._atF=e.target.files[0];window._atUrl=URL.createObjectURL(window._atF);
    document.getElementById('atEditor').style.display='block';_atTexts=[];
    const img=new Image();img.onload=()=>{_atImg2=img;atRedraw();atSetupDrag();};img.src=window._atUrl;
  });
}
function atPickColor(c,el){window._atColor=c;document.querySelectorAll('#atColors .color-dot').forEach(d=>d.classList.remove('sel'));el.classList.add('sel');}
function atAddText(){
  const txt=document.getElementById('atTxt').value.trim();if(!txt)return;
  const cv=document.getElementById('atCanvas');
  _atTexts.push({text:txt,x:cv.width/2,y:cv.height*0.15+_atTexts.length*35,sz:+document.getElementById('atSz').value,st:document.getElementById('atSt').value,color:window._atColor||'white'});
  atRedraw();document.getElementById('atTxt').value='';
}
function atRedraw(){
  const cv=document.getElementById('atCanvas');if(!cv||!_atImg2)return;
  const sc=Math.min(340/_atImg2.naturalWidth,1);
  cv.width=_atImg2.naturalWidth*sc;cv.height=_atImg2.naturalHeight*sc;
  const ctx=cv.getContext('2d');ctx.drawImage(_atImg2,0,0,cv.width,cv.height);
  _atTexts.forEach(t=>{const s=t.sz*sc;ctx.font=`${t.st} ${s}px IBM Plex Sans Arabic,sans-serif`;ctx.fillStyle=t.color;ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(t.text,t.x,t.y);});
}
function atSetupDrag(){
  const cv=document.getElementById('atCanvas');if(!cv)return;
  if(!window._atZoomReady&&cv.parentElement){
    var wrap=cv.parentElement;
    var inner=document.createElement('div');
    inner.style.cssText='position:absolute;top:0;left:0;transform-origin:0 0;';
    wrap.style.position='relative';wrap.style.overflow='hidden';wrap.style.touchAction='none';
    wrap.insertBefore(inner,cv);inner.appendChild(cv);
    setupCanvasZoom(wrap,inner,cv,()=>cv.offsetWidth,()=>cv.offsetHeight);
    window._atZoomReady=true;
  }
  const gp=e=>{const r=cv.getBoundingClientRect(),s=e.touches?e.touches[0]:e;return{x:(s.clientX-r.left)*(cv.width/r.width),y:(s.clientY-r.top)*(cv.height/r.height)};};
  let drag=false;
  const down=e=>{e.preventDefault&&e.preventDefault();drag=true;};
  const move=e=>{if(!drag||!_atTexts.length)return;e.preventDefault&&e.preventDefault();const p=gp(e);const t=_atTexts[_atTexts.length-1];t.x=p.x;t.y=p.y;atRedraw();};
  const up=()=>drag=false;
  cv.addEventListener('mousedown',down);document.addEventListener('mousemove',move);document.addEventListener('mouseup',up);
  cv.addEventListener('touchstart',down,{passive:true});cv.addEventListener('touchmove',e=>{if(drag||dragging)e.preventDefault();move(e);},{passive:false});cv.addEventListener('touchend',up);
}
function doAT(){
  if(!_atImg2)return;
  const fc=document.createElement('canvas');fc.width=_atImg2.naturalWidth;fc.height=_atImg2.naturalHeight;
  const ctx=fc.getContext('2d');ctx.drawImage(_atImg2,0,0);
  const sc=_atImg2.naturalWidth/document.getElementById('atCanvas').width;
  _atTexts.forEach(t=>{ctx.font=`${t.st} ${t.sz}px sans-serif`;ctx.fillStyle=t.color;ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(t.text,t.x*sc,t.y*sc);});
  fc.toBlob(b=>{const a=document.createElement('a');a.href=URL.createObjectURL(b);a.download=(window._atF?.name.replace(/\.[^.]+$/,'')||'img')+'-text.jpg';a.click();toast(_lang==='ar'?'تم':'Done','ok');closeSheet();},'image/jpeg',.92);
}

// توقيع
let _sd=false,_sc2=null;
function buildSignature(){
  document.getElementById('sheetBody').innerHTML=`
    ${desc('ارسم توقيعك بإصبعك وحمّله كـ PNG شفاف.','Draw your signature and download as transparent PNG.')}
    <canvas id="sigCanvas"></canvas>
    <div class="sig-row">
      <button class="sig-btn" onclick="clearSig()">${_lang==='ar'?'🗑 مسح':'🗑 Clear'}</button>
      <button class="sig-btn" id="sigColBtn" onclick="toggleSigCol()">${_lang==='ar'?'القلم: أسود':'Pen: Black'}</button>
    </div>
    <div class="slider-row"><label>${_lang==='ar'?'السُمك':'Thickness'}</label><input type="range" id="sigW" min="1" max="8" value="2.5" oninput="if(_sc2)_sc2.lineWidth=+this.value" style="flex:1;accent-color:var(--red)"><span class="slider-val" id="sigWV">2.5</span></div>
    <button class="action-btn" onclick="doSig()">${icoDl()} ${_lang==='ar'?'تحميل التوقيع PNG':'Download Signature PNG'}</button>`;
  const cv=document.getElementById('sigCanvas');cv.width=cv.offsetWidth||340;cv.height=180;
  _sc2=cv.getContext('2d');_sc2.fillStyle='white';_sc2.fillRect(0,0,cv.width,cv.height);
  _sc2.strokeStyle='#000';_sc2.lineWidth=2.5;_sc2.lineCap='round';_sc2.lineJoin='round';window._sCol='#000';
  document.getElementById('sigW').addEventListener('input',e=>{if(_sc2)_sc2.lineWidth=+e.target.value;document.getElementById('sigWV').textContent=e.target.value;});
  const gp=e=>{const r=cv.getBoundingClientRect(),s=e.touches?e.touches[0]:e;return{x:(s.clientX-r.left)*(cv.width/r.width),y:(s.clientY-r.top)*(cv.height/r.height)};};
  cv.onmousedown=e=>{_sd=true;const p=gp(e);_sc2.beginPath();_sc2.moveTo(p.x,p.y);};
  cv.onmousemove=e=>{if(!_sd)return;const p=gp(e);_sc2.lineTo(p.x,p.y);_sc2.stroke();};
  cv.onmouseup=()=>_sd=false;
  cv.addEventListener('touchstart',e=>{_sd=true;const p=gp(e);_sc2.beginPath();_sc2.moveTo(p.x,p.y);},{passive:false});
  cv.addEventListener('touchmove',e=>{if(!_sd)return;if(_sd)e.preventDefault();const p=gp(e);_sc2.lineTo(p.x,p.y);_sc2.stroke();},{passive:false});
  cv.addEventListener('touchend',()=>_sd=false);
}
function clearSig(){const cv=document.getElementById('sigCanvas');if(!cv||!_sc2)return;_sc2.fillStyle='white';_sc2.fillRect(0,0,cv.width,cv.height);}
function toggleSigCol(){window._sCol=window._sCol==='#000'?'#00008b':'#000';if(_sc2)_sc2.strokeStyle=window._sCol;document.getElementById('sigColBtn').textContent=(_lang==='ar'?'القلم: ':'Pen: ')+(window._sCol==='#000'?(_lang==='ar'?'أسود':'Black'):(_lang==='ar'?'أزرق':'Blue'));}
function doSig(){const cv=document.getElementById('sigCanvas');if(!cv)return;const a=document.createElement('a');a.href=cv.toDataURL('image/png');a.download='signature.png';a.click();toast(_lang==='ar'?'تم تحميل التوقيع':'Downloaded','ok');closeSheet();}

// ملاحظة
function buildNote(){
  document.getElementById('sheetBody').innerHTML=`
    ${desc('يحوّل نصاً لملف PDF جاهز للطباعة.','Convert text to a printable PDF.')}
    <div class="field"><label>${_lang==='ar'?'العنوان':'Title'}</label><input type="text" id="ntT" value="${_lang==='ar'?'ملاحظة':'Note'}"></div>
    <div class="field"><label>${_lang==='ar'?'النص':'Text'}</label><textarea id="ntB" rows="6" placeholder="${_lang==='ar'?'اكتب هنا...':'Write here...'}"></textarea></div>
    <button class="action-btn" onclick="doNote()">${icoDl()} ${_lang==='ar'?'حفظ كـ PDF':'Save as PDF'}</button>`;
}
function doNote(){
  const t=document.getElementById('ntT').value||'note',b=document.getElementById('ntB').value||'';
  const pdf=new jsPDF({unit:'mm',format:'a4'});pdf.setFontSize(18);pdf.text(t,105,20,{align:'center'});pdf.setFontSize(13);pdf.text(pdf.splitTextToSize(b,170),20,35);
  pdf.save(t+'.pdf');addFile(t+'.pdf','pdf');toast(_lang==='ar'?'تم':'Done','ok');closeSheet();
}

// محرر النصوص (Text Editor)
function buildTextEditor(){
  const ar=_lang==='ar';
  const sh=document.getElementById('sheet');
  const H=window.innerHeight;
  if(sh){sh.style.height=H+'px';sh.style.maxHeight=H+'px';sh.style.borderRadius='0';}
  // ثبّت body لمنع انزياح الكيبورد
  document.body.style.overflow='hidden';
  document.body.style.position='fixed';
  document.body.style.top='0';document.body.style.left='0';
  document.body.style.right='0';document.body.style.bottom='0';
  // sheetBody قابل للتمرير حتى يعمل الشريط الجانبي
  const sb=document.getElementById('sheetBody');
  if(sb){sb.style.cssText='overflow-y:auto;-webkit-overflow-scrolling:touch;padding:0;';}

  document.getElementById('sheetBody').innerHTML=`
    <div style="position:sticky;top:0;z-index:10;background:#f3f3f3;border-bottom:1px solid #ddd;">
      <div style="display:flex;align-items:center;padding:3px 6px;gap:6px;border-bottom:1px solid #eee;">
        <span style="font-size:10px;color:#666;white-space:nowrap">${ar?'الخط:':'Font:'}</span>
        <select id="teFontSel" style="flex:1;height:26px;border:1px solid #ccc;border-radius:4px;background:#fff;font-size:12px;padding:0 4px;color:#333;">
          <option value="">${ar?'اختر الخط':'Select font'}</option>
          <option value="Amiri">${ar?'أميري (كلاسيكي)':'Amiri'}</option>
          <option value="Scheherazade New">${ar?'شهرزاد (تقليدي)':'Scheherazade'}</option>
          <option value="Cairo">${ar?'القاهرة (عصري)':'Cairo'}</option>
          <option value="Tajawal">${ar?'تجوال (بسيط)':'Tajawal'}</option>
          <option value="Georgia">Georgia</option>
          <option value="Courier New">Courier New</option>
          <option value="Arial">Arial</option>
        </select>
      </div>
      <div id="teToolbar">
        <span class="ql-formats">
          <button class="ql-bold" title="${ar?'عريض':'Bold'}"></button>
          <button class="ql-italic" title="${ar?'مائل':'Italic'}"></button>
          <button class="ql-underline" title="${ar?'تسطير':'Underline'}"></button>
        </span>
        <span class="ql-formats">
          <select class="ql-size" title="${ar?'حجم الخط':'Size'}">
            <option value="12px">12</option><option value="14px" selected>14</option>
            <option value="16px">16</option><option value="18px">18</option>
            <option value="24px">24</option><option value="32px">32</option>
            <option value="48px">48</option>
          </select>
        </span>
        <span class="ql-formats">
          <select class="ql-color" title="${ar?'لون النص':'Color'}"></select>
          <select class="ql-background" title="${ar?'تظليل':'Highlight'}"></select>
        </span>
        <span class="ql-formats">
          <select class="ql-align" title="${ar?'محاذاة':'Align'}"></select>
        </span>
        <span class="ql-formats">
          <button class="ql-list" value="ordered" title="${ar?'مرقمة':'Numbered'}"></button>
          <button class="ql-list" value="bullet" title="${ar?'نقطية':'Bullets'}"></button>
          <button class="ql-image" title="${ar?'صورة':'Image'}"></button>
          <button class="ql-clean" title="${ar?'مسح':'Clear'}"></button>
        </span>
      </div>
    </div>
    <div id="teEditor" style="min-height:400px;background:#fff;"></div>
    <div style="padding:10px;background:var(--bg);border-top:1px solid var(--border);">
      <div class="field"><label>${ar?'اسم الملف':'File Name'}</label><input type="text" id="teNm" value="${ar?'مستند جديد':'New Document'}"></div>
      <div class="prog-box" id="tePB"><div class="prog-lbl" id="tePL"></div><div class="prog-bar"><div class="prog-fill" id="tePF"></div></div></div>
      <div style="display:flex;gap:8px;margin-top:8px">
        <button style="flex:1;padding:11px;background:var(--card2);border:1px solid var(--border);border-radius:10px;color:var(--text);font-family:inherit;font-size:13px;font-weight:600;cursor:pointer" onclick="tePrint()">${ar?'طباعة':'Print'}</button>
        <button class="action-btn" style="flex:1" onclick="teSaveAsPDF()">${icoDl()} ${ar?'حفظ PDF':'Save PDF'}</button>
      </div>
    </div>`;

  try{
    const FontStyle=Quill.import('attributors/style/font');
    FontStyle.whitelist=['Amiri','Scheherazade New','Cairo','Tajawal','Georgia','Courier New','Arial'];
    Quill.register({'formats/font':FontStyle},true);
    const SizeStyle=Quill.import('attributors/style/size');
    SizeStyle.whitelist=['12px','14px','16px','18px','24px','32px','48px'];
    Quill.register({'formats/size':SizeStyle},true);
  }catch(e){}

  window._teQuill=new Quill('#teEditor',{theme:'snow',modules:{toolbar:'#teToolbar'}});
  window._teQuill.root.setAttribute('dir',ar?'rtl':'ltr');
  window._teQuill.root.style.textAlign=ar?'right':'left';
  window._teLastRange=null;
  window._teQuill.on('selection-change',function(r){if(r)window._teLastRange=r;});

  const fontSel=document.getElementById('teFontSel');
  if(fontSel){
    fontSel.addEventListener('mousedown',()=>{window._teLastRange=window._teQuill&&window._teQuill.getSelection()||window._teLastRange;});
    fontSel.addEventListener('touchstart',()=>{window._teLastRange=window._teQuill&&window._teQuill.getSelection()||window._teLastRange;},{passive:true});
    fontSel.addEventListener('change',function(){
      const fv=this.value;if(!fv){this.value='';return;}
      const q=window._teQuill;if(!q){this.value='';return;}
      q.root.focus();
      const range=window._teLastRange||q.getSelection();
      try{
        if(range&&range.length>0){q.formatText(range.index,range.length,'font',fv,Quill.sources.USER);}
        else{const idx=range?range.index:q.getLength()-1;q.setSelection(idx,0);q.format('font',fv,Quill.sources.USER);}
      }catch(e){}
      window._teLastRange=null;
      // لا نعيد القائمة للفارغ — نُبقي الخط المختار ظاهراً
    });
  }

  // إصلاح الكيبورد باستخدام visualViewport
  function teFixHeight(){
    const el=document.getElementById('sheet');
    if(!el)return;
    const h=window.visualViewport?window.visualViewport.height:window.innerHeight;
    el.style.height=h+'px';el.style.maxHeight=h+'px';
  }
  teFixHeight();
  if(window.visualViewport){
    window.visualViewport.addEventListener('resize',teFixHeight);
    window.visualViewport.addEventListener('scroll',teFixHeight);
  }

  // مقابض الصورة — 4 مقابض + زر تحريك
  let _h=document.getElementById('teImgH');if(_h)_h.remove();
  _h=document.createElement('div');_h.id='teImgH';
  _h.style.cssText='display:none;position:fixed;z-index:9999;border:2px solid #e53935;pointer-events:none;box-sizing:border-box;';

  // زر التحريك — دائرة حمراء في المنتصف
  const _mv=document.createElement('div');
  _mv.style.cssText='position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);width:34px;height:34px;background:#e53935;border:2px solid #fff;border-radius:50%;pointer-events:auto;touch-action:none;cursor:move;display:flex;align-items:center;justify-content:center;';
  _mv.innerHTML='<svg width="18" height="18" viewBox="0 0 24 24" fill="white"><path d="M13 6v5h5V7l4 5-4 5v-4h-5v5h4l-5 4-5-4h4v-5H7v4l-4-5 4-5v4h5V6H8l5-4 5 4z"/></svg>';
  _mv.addEventListener('pointerdown',ev=>{
    const img=window._teCurImg;if(!img)return;
    ev.preventDefault();ev.stopPropagation();
    img.style.position='relative';
    if(!img.style.right||img.style.right==='auto')img.style.right='0px';
    if(!img.style.top||img.style.top==='auto')img.style.top='0px';
    img.style.left='auto';
    const sr=parseFloat(img.style.right)||0,st=parseFloat(img.style.top)||0;
    const sx=ev.clientX,sy=ev.clientY;
    function mv(e2){
      e2.preventDefault();
      const dx=e2.clientX-sx,dy=e2.clientY-sy;
      img.style.right=(sr-dx)+'px'; // في RTL: تقليل right = تحرك يمين
      img.style.top=(st+dy)+'px';
      tePositionImgH(img);
    }
    function up(){document.removeEventListener('pointermove',mv);document.removeEventListener('pointerup',up);}
    document.addEventListener('pointermove',mv,{passive:false});
    document.addEventListener('pointerup',up);
  });
  _h.appendChild(_mv);

  [{id:'n',css:'top:-10px;left:calc(50% - 10px);cursor:ns-resize;'},
   {id:'s',css:'bottom:-10px;left:calc(50% - 10px);cursor:ns-resize;'},
   {id:'w',css:'left:-10px;top:calc(50% - 10px);cursor:ew-resize;'},
   {id:'e',css:'right:-10px;top:calc(50% - 10px);cursor:ew-resize;'}
  ].forEach(({id,css})=>{
    const d=document.createElement('div');
    d.style.cssText='position:absolute;width:20px;height:20px;background:#e53935;border:2px solid #fff;border-radius:4px;pointer-events:auto;touch-action:none;'+css;
    d.addEventListener('pointerdown',ev=>{
      const img=window._teCurImg;if(!img)return;
      ev.preventDefault();ev.stopPropagation();
      img.style.position='relative';
      // في RTL نستخدم right بدل left للتموضع الأفقي
      if(!img.style.right||img.style.right==='auto')img.style.right='0px';
      if(!img.style.top||img.style.top==='auto')img.style.top='0px';
      img.style.left='auto';
      const sw=img.offsetWidth,sh2=img.offsetHeight;
      const sr=parseFloat(img.style.right)||0,st=parseFloat(img.style.top)||0;
      img.style.width=sw+'px';img.style.height=sh2+'px';
      const sx=ev.clientX,sy=ev.clientY;
      function mv(e2){
        e2.preventDefault();
        const dx=e2.clientX-sx,dy=e2.clientY-sy;
        if(id==='s'){
          // أسفل: يزيد الارتفاع للأسفل — الحافة العليا ثابتة
          img.style.height=Math.max(30,sh2+dy)+'px';
        }
        if(id==='n'){
          // أعلى: يزيد الارتفاع للأعلى — الحافة السفلى ثابتة
          const nh=Math.max(30,sh2-dy);
          img.style.height=nh+'px';
          img.style.top=(st+dy)+'px';
        }
        if(id==='e'){
          // يمين RTL: نحرك right للأمام (سالب = يمين) ونزيد العرض
          // الحافة اليسرى ثابتة، اليمينية تتحرك
          const nw=Math.max(30,sw+dx);
          img.style.width=nw+'px';
          img.style.right=(sr-dx)+'px';
        }
        if(id==='w'){
          // يسار RTL: نغير العرض فقط — الحافة اليمنى ثابتة تلقائياً
          img.style.width=Math.max(30,sw-dx)+'px';
        }
        tePositionImgH(img);
      }
      function up(){document.removeEventListener('pointermove',mv);document.removeEventListener('pointerup',up);}
      document.addEventListener('pointermove',mv,{passive:false});
      document.addEventListener('pointerup',up);
    });
    _h.appendChild(d);
  });

  const _del=document.createElement('div');_del.textContent='X';
  _del.style.cssText='position:absolute;top:-12px;right:-12px;width:22px;height:22px;background:#e53935;border:2px solid #fff;border-radius:50%;color:#fff;font-size:11px;line-height:18px;text-align:center;cursor:pointer;pointer-events:auto;font-weight:bold;';
  _del.addEventListener('pointerdown',e=>{e.stopPropagation();e.preventDefault();if(window._teCurImg){window._teCurImg.remove();_h.style.display='none';window._teCurImg=null;toast(ar?'تم الحذف':'Deleted','ok');}});
  _h.appendChild(_del);
  document.body.appendChild(_h);
  // أحداث الصورة — touchstart فقط مع capture لمنع الكيبورد
  // باقي الأحداث بدون capture لإتاحة التمرير الطبيعي
  window._teQuill.root.addEventListener('touchstart',function(e){
    if(e.target.tagName==='IMG'){
      e.preventDefault();e.stopImmediatePropagation();
      window._teCurImg=e.target;tePositionImgH(e.target);_h.style.display='block';
    }else if(!_h.contains(e.target)){
      _h.style.display='none';window._teCurImg=null;
    }
  },{passive:false,capture:true});
  window._teQuill.root.addEventListener('pointerdown',function(e){
    if(e.target.tagName==='IMG'){
      e.preventDefault();e.stopImmediatePropagation();
      window._teCurImg=e.target;tePositionImgH(e.target);_h.style.display='block';
    }
  },{passive:false,capture:true});
  document.addEventListener('pointerdown',e=>{
    if(e.target.tagName==='IMG'||_h.contains(e.target))return;
    _h.style.display='none';window._teCurImg=null;
  });

  const tb=document.getElementById('teToolbar');let _tmr=null,_lp=false;
  tb.addEventListener('touchstart',e=>{const t=e.target.closest('[title]');_lp=false;clearTimeout(_tmr);if(!t||!t.title)return;_tmr=setTimeout(()=>{_lp=true;toast(t.title,'ok');if(navigator.vibrate)navigator.vibrate(15);},420);},{passive:true});
  tb.addEventListener('touchend',e=>{clearTimeout(_tmr);if(_lp){e.preventDefault();e.stopPropagation();}},{passive:false});
  tb.addEventListener('touchmove',()=>clearTimeout(_tmr),{passive:true});
}

function teCloseFullscreen(){
  // إعادة body لحالته الطبيعية
  document.body.style.overflow='';
  document.body.style.position='';
  document.body.style.width='';
  const sh=document.getElementById('sheet');
  if(sh)sh.style.cssText='';
  closeSheet();
  window._teQuill=null;
  window._teLastRange=null;
  const _h=document.getElementById('teImgH');if(_h)_h.remove();
}

function tePositionImgH(img){var _h=document.getElementById("teImgH");if(!_h||!img)return;var r=img.getBoundingClientRect();_h.style.left=r.left+"px";_h.style.top=r.top+"px";_h.style.width=r.width+"px";_h.style.height=r.height+"px";}

function tePrint(){
  if(!window._teQuill){toast(_lang==='ar'?'المحرر غير جاهز':'Editor not ready','err');return;}
  const win=window.open('','_blank');
  if(!win){toast(_lang==='ar'?'فعّل النوافذ المنبثقة':'Enable popups','err');return;}
  win.document.write('<html><head><style>body{font-family:Tahoma,Arial,sans-serif;direction:'+(_lang==='ar'?'rtl':'ltr')+';padding:24px;max-width:800px;margin:0 auto}img{max-width:100%}</style></head><body>'+window._teQuill.root.innerHTML+'<script>setTimeout(()=>window.print(),350)<\/script></body></html>');
  win.document.close();
}
async function teSaveAsPDF(){
  if(!window._teQuill){toast(_lang==='ar'?'المحرر غير جاهز':'Editor not ready','err');return;}
  const nm=document.getElementById('teNm').value.trim()||'document';
  const pb=document.getElementById('tePB'),pl=document.getElementById('tePL'),pf=document.getElementById('tePF');
  pb.classList.add('show');pl.textContent=_lang==='ar'?'جاري التحضير...':'Preparing...';pf.style.width='10%';
  try{
    const editor=document.querySelector('#tePage .ql-editor');
    const canvas=await html2canvas(editor,{scale:2,backgroundColor:'#ffffff',useCORS:true});
    pf.style.width='55%';
    const imgW=210,pxPerMm=canvas.width/imgW,pageHpx=Math.floor(297*pxPerMm);
    const total=Math.max(1,Math.ceil(canvas.height/pageHpx));
    const pdf=new jsPDF({unit:'mm',format:'a4'});
    for(let i=0;i<total;i++){
      const sh=Math.min(pageHpx,canvas.height-i*pageHpx);
      const sc=document.createElement('canvas');sc.width=canvas.width;sc.height=sh;
      const ctx=sc.getContext('2d');ctx.fillStyle='#fff';ctx.fillRect(0,0,sc.width,sc.height);
      ctx.drawImage(canvas,0,-i*pageHpx);
      if(i>0)pdf.addPage();
      pdf.addImage(sc.toDataURL('image/jpeg',.92),'JPEG',0,0,imgW,sh/pxPerMm);
      pf.style.width=(55+(i+1)/total*40)+'%';
    }
    pdf.save(nm+'.pdf');addFile(nm+'.pdf','pdf');
    pb.classList.remove('show');toast(_lang==='ar'?'تم الحفظ':'Saved','ok');closeSheet();
  }catch(e){pb.classList.remove('show');toast('Error: '+e.message,'err');}
}

// مجلد
function buildFolder(){
  document.getElementById('sheetBody').innerHTML=`
    ${desc('ينشئ مجلداً لتنظيم ملفاتك.','Creates a folder to organize your files.')}
    <div class="field"><label>${_lang==='ar'?'اسم المجلد':'Folder Name'}</label><input type="text" id="flNm" value="${_lang==='ar'?'مجلد جديد':'New Folder'}"></div>
    <button class="action-btn" onclick="toast(_lang==='ar'?'تم إنشاء المجلد':'Folder created','ok');closeSheet()">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/><line x1="12" y1="11" x2="12" y2="17"/><line x1="9" y1="14" x2="15" y2="14"/></svg>
      ${_lang==='ar'?'إنشاء':'Create'}
    </button>`;
}

// ── طباعة (Print) ──────────────────────────────
function buildPrintTool(){
  document.getElementById('sheetBody').innerHTML=`
    ${desc('اطبع أي ملف PDF أو صورة مباشرة من جهازك.','Print any PDF or image directly from your device.')}
    <div class="drop-zone"><input type="file" id="prIn" accept=".pdf,application/pdf,image/*">
      <div class="dz-icwrap"><svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#22d3ee" stroke-width="1.8" stroke-linecap="round"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg></div>
      <div class="dz-t">${_lang==='ar'?'اختر ملف':'Choose File'}</div><div class="dz-s">PDF · ${_lang==='ar'?'صورة':'Image'}</div></div>
    <div id="prCont" style="display:none">
      <div class="sel-list" id="prList"></div>
      <button class="action-btn" onclick="doPrintTool()">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>
        ${_lang==='ar'?'طباعة':'Print'}
      </button>
    </div>`;
  document.getElementById('prIn').addEventListener('change',e=>{
    const f=e.target.files[0];if(!f)return;window._prF=f;
    const isImg=f.type.startsWith('image');
    document.getElementById('prList').innerHTML=`<div class="sel-item"><div class="si-icon">${isImg?icoI():icoF()}</div><span class="si-name">${f.name}</span><span class="si-size">${fmtSize(f.size)}</span></div>`;
    document.getElementById('prCont').style.display='block';
  });
}
function doPrintTool(){
  const f=window._prF;
  if(!f){toast(_lang==='ar'?'اختر ملف أولاً':'Choose a file first','err');return;}
  const url=URL.createObjectURL(f);
  const isPDF=f.type==='application/pdf'||f.name.toLowerCase().endsWith('.pdf');
  if(isPDF){
    const win=window.open(url,'_blank');
    if(!win){toast(_lang==='ar'?'فعّل النوافذ المنبثقة للطباعة':'Enable popups to print','err');return;}
    toast(_lang==='ar'?'افتح قائمة المتصفح واختر طباعة':'Use the browser menu to print','ok');
  }else{
    const win=window.open('','_blank');
    if(!win){toast(_lang==='ar'?'فعّل النوافذ المنبثقة للطباعة':'Enable popups to print','err');return;}
    win.document.write(`<html><head><title>${f.name}</title><style>body{margin:0;display:flex;justify-content:center;align-items:center}img{max-width:100%}</style></head><body><img src="${url}" onload="setTimeout(function(){window.print()},250)"></body></html>`);
    win.document.close();
  }
}

// ── استخراج نص (Extract Text / OCR) ────────────
function buildExtract(){
  document.getElementById('sheetBody').innerHTML=`
    ${desc('يستخرج النص من ملف PDF أو صورة. للملفات الممسوحة ضوئياً يستخدم تقنية التعرف الضوئي (OCR) — قد تأخذ وقتاً أطول.','Extract text from a PDF or image. Uses OCR for scanned content — may take longer.')}
    <div class="drop-zone"><input type="file" id="exIn" accept=".pdf,application/pdf,image/*">
      <div class="dz-icwrap"><svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#4ad9d9" stroke-width="1.8" stroke-linecap="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/></svg></div>
      <div class="dz-t">${_lang==='ar'?'اختر ملف':'Choose File'}</div><div class="dz-s">PDF · ${_lang==='ar'?'صورة':'Image'}</div></div>
    <div id="exCont" style="display:none">
      <div class="sel-list" id="exList"></div>
      <div class="field"><label>${_lang==='ar'?'لغة النص (للصور الممسوحة)':'Text language (for scanned content)'}</label>
        <select id="exLang"><option value="ara">${_lang==='ar'?'عربي':'Arabic'}</option><option value="eng">${_lang==='ar'?'إنجليزي':'English'}</option></select></div>
      <div class="prog-box" id="exPB"><div class="prog-lbl" id="exPL">...</div><div class="prog-bar"><div class="prog-fill" id="exPF"></div></div></div>
      <button class="action-btn" onclick="doExtract()">${_lang==='ar'?'استخراج النص':'Extract Text'}</button>
      <div id="exResultWrap" style="display:none;margin-top:12px">
        <div style="font-size:12px;color:var(--text2);margin-bottom:6px">${_lang==='ar'?'النص المستخرج:':'Extracted text:'}</div>
        <textarea id="exResult" rows="10" style="width:100%;background:var(--card2);border:1px solid var(--border);border-radius:8px;color:var(--text);padding:10px;font-family:inherit;font-size:13px;resize:vertical"></textarea>
        <div style="display:flex;gap:8px;margin-top:8px">
          <button onclick="navigator.clipboard.writeText(document.getElementById('exResult').value);toast(_lang==='ar'?'تم النسخ':'Copied','ok')" style="flex:1;padding:10px;background:var(--card2);border:1px solid var(--border);border-radius:8px;color:var(--text);font-family:inherit;font-size:12px;cursor:pointer">${_lang==='ar'?'نسخ':'Copy'}</button>
          <button onclick="downloadExtractedText()" style="flex:1;padding:10px;background:var(--red);border:none;border-radius:8px;color:white;font-family:inherit;font-size:12px;cursor:pointer">${_lang==='ar'?'تحميل txt':'Download txt'}</button>
        </div>
      </div>
    </div>`;
  document.getElementById('exIn').addEventListener('change',e=>{
    const f=e.target.files[0];if(!f)return;window._exF=f;
    const isImg=f.type.startsWith('image');
    document.getElementById('exList').innerHTML=`<div class="sel-item"><div class="si-icon">${isImg?icoI():icoF()}</div><span class="si-name">${f.name}</span><span class="si-size">${fmtSize(f.size)}</span></div>`;
    document.getElementById('exCont').style.display='block';
    document.getElementById('exResultWrap').style.display='none';
  });
}
async function doExtract(){
  const f=window._exF;
  if(!f){toast(_lang==='ar'?'اختر ملف أولاً':'Choose a file first','err');return;}
  const pb=document.getElementById('exPB'),pl=document.getElementById('exPL'),pf=document.getElementById('exPF');
  pb.classList.add('show');pf.style.width='5%';
  try{
    let text='';
    const isPDF=f.type==='application/pdf'||f.name.toLowerCase().endsWith('.pdf');
    const lang=document.getElementById('exLang').value;
    if(isPDF){
      pl.textContent=_lang==='ar'?'قراءة الملف...':'Reading file...';
      const ab=await f.arrayBuffer();const pdfDoc=await pdfjsLib.getDocument({data:ab}).promise;
      let digital='';
      for(let p=1;p<=pdfDoc.numPages;p++){
        pl.textContent=`${_lang==='ar'?'صفحة':'Page'} ${p}/${pdfDoc.numPages}`;pf.style.width=(p/pdfDoc.numPages*45)+'%';
        const page=await pdfDoc.getPage(p);const tc=await page.getTextContent();
        digital+=tc.items.map(it=>it.str).join(' ')+'\n\n';
      }
      if(digital.trim().length>20){
        text=digital.trim();
      }else{
        pl.textContent=_lang==='ar'?'ملف ممسوح ضوئياً، جاري التعرف...':'Scanned file, running OCR...';
        const worker=await Tesseract.createWorker(lang);
        let ocrText='';
        for(let p=1;p<=pdfDoc.numPages;p++){
          pl.textContent=`OCR ${p}/${pdfDoc.numPages}`;pf.style.width=(45+p/pdfDoc.numPages*50)+'%';
          const page=await pdfDoc.getPage(p);const vp=page.getViewport({scale:2});
          const cv=document.createElement('canvas');cv.width=vp.width;cv.height=vp.height;
          await page.render({canvasContext:cv.getContext('2d'),viewport:vp}).promise;
          const {data:{text:pt}}=await worker.recognize(cv);
          ocrText+=pt+'\n\n';
        }
        await worker.terminate();
        text=ocrText.trim();
      }
    }else{
      pl.textContent=_lang==='ar'?'جاري التعرف الضوئي...':'Running OCR...';pf.style.width='20%';
      const worker=await Tesseract.createWorker(lang);
      const url=URL.createObjectURL(f);
      const {data:{text:it}}=await worker.recognize(url);
      URL.revokeObjectURL(url);
      await worker.terminate();
      text=it.trim();
    }
    pf.style.width='100%';
    document.getElementById('exResult').value=text||(_lang==='ar'?'لم يتم العثور على نص':'No text found');
    document.getElementById('exResultWrap').style.display='block';
    pb.classList.remove('show');
    toast(_lang==='ar'?'تم الاستخراج':'Extracted','ok');
  }catch(e){pb.classList.remove('show');toast('Error: '+e.message,'err');}
}
function downloadExtractedText(){
  const text=document.getElementById('exResult').value;
  const blob=new Blob([text],{type:'text/plain'});
  const url=URL.createObjectURL(blob);
  const a=document.createElement('a');a.href=url;a.download=(window._exF?window._exF.name.replace(/\.[^.]+$/,''):'extracted')+'.txt';document.body.appendChild(a);a.click();a.remove();
  URL.revokeObjectURL(url);
}

// ── ضغط الملفات (Compress PDF File) ────────────
function buildCompressFile(){
  document.getElementById('sheetBody').innerHTML=`
    ${desc('يقلل حجم ملف PDF عن طريق ضغط الصور بداخله.','Reduces PDF file size by compressing the images inside it.')}
    <div class="drop-zone"><input type="file" id="cfIn" accept=".pdf,application/pdf">
      <div class="dz-icwrap"><svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#a3e635" stroke-width="1.8" stroke-linecap="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><polyline points="4 14 10 14 10 20"/></svg></div>
      <div class="dz-t">${_lang==='ar'?'اختر ملف PDF':'Choose PDF file'}</div></div>
    <div id="cfCont" style="display:none">
      <div class="sel-list" id="cfList"></div>
      <div class="field"><label>${_lang==='ar'?'مستوى الضغط':'Compression Level'}</label>
        <select id="cfQ">
          <option value="0.4">${_lang==='ar'?'ضغط عالٍ (حجم أصغر)':'High (smaller size)'}</option>
          <option value="0.65" selected>${_lang==='ar'?'متوسط':'Medium'}</option>
          <option value="0.85">${_lang==='ar'?'ضغط خفيف (جودة أعلى)':'Light (higher quality)'}</option>
        </select></div>
      <div class="prog-box" id="cfPB"><div class="prog-lbl" id="cfPL">...</div><div class="prog-bar"><div class="prog-fill" id="cfPF"></div></div></div>
      <button class="action-btn" id="cfBtn" onclick="doCompressFile()">${icoDl()} ${_lang==='ar'?'ضغط وتحميل':'Compress & Download'}</button>
    </div>`;
  document.getElementById('cfIn').addEventListener('change',e=>{
    const f=e.target.files[0];if(!f)return;window._cfF=f;
    document.getElementById('cfList').innerHTML=`<div class="sel-item"><div class="si-icon">${icoF()}</div><span class="si-name">${f.name}</span><span class="si-size">${fmtSize(f.size)}</span></div>`;
    document.getElementById('cfCont').style.display='block';
  });
}
async function doCompressFile(){
  const f=window._cfF;
  if(!f){toast(_lang==='ar'?'اختر ملف أولاً':'Choose a file first','err');return;}
  const q=parseFloat(document.getElementById('cfQ').value);
  const btn=document.getElementById('cfBtn'),pb=document.getElementById('cfPB'),pl=document.getElementById('cfPL'),pf=document.getElementById('cfPF');
  btn.disabled=true;pb.classList.add('show');
  try{
    const origSize=f.size;
    const ab=await f.arrayBuffer();const pdfDoc=await pdfjsLib.getDocument({data:ab}).promise;
    let pdf=null;
    for(let p=1;p<=pdfDoc.numPages;p++){
      pl.textContent=`${p}/${pdfDoc.numPages}...`;pf.style.width=(p/pdfDoc.numPages*90)+'%';
      const page=await pdfDoc.getPage(p);const vp=page.getViewport({scale:1.5});
      const cv=document.createElement('canvas');cv.width=vp.width;cv.height=vp.height;
      await page.render({canvasContext:cv.getContext('2d'),viewport:vp}).promise;
      const data=cv.toDataURL('image/jpeg',q);
      const pw=vp.width*.264583/1.5,ph=vp.height*.264583/1.5;
      if(!pdf)pdf=new jsPDF({unit:'mm',format:[pw,ph]});else pdf.addPage([pw,ph]);
      pdf.addImage(data,'JPEG',0,0,pw,ph);
    }
    pf.style.width='100%';await delay(300);
    const blob=pdf.output('blob');
    const newSize=blob.size;
    const nm=f.name.replace(/\.pdf$/i,'')+'-compressed.pdf';
    const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=nm;document.body.appendChild(a);a.click();a.remove();URL.revokeObjectURL(url);
    addFile(nm,'pdf');
    pb.classList.remove('show');btn.disabled=false;
    const pct=Math.max(0,Math.round((1-newSize/origSize)*100));
    toast((_lang==='ar'?`تم الضغط، توفير ${pct}%`:`Compressed, saved ${pct}%`),'ok');
    closeSheet();
  }catch(e){pb.classList.remove('show');btn.disabled=false;toast('Error: '+e.message,'err');}
}

// ── قفل PDF (Lock / Password Protect) ──────────
function buildLockPDF(){
  document.getElementById('sheetBody').innerHTML=`
    ${desc('يحمي ملف PDF بكلمة مرور لفتحه. احتفظ بكلمة المرور جيداً، لا يمكن استرجاعها.','Protects a PDF with a password to open it. Keep your password safe — it cannot be recovered.')}
    <div class="drop-zone"><input type="file" id="lkIn" accept=".pdf,application/pdf">
      <div class="dz-icwrap"><svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#f472b6" stroke-width="1.8" stroke-linecap="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg></div>
      <div class="dz-t">${_lang==='ar'?'اختر ملف PDF':'Choose PDF file'}</div></div>
    <div id="lkCont" style="display:none">
      <div class="sel-list" id="lkList"></div>
      <div class="field"><label>${_lang==='ar'?'كلمة المرور (٤ أحرف على الأقل)':'Password (min 4 characters)'}</label><input type="text" id="lkPass" placeholder="${_lang==='ar'?'أدخل كلمة مرور':'Enter password'}"></div>
      <div class="prog-box" id="lkPB"><div class="prog-lbl" id="lkPL">...</div><div class="prog-bar"><div class="prog-fill" id="lkPF"></div></div></div>
      <button class="action-btn" id="lkBtn" onclick="doLockPDF()">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
        ${_lang==='ar'?'قفل وتحميل':'Lock & Download'}
      </button>
    </div>`;
  document.getElementById('lkIn').addEventListener('change',e=>{
    const f=e.target.files[0];if(!f)return;window._lkF=f;
    document.getElementById('lkList').innerHTML=`<div class="sel-item"><div class="si-icon">${icoF()}</div><span class="si-name">${f.name}</span><span class="si-size">${fmtSize(f.size)}</span></div>`;
    document.getElementById('lkCont').style.display='block';
  });
}
async function doLockPDF(){
  const f=window._lkF;
  if(!f){toast(_lang==='ar'?'اختر ملف أولاً':'Choose a file first','err');return;}
  const pass=document.getElementById('lkPass').value.trim();
  if(!pass||pass.length<4){toast(_lang==='ar'?'أدخل كلمة مرور 4 أحرف على الأقل':'Enter a password (min 4 chars)','err');return;}
  const btn=document.getElementById('lkBtn'),pb=document.getElementById('lkPB'),pl=document.getElementById('lkPL'),pf=document.getElementById('lkPF');
  btn.disabled=true;pb.classList.add('show');
  try{
    const ab=await f.arrayBuffer();const pdfDoc=await pdfjsLib.getDocument({data:ab}).promise;
    let pdf=null;
    for(let p=1;p<=pdfDoc.numPages;p++){
      pl.textContent=`${p}/${pdfDoc.numPages}...`;pf.style.width=(p/pdfDoc.numPages*90)+'%';
      const page=await pdfDoc.getPage(p);const vp=page.getViewport({scale:2});
      const cv=document.createElement('canvas');cv.width=vp.width;cv.height=vp.height;
      await page.render({canvasContext:cv.getContext('2d'),viewport:vp}).promise;
      const data=cv.toDataURL('image/jpeg',.88);
      const pw=vp.width*.264583/2,ph=vp.height*.264583/2;
      if(!pdf){
        pdf=new jsPDF({unit:'mm',format:[pw,ph],encryption:{userPassword:pass,ownerPassword:pass,userPermissions:['print','copy']}});
      }else{
        pdf.addPage([pw,ph]);
      }
      pdf.addImage(data,'JPEG',0,0,pw,ph);
    }
    pf.style.width='100%';await delay(300);
    const nm=f.name.replace(/\.pdf$/i,'')+'-locked.pdf';
    pdf.save(nm);addFile(nm,'pdf');
    pb.classList.remove('show');btn.disabled=false;
    toast(_lang==='ar'?'تم قفل الملف بكلمة المرور':'File locked with password','ok');
    closeSheet();
  }catch(e){pb.classList.remove('show');btn.disabled=false;toast('Error: '+e.message,'err');}
}
