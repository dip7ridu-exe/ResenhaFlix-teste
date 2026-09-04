(function(root,factory){
 const api=factory();
 if(typeof module==="object"&&module.exports){module.exports=api;return}
 root.RFWatchPartyCore=api;
 api.boot(root);
})(typeof globalThis!=="undefined"?globalThis:this,function(){
 "use strict";

 const ROOM_ALPHABET="ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
 const ROOM_LENGTH=5;
 const PROTOCOL_VERSION=1;
 const MAX_GUESTS=7;
 const OWNER_PEER_PREFIX="resenhaflix-room-";

 function normalizeCode(value){return String(value||"").toUpperCase().replace(/[^A-Z0-9]/g,"").slice(0,ROOM_LENGTH)}
 function isValidCode(value){return /^[A-Z0-9]{5}$/.test(normalizeCode(value))}
 function sanitizeName(value){return String(value||"").replace(/[<>\u0000-\u001f]/g,"").replace(/\s+/g," ").trim().slice(0,20).trim()}
 function createRoomCode(randomValues){
  const values=randomValues||function(){const data=new Uint32Array(ROOM_LENGTH);crypto.getRandomValues(data);return data}();
  let code="";for(let index=0;index<ROOM_LENGTH;index++)code+=ROOM_ALPHABET[Number(values[index]||0)%ROOM_ALPHABET.length];
  return code;
 }
 function roomPeerId(code){return OWNER_PEER_PREFIX+normalizeCode(code).toLowerCase()}
 function mediaKey(media){return media?[media.type||"movie",media.rootId||media.meta?.id||"",media.playId||media.episode?.id||""].join("|"):""}
 function sourceIdentityKey(source){
  if(!source)return "";
  if(source.url)return `url:${source.url}`;
  if(source.infoHash)return `torrent:${String(source.infoHash).toLowerCase()}`;
  return [source.manifest||"",source.index??"",source.provider||"",source.quality||"",source.name||source.title||""].join("|");
 }
 function roomUrl(href,code){
  const url=new URL(href);if(code)url.searchParams.set("sala",normalizeCode(code));else url.searchParams.delete("sala");return url.toString();
 }
 function safeReplaceState(historyApi,url){
  try{if(typeof historyApi?.replaceState!=="function")return false;historyApi.replaceState(historyApi.state??null,"",String(url));return true}catch{return false}
 }
 function expectedTime(playback,now=Date.now()){
  const current=Math.max(0,Number(playback?.currentTime||0));
  if(playback?.paused)return current;
  const sentAt=Number(playback?.sentAt||0),elapsed=sentAt&&Math.abs(now-sentAt)<=10000?Math.max(0,now-sentAt)/1000:0;
  return current+elapsed*Math.min(2,Math.max(.5,Number(playback?.playbackRate||1)));
 }
 function validMessage(message,code){
  return !!message&&typeof message==="object"&&message.protocol===PROTOCOL_VERSION&&normalizeCode(message.code)===normalizeCode(code)&&["hello","welcome","roster","sync","request-state","room-closed","rejected"].includes(message.type);
 }

 function boot(window){
  const document=window.document;
  if(!document||!document.getElementById("watchPartyModal"))return;

  const $=selector=>document.querySelector(selector);
  const adapter=()=>window.ResenhaFlixPartyAdapter;
  const nodes={
   modal:$("#watchPartyModal"),backdrop:$("#watchPartyBackdrop"),close:$("#closeWatchParty"),setup:$("#partySetup"),room:$("#partyRoom"),
   title:$("#partyModalTitle"),context:$("#partyContext"),name:$("#partyNameInput"),code:$("#partyCodeInput"),create:$("#partyCreateBtn"),join:$("#partyJoinBtn"),
   error:$("#partySetupError"),roomCode:$("#partyRoomCode"),role:$("#partyRole"),participants:$("#partyParticipants"),status:$("#partyStatus"),
   copy:$("#partyCopyBtn"),share:$("#partyShareBtn"),choose:$("#partyChooseBtn"),leave:$("#partyLeaveBtn")
  };
  const party={
   role:"",code:"",name:"",peer:null,hostConnection:null,guests:new Map(),participants:[],context:null,
   heartbeat:null,syncTimer:null,joinTimer:null,sequence:0,lastSequence:0,pendingPlayback:null,applying:false,leaving:false,
   peerGeneration:0,connectionStatus:"idle",lastControlNotice:0
  };
  let peerLibraryPromise=null;

  function notify(message){if(adapter()?.notify)adapter().notify(message);else console.info(message)}
  function setSetupError(message=""){nodes.error.textContent=message;nodes.error.classList.toggle("show",!!message)}
  function setStatus(message,tone="working"){
   party.connectionStatus=tone;nodes.status.textContent=message;nodes.status.dataset.tone=tone;
  }
  function roomLink(){const url=new URL(window.location.href);url.searchParams.set("sala",party.code);url.hash="";return url.toString()}
  function updateRoomUrl(code){return safeReplaceState(window.history,roomUrl(window.location.href,code))}
  function storedName(){try{return sanitizeName(window.localStorage.getItem("rf59_party_name")||"")}catch{return""}}
  function saveName(name){try{window.localStorage.setItem("rf59_party_name",name)}catch{}}
  function readName(){
   const name=sanitizeName(nodes.name.value);
   if(name.length<2){setSetupError("Digite um nome com pelo menos 2 caracteres.");nodes.name.focus();return""}
   nodes.name.value=name;saveName(name);return name;
  }
  function refreshContext(){
   party.context=adapter()?.getContext?.()||null;
   const title=party.context?.title||"Sala livre";
   nodes.context.querySelector("b").textContent=title;
   nodes.context.querySelector("span").textContent=party.context?"A sala começará com este título.":"Crie agora e escolha o que assistir depois.";
   nodes.context.classList.toggle("empty",!party.context);
   nodes.create.textContent=party.context?"Criar sala com este título":"Criar sala agora";
   nodes.create.disabled=false;
  }
  function showSetup({code="",message=""}={}){
   nodes.setup.hidden=false;nodes.room.hidden=true;nodes.title.textContent="Assistir junto";
   nodes.name.value=storedName();nodes.code.value=normalizeCode(code);setSetupError(message);refreshContext();
  }
  function openModal(options={}){
   showSetup(options);nodes.modal.classList.add("open");nodes.modal.setAttribute("aria-hidden","false");document.body.classList.add("partyModalOpen");
   $("#mobileNavMenuClose")?.click();
   void ensurePeerLibrary().catch(()=>{});
   window.requestAnimationFrame(()=>{const target=options.code?nodes.name:nodes.create;try{target.focus({preventScroll:true})}catch{target.focus()}});
  }
  function closeModal(){nodes.modal.classList.remove("open");nodes.modal.setAttribute("aria-hidden","true");document.body.classList.remove("partyModalOpen")}
  function setBusy(busy,label="Conectando à sala…"){
   nodes.create.disabled=busy;nodes.join.disabled=busy;nodes.name.disabled=busy;nodes.code.disabled=busy;
   if(busy)setSetupError(label);
  }
  function participantRoster(){
   const owner={id:party.peer?.id||"owner",name:party.name||"Dono",owner:true};
   const guests=[...party.guests.values()].filter(item=>item.joined).map(item=>({id:item.id,name:item.name,owner:false}));
   return [owner,...guests];
  }
  function updateEntryButtons(){
   const total=Math.max(1,party.participants.length||participantRoster().length||1);
   document.querySelectorAll("[data-watch-party-open]").forEach(button=>{
    button.classList.toggle("partyActive",!!party.role);
    button.setAttribute("aria-label",party.role?`Sala ${party.code}, ${total} participantes`:"Abrir sala para assistir junto");
    const count=button.querySelector(".watchPartyCount");if(count){count.textContent=party.role?String(total):"";count.hidden=!party.role}
   });
  }
  function renderParticipants(){
   nodes.participants.replaceChildren();
   for(const participant of party.participants){
    const item=document.createElement("li"),avatar=document.createElement("span"),name=document.createElement("b"),tag=document.createElement("small");
    avatar.textContent=(participant.name||"?").slice(0,1).toUpperCase();name.textContent=participant.name||"Convidado";tag.textContent=participant.owner?"Dono":"Na sala";
    item.className=participant.owner?"owner":"";item.append(avatar,name,tag);nodes.participants.append(item);
   }
   updateEntryButtons();
  }
  function enterRoomView(){
   nodes.setup.hidden=true;nodes.room.hidden=false;nodes.title.textContent="Sala ativa";nodes.roomCode.textContent=party.code;
   nodes.role.textContent=party.role==="owner"?"Você é o dono":"Você entrou como convidado";
   nodes.role.dataset.role=party.role;document.body.classList.toggle("partyGuest",party.role==="guest");document.body.classList.add("partyRoomActive");
   nodes.choose.hidden=party.role!=="owner";
   party.participants=party.role==="owner"?participantRoster():party.participants;renderParticipants();
  }
  function peerScript(url){
   return new Promise((resolve,reject)=>{
    const script=document.createElement("script");script.src=url;script.async=true;script.crossOrigin="anonymous";
    const timer=window.setTimeout(()=>{script.remove();reject(new Error("Tempo esgotado ao carregar a conexão"))},12000);
    script.onload=()=>{window.clearTimeout(timer);window.Peer?resolve(window.Peer):reject(new Error("PeerJS não iniciou"))};
    script.onerror=()=>{window.clearTimeout(timer);script.remove();reject(new Error("Falha ao carregar PeerJS"))};document.head.appendChild(script);
   });
  }
  function ensurePeerLibrary(){
   if(window.Peer)return Promise.resolve(window.Peer);
   if(peerLibraryPromise)return peerLibraryPromise;
   peerLibraryPromise=peerScript("https://cdn.jsdelivr.net/npm/peerjs@1.5.5/dist/peerjs.min.js").catch(()=>peerScript("https://unpkg.com/peerjs@1.5.5/dist/peerjs.min.js")).catch(error=>{peerLibraryPromise=null;throw error});
   return peerLibraryPromise;
  }
  function schedulePeerWarmup(){
   const warm=()=>void ensurePeerLibrary().catch(()=>{});
   if(typeof window.requestIdleCallback==="function")window.requestIdleCallback(warm,{timeout:1600});else window.setTimeout(warm,500);
  }
  function waitForPeer(peer,timeout=12000){
   return new Promise((resolve,reject)=>{
    const timer=window.setTimeout(()=>finish(new Error("O serviço da sala demorou para responder.")),timeout);
    const finish=(error,id)=>{window.clearTimeout(timer);peer.off?.("open",onOpen);peer.off?.("error",onError);error?reject(error):resolve(id)};
    const onOpen=id=>finish(null,id),onError=error=>finish(error);peer.on("open",onOpen);peer.on("error",onError);
   });
  }
  function bindPeerLifecycle(peer,generation){
   peer.on("disconnected",()=>{
    if(generation!==party.peerGeneration||party.leaving||peer.destroyed)return;
    setStatus("Reconectando…","waiting");
    window.setTimeout(()=>{if(generation===party.peerGeneration&&!peer.destroyed&&peer.disconnected)try{peer.reconnect()}catch{}},900);
   });
   peer.on("open",()=>{if(generation===party.peerGeneration&&party.role)setStatus(party.role==="owner"?(playbackSnapshot()?"Sala pronta":"Sala pronta. Escolha o que assistir."):"Conectado à sala","working")});
   peer.on("error",error=>{
    if(generation!==party.peerGeneration||party.leaving)return;
    if(error?.type==="peer-unavailable")return disconnectToSetup("Sala não encontrada. Confira o código e tente novamente.");
    if(error?.type==="network"||error?.type==="socket-error"||error?.type==="server-error")setStatus("Conexão instável. Tentando novamente…","waiting");
   });
  }
  function safeSend(connection,message){try{if(connection?.open)connection.send({...message,protocol:PROTOCOL_VERSION,code:party.code})}catch(error){console.warn("Sala Resenha",error)}}
  function playbackSnapshot(){
   const playback=adapter()?.getPlaybackState?.();
   if(!playback?.media)return null;
   return {...playback,sentAt:Date.now()};
  }
  function broadcast(message){for(const guest of party.guests.values())if(guest.joined)safeSend(guest.connection,message)}
  function broadcastRoster(){
   if(party.role!=="owner")return;
   party.participants=participantRoster();broadcast({type:"roster",participants:party.participants});renderParticipants();
  }
  function broadcastSync(reason="heartbeat"){
   if(party.role!=="owner")return;
   const playback=playbackSnapshot();if(!playback)return;
   broadcast({type:"sync",sequence:++party.sequence,reason,playback});
  }
  function requestSync(reason="control",delay=70){
   if(party.role!=="owner")return;
   window.clearTimeout(party.syncTimer);party.syncTimer=window.setTimeout(()=>broadcastSync(reason),delay);
  }
  function startHeartbeat(){window.clearInterval(party.heartbeat);party.heartbeat=window.setInterval(()=>broadcastSync("heartbeat"),2000)}
  function acceptGuest(connection){
   if(party.role!=="owner"){connection.close();return}
   const id=String(connection.peer||"");
   if(party.guests.size>=MAX_GUESTS){connection.on("open",()=>{safeSend(connection,{type:"rejected",reason:"A sala já está cheia."});window.setTimeout(()=>connection.close(),200)});return}
   const guest={id,name:"Convidado",connection,joined:false,timer:null};party.guests.set(id,guest);
   guest.timer=window.setTimeout(()=>{if(!guest.joined){connection.close();party.guests.delete(id)}},9000);
   connection.on("data",message=>{
    if(!validMessage(message,party.code))return;
    if(message.type==="hello"){
     guest.name=sanitizeName(message.name)||"Convidado";guest.joined=true;window.clearTimeout(guest.timer);
     party.participants=participantRoster();
     safeSend(connection,{type:"welcome",owner:party.name,participants:party.participants,sequence:party.sequence,playback:playbackSnapshot()});
     broadcastRoster();requestSync("participant-joined",0);
    }else if(message.type==="request-state"){safeSend(connection,{type:"sync",sequence:++party.sequence,reason:"requested",playback:playbackSnapshot()})}
   });
   const remove=()=>{window.clearTimeout(guest.timer);if(party.guests.delete(id)){broadcastRoster();requestSync("participant-left",0)}};
   connection.on("close",remove);connection.on("error",remove);
  }
  async function createRoom(){
   const name=readName();if(!name)return;
   refreshContext();
   setBusy(true,"Criando a sala gratuita…");await cleanupRoom(false);
   try{
    if(!window.RTCPeerConnection)throw new Error("Este navegador não oferece conexão ponto a ponto.");
    const Peer=await ensurePeerLibrary();let peer=null,code="",lastError=null;
    for(let attempt=0;attempt<6;attempt++){
     code=createRoomCode();peer=new Peer(roomPeerId(code),{debug:0});
     try{await waitForPeer(peer);lastError=null;break}catch(error){lastError=error;try{peer.destroy()}catch{};peer=null;if(error?.type!=="unavailable-id")break}
    }
    if(!peer)throw lastError||new Error("Não foi possível reservar um código de sala.");
    party.role="owner";party.code=code;party.name=name;party.peer=peer;party.peerGeneration++;party.participants=[];party.sequence=0;
    const generation=party.peerGeneration;bindPeerLifecycle(peer,generation);peer.on("connection",acceptGuest);updateRoomUrl(code);enterRoomView();setStatus(party.context?"Sala pronta para compartilhar":"Sala pronta. Escolha o que assistir.",party.context?"working":"waiting");startHeartbeat();setBusy(false);
    if(party.context)try{await adapter()?.startContext?.(party.context);requestSync("room-started",0)}catch(error){console.error(error);setStatus("Sala criada. Escolha uma fonte para começar.","waiting")}
   }catch(error){console.error(error);setBusy(false);showSetup({message:error?.message||"Não foi possível criar a sala agora."})}
  }
  function bindGuestConnection(connection){
   party.hostConnection=connection;
   window.clearTimeout(party.joinTimer);party.joinTimer=window.setTimeout(()=>disconnectToSetup("A sala não respondeu. Confira se o dono continua conectado."),14000);
   connection.on("open",()=>{
    safeSend(connection,{type:"hello",name:party.name});setStatus("Entrando na sala…","waiting");
   });
   connection.on("data",message=>{
    if(!validMessage(message,party.code))return;
    if(message.type==="welcome"){
     window.clearTimeout(party.joinTimer);party.participants=Array.isArray(message.participants)?message.participants.slice(0,MAX_GUESTS+1):[];enterRoomView();
     if(message.playback){setStatus("Sincronizando o vídeo…","waiting");queueRemotePlayback(message.playback,Number(message.sequence||0))}else setStatus("Aguardando o dono escolher o filme…","waiting");
    }else if(message.type==="roster"){
     party.participants=Array.isArray(message.participants)?message.participants.slice(0,MAX_GUESTS+1):party.participants;renderParticipants();
    }else if(message.type==="sync"&&message.playback)queueRemotePlayback(message.playback,Number(message.sequence||0));
    else if(message.type==="room-closed")disconnectToSetup("O dono encerrou a sala.");
    else if(message.type==="rejected")disconnectToSetup(sanitizeName(message.reason)||"Não foi possível entrar nesta sala.");
   });
   connection.on("close",()=>{if(!party.leaving&&party.role==="guest")disconnectToSetup("A conexão com o dono da sala terminou.")});
   connection.on("error",()=>{if(!party.leaving&&party.role==="guest")setStatus("Conexão instável…","waiting")});
  }
  async function joinRoom(){
   const name=readName(),code=normalizeCode(nodes.code.value);if(!name)return;
   nodes.code.value=code;if(!isValidCode(code)){setSetupError("O código precisa ter 5 letras ou números.");nodes.code.focus();return}
   setBusy(true,"Procurando a sala…");await cleanupRoom(false);
   try{
    if(!window.RTCPeerConnection)throw new Error("Este navegador não oferece conexão ponto a ponto.");
    const Peer=await ensurePeerLibrary(),peer=new Peer(undefined,{debug:0});
    party.role="guest";party.code=code;party.name=name;party.peer=peer;party.peerGeneration++;party.participants=[];
    const generation=party.peerGeneration;bindPeerLifecycle(peer,generation);document.body.classList.add("partyGuest");updateRoomUrl(code);
    const connection=peer.connect(roomPeerId(code),{serialization:"json",reliable:true,metadata:{protocol:PROTOCOL_VERSION,code,name}});bindGuestConnection(connection);setBusy(false);
   }catch(error){console.error(error);setBusy(false);showSetup({code,message:error?.type==="peer-unavailable"?"Sala não encontrada. Confira o código.":(error?.message||"Não foi possível entrar na sala.")})}
  }
  async function queueRemotePlayback(playback,sequence=0){
   if(party.role!=="guest")return;
   if(sequence&&sequence<party.lastSequence)return;party.lastSequence=Math.max(party.lastSequence,sequence);party.pendingPlayback=playback;
   if(party.applying)return;party.applying=true;
   while(party.pendingPlayback&&party.role==="guest"){
    const next=party.pendingPlayback;party.pendingPlayback=null;
    try{
     const bridge=adapter();if(!bridge)throw new Error("Player ainda não está pronto");
     if(!next.media){setStatus("Aguardando o dono escolher o filme…","waiting");continue}
     const current=bridge.getPlaybackState?.(),wanted=mediaKey(next.media),opened=mediaKey(current?.media);
     if(wanted&&wanted!==opened){setStatus("Abrindo o mesmo título do dono…","waiting");await bridge.openMedia(next.media,next)}
     if(party.pendingPlayback)continue;
     const latest=next;
     const targetTime=expectedTime(latest,Date.now());
     const exactSource=latest.media?.stream&&bridge.applySource?await bridge.applySource(latest.media.stream,{...latest,targetTime}):true;
     await bridge.applyPlayback({...latest,targetTime});setStatus(`Sincronizado${exactSource?" • fonte do dono":" • fonte compatível"} • ${party.participants.length||1} na sala`,"working");
    }catch(error){console.warn("Sincronização da sala",error);setStatus("Aguardando uma fonte de vídeo…","waiting")}
   }
   party.applying=false;
  }
  async function copyText(text){
   try{await window.navigator.clipboard.writeText(text);return true}catch{}
   const field=document.createElement("textarea");field.value=text;field.setAttribute("readonly","");field.style.position="fixed";field.style.opacity="0";document.body.append(field);field.select();let copied=false;try{copied=document.execCommand("copy")}catch{}field.remove();return copied;
  }
  async function cleanupRoom(notifyGuests=true){
   if(party.leaving)return;party.leaving=true;
   window.clearInterval(party.heartbeat);window.clearTimeout(party.syncTimer);window.clearTimeout(party.joinTimer);
   if(notifyGuests&&party.role==="owner")broadcast({type:"room-closed"});
   for(const guest of party.guests.values()){window.clearTimeout(guest.timer);try{guest.connection.close()}catch{}}
   party.guests.clear();try{party.hostConnection?.close()}catch{};party.hostConnection=null;try{party.peer?.destroy()}catch{};party.peer=null;party.peerGeneration++;
   party.role="";party.code="";party.participants=[];party.pendingPlayback=null;party.applying=false;party.sequence=0;party.lastSequence=0;
   document.body.classList.remove("partyGuest","partyRoomActive");updateEntryButtons();updateRoomUrl("");party.leaving=false;
  }
  async function leaveRoom(){const wasOwner=party.role==="owner";await cleanupRoom(true);closeModal();notify(wasOwner?"Sala encerrada.":"Você saiu da sala.")}
  async function disconnectToSetup(message){
   if(party.leaving)return;const code=party.code;await cleanupRoom(false);openModal({code,message});
  }
  function guestControlBlocked(event){
   if(party.role!=="guest")return false;
   const selector="#playPause,#bigPlay,#centerPlay,#back10,#forward10,#centerBack10,#centerForward10,#seek,#speed,#nextBtn,#primeNextFloat,#skipIntroBtn,#playerEpisodesList .ep,#preferredSourceSelect,#autoFallbackBtn,#sourceTools button,#sources [data-source-key],#sourceSelectedBar button";
   if(!event.target?.closest?.(selector))return false;
   event.preventDefault();event.stopPropagation();event.stopImmediatePropagation();
   const now=Date.now();if(now-party.lastControlNotice>1600){party.lastControlNotice=now;notify("Somente o dono da sala controla a reprodução e a fonte.")}
   return true;
  }

  document.addEventListener("click",event=>{
   if(guestControlBlocked(event))return;
   const trigger=event.target.closest("[data-watch-party-open]");if(trigger){event.preventDefault();party.context=adapter()?.getContext?.()||null;openModal({code:party.code});if(party.role)enterRoomView()}
  },true);
  document.addEventListener("input",guestControlBlocked,true);document.addEventListener("change",guestControlBlocked,true);
  document.addEventListener("keydown",event=>{
   const typing=["INPUT","TEXTAREA","SELECT"].includes(document.activeElement?.tagName)||document.activeElement?.isContentEditable;
   if(party.role==="guest"&&!typing&&["Space","ArrowLeft","ArrowRight"].includes(event.code)){event.preventDefault();event.stopImmediatePropagation();notify("Somente o dono da sala controla a reprodução.");return}
   if(nodes.modal.classList.contains("open")&&event.key==="Escape"){event.preventDefault();closeModal()}
  },true);
  nodes.close.addEventListener("click",closeModal);nodes.backdrop.addEventListener("click",closeModal);nodes.create.addEventListener("click",createRoom);nodes.join.addEventListener("click",joinRoom);
  nodes.code.addEventListener("input",()=>{nodes.code.value=normalizeCode(nodes.code.value);setSetupError("")});nodes.code.addEventListener("keydown",event=>{if(event.key==="Enter")joinRoom()});nodes.name.addEventListener("input",()=>setSetupError(""));
  nodes.copy.addEventListener("click",async()=>notify(await copyText(party.code)?"Código da sala copiado.":"Não foi possível copiar o código."));
  nodes.share.addEventListener("click",async()=>{const data={title:`Sala ${party.code} • ResenhaFlix`,text:`Entre na minha sala do ResenhaFlix com o código ${party.code}.`,url:roomLink()};try{if(window.navigator.share)await window.navigator.share(data);else notify(await copyText(data.url)?"Link da sala copiado.":"Não foi possível compartilhar.")}catch{}});
  nodes.choose.addEventListener("click",()=>{if(party.role!=="owner")return;closeModal();if(window.matchMedia?.("(max-width:760px)")?.matches)$("#mobileSearchBtn")?.click();else $("#search")?.focus()});
  nodes.leave.addEventListener("click",leaveRoom);

  const video=$("#video");if(video){for(const eventName of ["play","pause","seeked","ratechange","ended"])video.addEventListener(eventName,()=>requestSync(eventName,eventName==="seeked"?0:70))}
  window.addEventListener("resenhaflix:party-media",()=>{requestSync("media-changed",0);window.setTimeout(()=>requestSync("media-ready",0),900)});
  window.addEventListener("resenhaflix:party-source",()=>requestSync("source-ready",0));
  document.addEventListener("visibilitychange",()=>{if(document.hidden)return;if(party.role==="owner")requestSync("visible",0);else if(party.role==="guest")safeSend(party.hostConnection,{type:"request-state"})});
  window.addEventListener("beforeunload",()=>{if(party.role==="owner")broadcast({type:"room-closed"});try{party.peer?.destroy()}catch{}});

  document.querySelectorAll("[data-watch-party-open]").forEach(button=>{for(const eventName of ["pointerenter","focusin","touchstart"])button.addEventListener(eventName,()=>void ensurePeerLibrary().catch(()=>{}),{once:true,passive:eventName==="touchstart"})});
  nodes.name.value=storedName();updateEntryButtons();schedulePeerWarmup();
  const initialCode=normalizeCode(new URL(window.location.href).searchParams.get("sala"));if(isValidCode(initialCode))openModal({code:initialCode});
  window.ResenhaFlixWatchParty={canControlPlayback:()=>party.role!=="guest",open:()=>openModal({code:party.code}),leave:leaveRoom,getState:()=>({role:party.role,code:party.code,participants:party.participants.slice()})};
 }

 return {ROOM_ALPHABET,ROOM_LENGTH,PROTOCOL_VERSION,MAX_GUESTS,normalizeCode,isValidCode,sanitizeName,createRoomCode,roomPeerId,mediaKey,sourceIdentityKey,roomUrl,safeReplaceState,expectedTime,validMessage,boot};
});
