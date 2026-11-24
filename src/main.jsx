import { useEffect, useId, useRef, useState } from 'react'
import { createRoot } from 'react-dom/client'
import {
  Aperture, ArrowUpRight, ChevronRight, CircleHelp, Hand, ImagePlus, Images, Mouse,
  Music2, Pause, PenLine, Play, Settings2, Snowflake, Sparkles, Trash2, TreePine, Upload, X,
} from 'lucide-react'
import { dateCountdown, defaultPhotos, localRead, localWrite, photoStorage } from './data'
import { defaultTrack, useSound } from './sound'
import { HandController } from './hand'
import { Intro } from './intro'
import './styles.css'

const lite=new URLSearchParams(location.search).has('lite')
const initialSettings={
  particles:lite?1500:6000,boxes:lite?80:220,bells:lite?80:220,
  primary:'#ffd98a',accent:'#ff5964',box1:'#a02a41',box2:'#2d7561',bellColor:'#f2c14e',
}
const emptyHand={x:.5,y:.5,present:false,gesture:'idle'}
const storageKeys={name:'aurora-noel:name',removed:'ct_removed_defaults'}
let sceneModule
const loadScene=()=>sceneModule??=import('./scene')

function Countdown() {
  const [now,setNow]=useState(()=>new Date())
  useEffect(()=>{
    const timer=setInterval(()=>setNow(new Date()),1000)
    return ()=>clearInterval(timer)
  },[])
  const {festive,values}=dateCountdown(now)
  return <div className="countdown" aria-label="圣诞倒计时">
    <div className="countdown-label"><span/>{festive?'今天是圣诞节':'距离圣诞节'}<span/></div>
    <div className="countdown-digits">
      {values.map((value,index)=><div className="countdown-unit" key={index}>
        <strong>{String(value).padStart(2,'0')}</strong><span>{['天','时','分','秒'][index]}</span>
      </div>)}
    </div>
  </div>
}

function FileButton({ accept, multiple, onFiles, children, className='' }) {
  const input=useRef(null)
  return <>
    <button type="button" className={'secondary '+className} onClick={()=>input.current?.click()}>{children}</button>
    <input tabIndex={-1} hidden type="file" ref={input} accept={accept} multiple={multiple} onChange={event=>{
      onFiles(Array.from(event.target.files??[]))
      event.target.value=''
    }}/>
  </>
}

function Color({label,value,onChange}) {
  return <label className="color-control">
    <span>{label}</span>
    <input type="color" aria-label={label} value={value} onChange={e=>onChange(e.target.value)}/>
  </label>
}
function Range({label,value,min,max,step,onChange}) {
  const id=useId()
  return <div className="range-control">
    <span><label htmlFor={id}>{label}</label><output htmlFor={id}>{value.toLocaleString('zh-CN')}</output></span>
    <input id={id} type="range" min={min} max={max} step={step} value={value} onChange={e=>onChange(Number(e.target.value))}/>
  </div>
}

function Settings({settings,setSettings,mode,setMode,sound}) {
  const set=(key,value)=>setSettings(previous=>({...previous,[key]:value}))
  return <>
    <section className="panel-section">
      <h3>圣诞音乐</h3>
      <div className="track">
        <button type="button" className="track-play" data-sound-toggle aria-label={sound.playing?'暂停音乐':'播放音乐'} onClick={sound.toggle}>
          {sound.playing?<Pause size={17}/>:<Play size={17}/>}
        </button>
        <div className="track-meta"><span>当前曲目</span><strong title={sound.title}>{sound.title}</strong></div>
      </div>
      {sound.failed&&<p className="notice" role="status">曲目无法播放，请试试其他音频文件。</p>}
      <FileButton accept="audio/*" onFiles={files=>sound.upload(files[0])}><Upload size={15}/> 上传本地音乐</FileButton>
    </section>
    <section className="panel-section">
      <h3>展示模式</h3>
      <div className="segmented" aria-label="展示模式">
        <button onClick={()=>setMode('tree')} aria-pressed={mode==='tree'}><TreePine size={15}/> 圣诞树</button>
        <button onClick={()=>setMode('float')} aria-pressed={mode==='float'}><Sparkles size={15}/> 星光漂浮</button>
      </div>
    </section>
    <section className="panel-section">
      <h3>星光粒子</h3>
      <Range label="粒子数量" min={1000} max={10000} step={500} value={settings.particles} onChange={value=>set('particles',value)}/>
      <div className="colors">
        <Color label="主色" value={settings.primary} onChange={value=>set('primary',value)}/>
        <Color label="点缀色" value={settings.accent} onChange={value=>set('accent',value)}/>
      </div>
    </section>
    <section className="panel-section">
      <h3>礼物盒与彩球</h3>
      <Range label="礼物盒数量" min={0} max={600} step={1} value={settings.boxes} onChange={value=>set('boxes',value)}/>
      <Range label="彩球数量" min={0} max={600} step={1} value={settings.bells} onChange={value=>set('bells',value)}/>
      <div className="colors">
        <Color label="礼盒主色" value={settings.box1} onChange={value=>set('box1',value)}/>
        <Color label="礼盒点缀" value={settings.box2} onChange={value=>set('box2',value)}/>
        <Color label="彩球主色" value={settings.bellColor} onChange={value=>set('bellColor',value)}/>
      </div>
    </section>
  </>
}

