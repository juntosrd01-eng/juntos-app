import {useEffect,useRef} from 'react'
// Mapa real. mapbox-gl se descarga solo cuando hay un mapa en pantalla.
export default function MapboxMap({pts}){const el=useRef(),key=JSON.stringify(pts)
useEffect(()=>{let map,dead=false
;(async()=>{const [{default:mb}]=await Promise.all([import('mapbox-gl'),import('mapbox-gl/dist/mapbox-gl.css')]);if(dead)return
mb.accessToken=import.meta.env.VITE_MAPBOX_TOKEN
map=new mb.Map({container:el.current,style:'mapbox://styles/mapbox/streets-v12',center:[-70.4,18.9],zoom:6.5})
map.addControl(new mb.NavigationControl({showCompass:false}),'top-right')
const b=new mb.LngLatBounds(),ok=pts.filter(p=>p.lat!=null)
ok.forEach(p=>{const d=document.createElement('div');const s=p.big?22:16
d.style.cssText=`width:${s}px;height:${s}px;border-radius:50%;background:${p.c};border:3px solid #fff;box-shadow:0 1px 5px rgba(0,0,0,.4)`
new mb.Marker(d).setLngLat([p.lng,p.lat]).setPopup(new mb.Popup({offset:14}).setText(p.l)).addTo(map);b.extend([p.lng,p.lat])})
if(ok.length>1)map.fitBounds(b,{padding:50,maxZoom:15,duration:0});else if(ok.length)map.jumpTo({center:[ok[0].lng,ok[0].lat],zoom:14.5})})()
return()=>{dead=true;map&&map.remove()}},[key])
return <div ref={el} className="h-64 w-full overflow-hidden rounded-2xl"/>}
