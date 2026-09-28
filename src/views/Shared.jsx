import MapboxMap from './MapboxMap.jsx'
import {geoOn} from '../geo.js'
const CH={Pendiente:'bg-amber-200 text-amber-900',Pagado:'bg-blue-200 text-blue-900',Asignado:'bg-green-200 text-green-900','En curso':'bg-sun text-slate-900',Completado:'bg-slate-200 text-slate-700'}
export const Chip=({e})=><span className={'chip '+CH[e]}>{e}</span>
const POLY='-71.65,19.88 -70.5,19.85 -69.3,19.25 -68.4,18.85 -68.35,18.55 -68.8,18.2 -70,18.4 -71.1,17.85 -71.7,17.75 -71.75,18.9'
const X=g=>(g+72)/3.75*300,Y=t=>(20-t)/2.6*170
// Mapa esquemático de RD. Reemplazar por Mapbox/Google Maps con VITE_MAPBOX_TOKEN.
function MapSvg({pts}){return <svg viewBox="0 0 300 170" className="block h-auto w-full rounded-2xl"><rect width="300" height="170" fill="#cfe6ff"/>
<polygon points={POLY.split(' ').map(p=>{const[a,b]=p.split(',');return X(+a).toFixed(1)+','+Y(+b).toFixed(1)}).join(' ')} fill="#f4ecd0" stroke="#0A4DA1" strokeWidth="1.5"/>
{pts.map((p,i)=><g key={i}><circle cx={X(p.lng)} cy={Y(p.lat)} r={p.big?7:5} fill={p.c} stroke="#fff" strokeWidth="2"/><text x={X(p.lng)+8} y={Y(p.lat)+4} fontSize="9" fontWeight="700" fill="#0A4DA1">{p.l}</text></g>)}</svg>}
export const Map=({pts})=>geoOn?<MapboxMap pts={pts}/>:<MapSvg pts={pts}/>
export const Nav=({a,tab,setTab,sel,setSel})=><div className="fixed inset-x-0 bottom-0 z-30 flex justify-center border-t border-slate-200 bg-white px-2 pt-2 pb-[calc(0.5rem+env(safe-area-inset-bottom,0px))]"><div className="flex w-full max-w-lg gap-1.5">
{a.map(([k,i,l])=><button key={k} onClick={()=>{setTab(k);setSel(null)}} className={'flex-1 text-xs font-semibold '+(tab===k&&!sel?'text-brand':'text-slate-500')}><span className="block text-2xl">{i}</span>{l}</button>)}</div></div>