const titles={settings:'圣诞布置',gallery:'回忆相册',name:'定制名字',help:'操作指南'}
function Panel({kind,close,children}) {
  const ref=useRef(null)
  useEffect(()=>{
    const dialog=ref.current
    if(!dialog.open)dialog.showModal()
    return ()=>{if(dialog.open)dialog.close()}
  },[])
  return <dialog className="panel" ref={ref} aria-labelledby="panel-title"
    onCancel={event=>{event.preventDefault();close()}}
    onClick={event=>{if(event.target===event.currentTarget)close()}}>
    <div className="panel-inner">
      <header className="panel-heading">
        <h2 id="panel-title">{titles[kind]}</h2>
        <button type="button" className="icon-button" aria-label="关闭面板" onClick={close}><X size={19}/></button>
      </header>
      <div className="panel-content">{children}</div>
    </div>
  </dialog>
}

function NameForm({name,save}) {
  const [draft,setDraft]=useState(name)
  const field=useRef(null)
  useEffect(()=>{field.current?.focus()},[])
  return <form className="name-form" onSubmit={event=>{event.preventDefault();save(draft.trim().replace(/\s+/g,' '))}}>
    <label htmlFor="greeting-name">想把祝福送给谁？</label>
    <input ref={field} id="greeting-name" value={draft} onChange={event=>setDraft(event.target.value)}
      maxLength={24} placeholder="输入名字" autoComplete="off"/>
    <p className="name-preview">{draft.trim()||'你的名字'}，圣诞快乐！</p>
    <div className="name-actions">
      {name&&<button type="button" className="secondary" onClick={()=>save('')}>清除名字</button>}
      <button type="submit" className="primary">保存祝福 <ChevronRight size={16}/></button>
    </div>
  </form>
}

function Gallery({items,upload,remove,notice}) {
  return <div className="gallery-panel">
    <p>添加照片后，相框会出现在树旁。照片仅保存在当前浏览器。</p>
    <FileButton accept="image/jpeg,image/png,image/webp" multiple onFiles={upload}><ImagePlus size={16}/> 上传照片</FileButton>
    {notice&&<p className="notice" role="status">{notice}</p>}
    <div className="gallery-grid">
      {items.map(item=><figure className="gallery-tile" key={item.id}>
        <img src={item.url} alt={item.name} loading="lazy"/>
        <button type="button" className="remove-photo" aria-label={'删除 '+item.name} onClick={()=>remove(item)}><Trash2 size={15}/></button>
      </figure>)}
    </div>
    {!items.length&&<p className="gallery-empty">相册里还没有照片。</p>}
  </div>
}

function Help() {
  return <div className="help-list">
    <p><Mouse size={19}/><span><strong>旋转和缩放</strong>拖动画面旋转，滚轮或双指缩放。</span></p>
    <p><Sparkles size={19}/><span><strong>星光绽放</strong>按住画面让星光散开，松手后回到树上。</span></p>
    <p><Images size={19}/><span><strong>查看照片</strong>悬停或轻点相框可翻转拉近。用拇指和食指捏合可抓住照片，分开手指可放回。</span></p>
    <p><Hand size={19}/><span><strong>手势控制</strong>开启摄像头后，用食指移动光标，张开手掌或捏合绽放星光。</span></p>
  </div>
}

