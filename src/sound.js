import { useEffect, useRef, useState } from 'react'

export const defaultTrack='https://nobody-r.github.io/christmas-tree/audio/christmas-by-ikson.mp3'
const fallbackTrack=import.meta.env.BASE_URL+'audio/silent-night-music-box.mp3'

export function useSound(level) {
  const element=useRef(null), graph=useRef(null), requested=useRef(true), revision=useRef(0), localUrl=useRef(null)
  const [playing,setPlaying]=useState(false)
  const [blocked,setBlocked]=useState(false)
  const [title,setTitle]=useState('Christmas by Ikson')
  const [failed,setFailed]=useState(false)

  function connect() {
    const AudioContext=window.AudioContext||window.webkitAudioContext
    if(!AudioContext)return
    if(!graph.current) {
      const context=new AudioContext()
      const source=context.createMediaElementSource(element.current)
      const analyser=context.createAnalyser()
      analyser.fftSize=256
      analyser.smoothingTimeConstant=.79
      source.connect(analyser)
      analyser.connect(context.destination)
      graph.current={context,analyser,values:new Uint8Array(analyser.frequencyBinCount)}
    }
    const context=graph.current.context
    if(context.state==='suspended')context.resume().catch(()=>{})
  }
  async function play(interaction=false) {
    const audio=element.current
    if(!audio)return
    const id=++revision.current
    requested.current=true
    if(interaction){try{connect()}catch{}}
    try {
      await audio.play()
      if(id!==revision.current)return
      setBlocked(false)
      setFailed(false)
    } catch(error) {
      if(id!==revision.current)return
      setBlocked(error.name==='NotAllowedError')
      setFailed(error.name==='NotSupportedError')
    }
  }
  function pause() {
    revision.current++
    requested.current=false
    element.current?.pause()
    setBlocked(false)
  }
  function unlock() {
    if(!requested.current || !element.current)return
    if(element.current.paused)play(true)
    else {try{connect()}catch{}}
  }
  function upload(file) {
    if(!file)return
    if(localUrl.current)URL.revokeObjectURL(localUrl.current)
    localUrl.current=URL.createObjectURL(file)
    element.current.src=localUrl.current
    setTitle(file.name)
    setFailed(false)
    play(true)
  }

  useEffect(()=>{
    const audio=element.current
    const start=()=>setPlaying(true)
    const stop=()=>setPlaying(false)
    const error=()=>{
      setPlaying(false)
      if(audio.src===defaultTrack) {
        audio.src=fallbackTrack
        setTitle('Silent Night · Music Box')
        if(requested.current)play()
      }else setFailed(true)
    }
    audio.addEventListener('playing',start)
    audio.addEventListener('pause',stop)
    audio.addEventListener('error',error)
    audio.volume=.58
    play()
    let frame
    function analyse(){
      const chain=graph.current
      if(chain && !audio.paused){
        chain.analyser.getByteFrequencyData(chain.values)
        let sum=0
        for(let i=1;i<chain.values.length;i++)sum+=chain.values[i]
        level.current=Math.min(1,sum/((chain.values.length-1)*72))
      }else level.current=0
      frame=requestAnimationFrame(analyse)
    }
    frame=requestAnimationFrame(analyse)
    return ()=>{
      revision.current++
      audio.pause()
      audio.removeEventListener('playing',start)
      audio.removeEventListener('pause',stop)
      audio.removeEventListener('error',error)
      cancelAnimationFrame(frame)
      graph.current?.context.close().catch(()=>{})
      if(localUrl.current)URL.revokeObjectURL(localUrl.current)
    }
  },[level])

  return {element,playing,blocked,title,failed,upload,unlock,toggle:()=>playing?pause():play(true)}
}
