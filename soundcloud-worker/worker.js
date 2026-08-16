// ResenhaFlix SoundCloud Search Worker
// Configure secrets:
//   SOUNDCLOUD_CLIENT_ID
//   SOUNDCLOUD_CLIENT_SECRET
//
// This worker ONLY searches public SoundCloud resources.
// Playback stays on the official SoundCloud Widget in ResenhaFlix.

const TOKEN_CACHE_KEY = "https://resenhaflix.local/__soundcloud_token__";

function cors(origin="*"){
  return {
    "Access-Control-Allow-Origin": origin || "*",
    "Access-Control-Allow-Methods": "GET,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Content-Type": "application/json; charset=utf-8"
  };
}

async function getToken(env){
  if(!env.SOUNDCLOUD_CLIENT_ID || !env.SOUNDCLOUD_CLIENT_SECRET){
    throw new Error("SoundCloud credentials are not configured");
  }
  const cache = caches.default;
  const cached = await cache.match(TOKEN_CACHE_KEY);
  if(cached){
    const data = await cached.json();
    if(data?.access_token) return data.access_token;
  }

  const body = new URLSearchParams({
    grant_type: "client_credentials",
    client_id: env.SOUNDCLOUD_CLIENT_ID,
    client_secret: env.SOUNDCLOUD_CLIENT_SECRET
  });
  const r = await fetch("https://secure.soundcloud.com/oauth/token", {
    method: "POST",
    headers: {
      "Accept": "application/json",
      "Content-Type": "application/x-www-form-urlencoded"
    },
    body
  });
  if(!r.ok) throw new Error(`OAuth ${r.status}`);
  const data = await r.json();
  const ttl = Math.max(60, Number(data.expires_in || 3600) - 180);
  await cache.put(
    TOKEN_CACHE_KEY,
    new Response(JSON.stringify({access_token:data.access_token}), {
      headers: {"Content-Type":"application/json","Cache-Control":`public,max-age=${ttl}`}
    })
  );
  return data.access_token;
}

function trimTrack(x){
  return {
    id:x.id,
    title:x.title,
    duration:x.duration,
    genre:x.genre,
    access:x.access,
    artwork_url:x.artwork_url,
    permalink_url:x.permalink_url,
    user:x.user ? {
      id:x.user.id,
      username:x.user.username,
      full_name:x.user.full_name,
      avatar_url:x.user.avatar_url,
      permalink_url:x.user.permalink_url
    } : null
  };
}
function trimUser(x){
  return {
    id:x.id,
    username:x.username,
    full_name:x.full_name,
    avatar_url:x.avatar_url,
    permalink_url:x.permalink_url
  };
}

export default {
  async fetch(request, env){
    const url = new URL(request.url);
    if(request.method === "OPTIONS") return new Response(null,{headers:cors()});
    if(url.pathname === "/health") return new Response(JSON.stringify({ok:true}),{headers:cors()});
    if(url.pathname !== "/search") return new Response(JSON.stringify({error:"not-found"}),{status:404,headers:cors()});

    const q = (url.searchParams.get("q") || "").trim();
    const type = url.searchParams.get("type") === "users" ? "users" : "tracks";
    if(q.length < 2) return new Response(JSON.stringify({items:[]}),{headers:cors()});

    try{
      const token = await getToken(env);
      let api;
      if(type === "users"){
        api = `https://api.soundcloud.com/users?q=${encodeURIComponent(q)}&limit=20&linked_partitioning=true`;
      } else {
        api = `https://api.soundcloud.com/tracks?q=${encodeURIComponent(q)}&access=playable&limit=25&linked_partitioning=true`;
      }
      const r = await fetch(api,{
        headers:{
          "Accept":"application/json; charset=utf-8",
          "Authorization":`OAuth ${token}`
        }
      });
      if(!r.ok) throw new Error(`SoundCloud ${r.status}`);
      const data = await r.json();
      const collection = Array.isArray(data) ? data : (data.collection || []);
      const items = type === "users" ? collection.map(trimUser) : collection.map(trimTrack);
      return new Response(JSON.stringify({items}),{headers:cors()});
    }catch(e){
      return new Response(JSON.stringify({error:String(e?.message||e),items:[]}),{status:502,headers:cors()});
    }
  }
};