function App() {
  const [intro,setIntro]=useState(true)
  const [revealing,setRevealing]=useState(false)
  const [name,setName]=useState(()=>localRead(storageKeys.name,''))
  const [panel,setPanel]=useState(null)
  const [mode,setMode]=useState('tree')
  const [settings,setSettings]=useState(initialSettings)
  const [tracking,setTracking]=useState(false)
  const [cameraStatus,setCameraStatus]=useState('off')
  const [status,setStatus]=useState('idle')
  const [error,setError]=useState(false)
  const [defaults]=useState(defaultPhotos)
  const [removed,setRemoved]=useState(()=>localRead(storageKeys.removed,[]))
  const [uploads,setUploads]=useState([])
  const [notice,setNotice]=useState('')
  const view=useRef(null), world=useRef(null), hand=useRef(emptyHand), audio=useRef(0), photoUrls=useRef(new Set())
  const sound=useSound(audio)
  const photos=[...defaults.filter(item=>!removed.includes(item.id)),...uploads]
  const sceneSettings=useRef(null)
  sceneSettings.current={settings,photos,mode}

  useEffect(()=>{loadScene().catch(()=>{})},[])

  useEffect(()=>{
    let cancelled=false
    photoStorage('getAll').then(items=>{
      if(cancelled)return
      setUploads(items.map(item=>{
        const url=URL.createObjectURL(item.blob)
        photoUrls.current.add(url)
        return {...item,url}
      }))
    }).catch(()=>{})
    return ()=>{
      cancelled=true
      for(const url of photoUrls.current)URL.revokeObjectURL(url)
      photoUrls.current.clear()
    }
  },[])

  useEffect(()=>{
    if(!revealing)return
    let cancelled=false
    loadScene().then(({createWorld})=>{
      if(cancelled)return
      const latest=sceneSettings.current
      world.current=createWorld(view.current,{lite,config:latest.settings,hand,audio,onStatus:setStatus})
      world.current.photos(latest.photos)
      world.current.setMode(latest.mode)
    }).catch(error=>{
      if(cancelled)return
      console.error(error)
      setError(true)
    })
    return ()=>{cancelled=true;world.current?.dispose();world.current=null}
  },[revealing])
  useEffect(()=>{world.current?.config(settings)},[settings])
  useEffect(()=>{world.current?.setMode(mode)},[mode])
  useEffect(()=>{world.current?.photos(photos)},[defaults,removed,uploads])

  async function uploadPhotos(files) {
    const valid=files.filter(file=>['image/jpeg','image/png','image/webp'].includes(file.type)
      ||(!file.type&&/\.(jpe?g|png|webp)$/i.test(file.name)))
    if(!valid.length){if(files.length)setNotice('请选择 JPG、PNG 或 WEBP 格式的照片。');return}
    const results=await Promise.all(valid.map(async file=>{
      const preview=URL.createObjectURL(file)
      try{
        const image=new Image()
        image.src=preview
        await image.decode()
      }catch{
        URL.revokeObjectURL(preview)
        return null
      }
      const record={id:crypto.randomUUID?.()??Date.now()+'-'+Math.random().toString(36).slice(2),name:file.name,blob:file}
      let persisted=true
      try{await photoStorage('put',record)}catch{persisted=false}
      photoUrls.current.add(preview)
      return {...record,url:preview,persisted}
    }))
    const pictures=results.filter(Boolean)
    setUploads(current=>[...current,...pictures])
    setNotice(pictures.length!==files.length?'部分文件无法作为照片读取。':pictures.some(item=>!item.persisted)?'浏览器未能保存部分照片，刷新后可能丢失。':'')
  }
  async function deletePhoto(item) {
    if(item.default) {
      setRemoved(current=>{
        const next=[...current,item.id]
        localWrite(storageKeys.removed,next)
        return next
      })
      return
    }
    if(item.persisted!==false) {
      try{await photoStorage('delete',item.id)}
      catch{setNotice('照片未能删除，请重试。');return}
    }
    setUploads(current=>current.filter(photo=>photo.id!==item.id))
    photoUrls.current.delete(item.url)
    URL.revokeObjectURL(item.url)
  }
  function saveName(value) {
    setName(value)
    localWrite(storageKeys.name,value)
    setPanel(null)
  }
  function toggleHand() {
    setCameraStatus(tracking?'off':'loading')
    setTracking(!tracking)
  }
  const gestureLabel={idle:'静待星光',burst:'绽放',hover:'悬停'}[status]
  return <div className="app" data-lite={lite} onPointerDownCapture={event=>{
    if(!event.target.closest('[data-sound-toggle]'))sound.unlock()
  }}>
    <audio ref={sound.element} src={defaultTrack} crossOrigin="anonymous" preload="auto" loop/>
    <div className="world" ref={view}/>
    {revealing&&<>
      <div className="scene-shade" aria-hidden="true"/>
      <header className="topbar">
        <div className="brand"><div className="brand-icon"><Snowflake size={23} strokeWidth={1.35}/></div><span>Aurora <em>Noël</em></span></div>
        <div className="header-actions">
          <div className="status" data-active={status!=='idle'} aria-live="polite">
            <span className="status-dot"/><span>{mode==='tree'?'圣诞树':'星光漂浮'}</span><i/><span>{gestureLabel}</span>{lite&&<small>LITE</small>}
          </div>
          <button type="button" className="icon-button music-toggle" data-sound-toggle aria-label={sound.playing?'暂停音乐':'播放音乐'}
            title={sound.playing?'暂停音乐':'播放音乐'} onClick={sound.toggle} aria-pressed={sound.playing}>
            {sound.playing?<Pause size={17}/>:<Music2 size={19}/>}
          </button>
        </div>
      </header>
      <main className="hero">
        <div className="hero-copy">
          <h1 lang="en">Merry <em>Christmas</em></h1>
          {!name&&<p className="hero-wish">愿今夜的星光，落在你身旁。</p>}
          <div className="hero-actions">
            <Countdown/>
            <button type="button" className="name-button" onClick={()=>setPanel('name')}>
              <PenLine size={13}/>{name?'编辑名字':'定制名字'}<ArrowUpRight size={12} className="name-arrow"/>
            </button>
          </div>
          {name&&<p className="hero-wish is-personal"><strong>{name}</strong>，圣诞快乐！</p>}
        </div>
      </main>
      <nav className="dock" aria-label="场景工具">
        <button onClick={()=>setPanel('settings')}><Settings2 size={20}/><span>圣诞布置</span></button>
        <button onClick={()=>setPanel('gallery')}><Images size={20}/><span>回忆相册</span></button>
        <button onClick={toggleHand} aria-pressed={tracking} data-camera={cameraStatus}>
          <Hand size={20}/><span>手势控制</span>
        </button>
      </nav>
      <footer className="footer">
        <div className="quick-hints">
          <span><Mouse size={15}/><span className="mouse-text">拖动旋转 · 滚轮缩放</span><span className="touch-text">拖动旋转 · 双指缩放</span></span>
          <i/>
          <span><Sparkles size={15}/>按住绽放</span>
        </div>
        <button className="help-button" onClick={()=>setPanel('help')}><CircleHelp size={17}/><span>操作指南</span></button>
      </footer>
      {tracking&&<HandController currentHand={hand} onStatus={setCameraStatus}/>}
      {error&&<div className="world-error" role="alert"><Aperture size={21}/> 当前设备无法打开 3D 场景。请检查浏览器的 WebGL 支持。<a href="?lite">试用轻量模式</a></div>}
      {panel&&<Panel key={panel} kind={panel} close={()=>setPanel(null)}>
        {panel==='settings'&&<Settings settings={settings} setSettings={setSettings} mode={mode} setMode={setMode} sound={sound}/>}
        {panel==='gallery'&&<Gallery items={photos} upload={uploadPhotos} remove={deletePhoto} notice={notice}/>}
        {panel==='name'&&<NameForm name={name} save={saveName}/>}
        {panel==='help'&&<Help/>}
      </Panel>}
    </>}
    {intro&&<Intro name={name} blocked={sound.blocked} onUnlock={sound.unlock} onReveal={()=>setRevealing(true)} onFinish={()=>setIntro(false)}/>} 
  </div>
}
createRoot(document.getElementById('root')).render(<App/>)
