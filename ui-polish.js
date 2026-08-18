/* ResenhaFlix v42 — microinterações (leves)
   Somente efeitos visuais progressivos: nada aqui altera dados, rotas ou
   o funcionamento do app. Tudo é desligado no celular e durante a reprodução. */
(function(){
 if(window.__rfPolish)return; window.__rfPolish=true;
 var mm=window.matchMedia||function(){return{matches:false,addEventListener:function(){}}};
 var reduce=mm("(prefers-reduced-motion: reduce)").matches;
 var fine=mm("(hover:hover) and (pointer:fine)").matches;
 var small=mm("(max-width:900px)").matches;
 var weak=(navigator.hardwareConcurrency||8)<=4||(navigator.deviceMemory||8)<=4;
 if(reduce)return;

 var idle=window.requestIdleCallback||function(fn){return setTimeout(fn,1)};

 /* 1) Revelação suave das seções ao rolar (barata: só opacidade) */
 var io=null;
 if("IntersectionObserver" in window){
  io=new IntersectionObserver(function(entries){
   for(var i=0;i<entries.length;i++){
    var e=entries[i];
    if(e.isIntersecting){e.target.classList.add("rf-in");io.unobserve(e.target)}
   }
  },{rootMargin:"200px 0px",threshold:.01});
 }
 function observe(el){
  if(!io||!el||el.classList.contains("rf-reveal"))return;
  el.classList.add("rf-reveal");
  io.observe(el);
  setTimeout(function(){el.classList.add("rf-in")},2000);
 }
 var scanQueued=false;
 function scan(){
  scanQueued=false;
  if(document.body.classList.contains("playerOpen"))return;
  var nodes=document.querySelectorAll(".section:not(.rf-reveal), .detailSimilarSection:not(.rf-reveal)");
  for(var i=0;i<nodes.length;i++)observe(nodes[i]);
 }
 function queueScan(){
  if(scanQueued)return;scanQueued=true;idle(scan,{timeout:400});
 }
 function ready(fn){document.readyState!=="loading"?fn():document.addEventListener("DOMContentLoaded",fn)}

 ready(function(){
  queueScan();
  var main=document.getElementById("main")||document.body;
  try{
   var t=null;
   new MutationObserver(function(){clearTimeout(t);t=setTimeout(queueScan,300)})
    .observe(main,{childList:true,subtree:true});
  }catch(_){}

  /* 2) Brilho que segue o cursor — apenas desktop com ponteiro fino e máquina folgada */
  if(fine&&!small&&!weak){
   var pending=null,frame=0;
   document.addEventListener("pointermove",function(ev){
    if(document.body.classList.contains("playerOpen"))return;
    var card=ev.target&&ev.target.closest&&ev.target.closest(".card");
    if(!card)return;
    pending={card:card,x:ev.clientX,y:ev.clientY};
    if(frame)return;
    frame=requestAnimationFrame(function(){
     frame=0;
     if(!pending)return;
     var r=pending.card.getBoundingClientRect();
     pending.card.style.setProperty("--rf-mx",((pending.x-r.left)/r.width*100).toFixed(1)+"%");
     pending.card.style.setProperty("--rf-my",((pending.y-r.top)/r.height*100).toFixed(1)+"%");
     pending=null;
    });
   },{passive:true});
  }
 });
})();
