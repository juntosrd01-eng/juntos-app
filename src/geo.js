import {PC} from './lib.js'
const TK=import.meta.env.VITE_MAPBOX_TOKEN
export const geoOn=!!TK
// Autocompletado de direcciones en RD (Mapbox Geocoding v6), sesgado a la provincia elegida
export async function buscar(q,prov){
if(!TK||q.trim().length<4)return []
const p=PC[prov],u=new URL('https://api.mapbox.com/search/geocode/v6/forward')
u.search=new URLSearchParams({q:q+', '+prov,country:'do',language:'es',limit:'5',autocomplete:'true',access_token:TK,...(p?{proximity:p[1]+','+p[0]}:{})})
try{const r=await fetch(u);if(!r.ok)return [];const j=await r.json()
return (j.features||[]).map(f=>({t:f.properties.full_address||f.properties.name,lat:f.geometry.coordinates[1],lng:f.geometry.coordinates[0]}))}catch{return []}}
