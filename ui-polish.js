/* ResenhaFlix v41 — microinterações
   Somente efeitos visuais progressivos: nada aqui altera dados, rotas ou
   o funcionamento do app. Se algo falhar, o site continua normal. */
(function(){
 if(window.__rfPolish)return; window.__rfPolish=true;
 var reduce=window.matchMedia&&window.matchMedia("(prefers-reduced-motion: reduce)").matches;
 if(reduce)return;

 /* 1) Revelação suave das seções ao rolar */
 var io=null;
 if("IntersectionObserver" in window){
  io=new IntersectionObserver(function(entries){
   entries.forEach(function(e){
    if(e.isIntersecting){e.target.classList.add("rf-in");io.unobserve(e.target)}
   });
  },{rootMargin:"0px 0px -8% 0px",threshold:.05});
 }
 function observe(el){
  if(!io||!el||el.classList.contains("rf-reveal"))return;
  el.classList.add("rf-reveal");
  io.observe(el);
  // segurança: nunca deixar conteúdo invisível
  setTimeout(function(){el.classList.add("rf-in")},2200);
 }
 function scan(){
  document.querySelectorAll(".section, .detailSimilarSection").forEach(observe);
 }
 function ready(fn){document.readyState!=="loading"?fn():document.addEventListener("DOMContentLoaded",fn)}
 ready(function(){
  scan();
  var main=document.getElementById("main")||document.body;
  try{
   new MutationObserver(function(){clearTimeout(window.__rfScanT);window.__rfScanT=setTimeout(scan,120)})
    .observe(main,{childList:true,subtree:true});
  }catch(_){}

  /* 2) Brilho que segue o cursor nos cards (apenas ponteiro fino) */
  if(window.matchMedia("(hover:hover) and (pointer:fine)").matches){
   document.addEventListener("pointermove",function(ev){
    var card=ev.target&&ev.target.closest&&ev.target.closest(".card");
    if(!card)return;
    var r=card.getBoundingClientRect();
    card.style.setProperty("--rf-mx",((ev.clientX-r.left)/r.width*100).toFixed(1)+"%");
    card.style.setProperty("--rf-my",((ev.clientY-r.top)/r.height*100).toFixed(1)+"%");
   },{passive:true});
  }
 });
})();
