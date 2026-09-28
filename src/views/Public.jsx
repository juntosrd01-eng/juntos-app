import {useState} from 'react'
import {useApp} from '../store.jsx'
import {T,R} from '../lib.js'

const Logo=()=>(
  <div className="flex items-center gap-2.5">
    <img 
      src="/logo-juntos.jpg" 
      alt="JUNTOS" 
      className="h-10 w-10 rounded-xl object-contain bg-black shadow-sm" 
    />
    <span className="text-2xl font-black tracking-tight text-slate-900">JUNTOS</span>
  </div>
)

export function Landing(){
  const {go}=useApp()
  const B=[
    ['🪪','Verificadas de verdad','Cédula, antecedentes y entrevista. Mujeres de 35 a 60 años.'],
    ['📍','Llegada comprobada','Check-in con GPS y foto con hora y lugar. Sin tracking invasivo.'],
    ['💬','Reporte en tu WhatsApp','Sabes si comió, si tomó su pastilla y cómo estaba de ánimo.'],
    ['🤗','Video-Abrazo','Un video de 30 segundos de tu mayor, para ti.']
  ]

  return (
    <div className="mx-auto max-w-lg px-4 pb-10 font-sans text-slate-900">
      <div className="py-3"><Logo/></div>
      <div className="my-2 rounded-[28px] bg-gradient-to-br from-brand to-blue-950 p-6 text-white shadow-md">
        <h1 className="mb-2 text-3xl font-bold leading-tight">
          ¿Tu papá está solo y tú en <span className="text-sun">Nueva York</span>?
        </h1>
        <p className="text-slate-100">
          Acompañantes dominicanas verificadas, con chaleco azul, que te muestran con foto y hora que llegaron. Compañía humana, no clínica.
        </p>
        <button className="btn btn-y mt-3 text-slate-900 font-bold" onClick={()=>go('login')}>
          Solicitar acompañamiento
        </button>
        <p className="mu !text-blue-100 mt-2">JUNTOS · A tu lado en cada paso</p>
      </div>

      <h2 className="mt-5 text-xl font-bold">Por qué familias confían en JUNTOS</h2>
      {B.map(([i,t,p])=>(
        <div key={t} className="card flex gap-3.5">
          <span className="text-3xl">{i}</span>
          <div>
            <h3 className="font-semibold">{t}</h3>
            <p className="mu">{p}</p>
          </div>
        </div>
      ))}

      <h2 className="mt-5 text-xl font-bold">Precios claros</h2>
      {Object.values(T).map(t=>(
        <div key={t.n} className="opt">
          <span>{t.n}</span>
          <b className="ml-auto">{R(t.p)}</b>
        </div>
      ))}

      <button className="btn mt-3" onClick={()=>go('login')}>
        Solicitar acompañamiento
      </button>

      <div className="card mt-4 border-slate-200">
        <h3 className="font-semibold text-slate-800">Próximamente</h3>
        <p className="mu mt-1">
          💳 <b>JUNTOS Wallet</b>: recarga US$50/100/200 y paga servicios, farmacia y colmado.<br/>
          🎓 <b>JUNTOS Academia</b>: curso de 40h, RD$8,500, chaleco y Sello JUNTOS.
        </p>
      </div>
    </div>
  )
}

export function Login(){
  const {otp,setOtp,enviarOtp,verificar,msg,live}=useApp()
  const [c,setC]=useState('')
  const [ph,setPh]=useState('+1 809 555 0101')
  const [rol,setRol]=useState('familia')
  const tel=ph.replace(/[^\d+]/g,'')

  return (
    <div className="mx-auto max-w-lg px-4 font-sans">
      <div className="py-3"><Logo/></div>
      <h1 className="text-3xl font-bold tracking-tight">Entra con tu WhatsApp</h1>
      <p className="mu">Sin correo ni contraseñas. Te mandamos un código.</p>

      {otp ? (
        <>
          <label className="lbl">Código de 6 dígitos</label>
          <input 
            className="inp text-center tracking-widest text-lg font-bold" 
            inputMode="numeric" 
            maxLength={6} 
            value={c} 
            onChange={e=>setC(e.target.value)} 
            placeholder="123456"
          />
          {!live&&<p className="mu">Demo: usa 123456</p>}
          <button className="btn" onClick={()=>verificar(tel,c)}>Verificar y entrar</button>
          <button className="btn btn-g" onClick={()=>setOtp(false)}>Cambiar número</button>
        </>
      ) : (
        <>
          <label className="lbl">Número de WhatsApp</label>
          <input className="inp" type="tel" value={ph} onChange={e=>setPh(e.target.value)}/>
          <label className="lbl">¿Desde dónde solicitas?</label>
          <div className={'opt '+(rol==='familia'?'on':'')} onClick={()=>setRol('familia')}>
            🇩🇴 Vivo en República Dominicana
          </div>
          <div className={'opt '+(rol==='diaspora'?'on':'')} onClick={()=>setRol('diaspora')}>
            ✈️ Vivo fuera (USA, España…)
          </div>
          <button className="btn" onClick={()=>enviarOtp(tel,rol)}>Enviarme el código</button>
        </>
      )}

      {msg&&<div className="fixed bottom-6 left-1/2 -translate-x-1/2 rounded-2xl bg-slate-900 px-4 py-2.5 text-sm text-white shadow-xl">{msg}</div>}
    </div>
  )
}
