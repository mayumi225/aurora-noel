import { useEffect, useRef, useState } from 'react'
import { ArrowDown, ArrowRight, ChevronRight, Snowflake, VolumeX } from 'lucide-react'
import { random } from './random'

export function Intro({ name, message='愿今夜的星光，落在你身旁。', blocked, onUnlock, onReveal, onFinish }) {
  const canvasRef=useRef(null)
  const [ready,setReady]=useState(false)
  const [closing,setClosing]=useState(false)
  const timers=useRef([])
  const didClose=useRef(false)
  const callbacks=useRef(null)
  callbacks.current={onUnlock,onReveal,onFinish}
  function finish(skip=false) {
    if(didClose.current)return
    didClose.current=true
    callbacks.current.onUnlock()
    callbacks.current.onReveal()
    const reduce=matchMedia('(prefers-reduced-motion: reduce)').matches
    if(skip||reduce){callbacks.current.onFinish();return}
    setClosing(true)
    timers.current.push(setTimeout(()=>callbacks.current.onFinish(),1300))
  }
  useEffect(()=>{
    const canvas=canvasRef.current, context=canvas.getContext('2d')
    const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches
    let width=0,height=0,scale=1,frame=0
    let pointerX=0,pointerY=0
    const start=performance.now(),rng=random(6196)
    const particles=Array.from({length:268},()=>({
      x:rng(),y:rng(),a:rng(),speed:.15+rng()*.52,phase:rng()*Math.PI*2,
      size:.6+Math.pow(rng(),5)*5.2,glyph:rng()>.87,tint:rng()>.77,
    }))
    function size(){
      width=canvas.clientWidth
      height=canvas.clientHeight
      scale=Math.min(1.65,devicePixelRatio)
      canvas.width=Math.max(1,Math.round(width*scale))
      canvas.height=Math.max(1,Math.round(height*scale))
      context.setTransform(scale,0,0,scale,0,0)
      if(reduced)paint(start)
    }
    function paint(now){
      if(!width||!height)return
      const time=(now-start)/1000
      context.globalCompositeOperation='source-over'
      context.clearRect(0,0,width,height)
      context.globalCompositeOperation='lighter'
      for(const p of particles) {
        const x=p.x*width+pointerX*p.a*20+Math.sin(time*.26+p.phase)*12
        const y=((p.y+time*p.speed*.025)%1)*height+pointerY*p.a*14
        context.fillStyle=p.tint?'#f3c88f':'#b8fff0'
        context.globalAlpha=(.23+p.a*.65)*(.64+.36*Math.sin(time*.77+p.phase))
        if(p.glyph){
          context.font=(5+p.size*2.15)+'px Georgia'
          context.fillText('✦',x,y)
        }else{
          context.beginPath()
          context.arc(x,y,p.size*.55,0,Math.PI*2)
          context.fill()
        }
      }
      context.globalAlpha=1
      if(!reduced)frame=requestAnimationFrame(paint)
    }
    function pointer(event){
      pointerX=event.clientX/innerWidth-.5
      pointerY=event.clientY/innerHeight-.5
    }
    window.addEventListener('resize',size)
    window.addEventListener('pointermove',pointer)
    size()
    if(!reduced)frame=requestAnimationFrame(paint)
    timers.current.push(setTimeout(()=>reduced?finish():setReady(true),reduced?1600:4400))
    return ()=>{
      window.removeEventListener('resize',size)
      window.removeEventListener('pointermove',pointer)
      cancelAnimationFrame(frame)
      timers.current.forEach(clearTimeout)
    }
  },[])

  return <section className={'intro '+(closing?'intro-closing':'')} aria-label="圣诞开场动画"
    onClick={()=>{if(ready)finish()}}>
    <canvas ref={canvasRef} aria-hidden="true"/>
    <div className="intro-brand"><Snowflake size={18}/> AURORA NOËL</div>
    <button className="intro-skip" onClick={event=>{event.stopPropagation();finish(true)}}>跳过 <ChevronRight size={15}/></button>
    <div className="intro-copy">
      <Snowflake className="intro-flake" size={36} strokeWidth={.8} aria-hidden="true"/>
      <h1>天天开心<em>GMT</em></h1>
      <p>{name?name+'，':''}{message}</p>
      <div className="intro-rule"><span>✦</span></div>
    </div>
    <div className="intro-enter">
      {ready&&<button onClick={event=>{event.stopPropagation();finish()}}>
        {blocked?<VolumeX size={17}/>:<ArrowDown size={17}/>}
        {blocked?'点击任意处进入并开启音乐':'点击任意处 · 进入璀璨圣诞树'}<ArrowRight size={16}/>
      </button>}
    </div>
  </section>
}
