import * as T from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js'
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js'
import { Pass } from 'three/addons/postprocessing/Pass.js'
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js'
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js'
import { makeSky } from './sky'
import { random } from './random'
import { makeTree, startY } from './tree'
import { makeGallery } from './gallery'

const TAU=Math.PI*2
const fit=(a,b,speed,dt)=>T.MathUtils.damp(a,b,speed,dt)

class WorldPass extends Pass {
  constructor(sky, scene, camera) {
    super()
    this.sky=sky
    this.scene=scene
    this.camera=camera
    this.needsSwap=false
  }
  render(renderer, writeBuffer, readBuffer) {
    renderer.setRenderTarget(this.renderToScreen?null:readBuffer)
    renderer.clear()
    renderer.render(this.sky.scene,this.sky.camera)
    renderer.clearDepth()
    renderer.render(this.scene,this.camera)
  }
}

function ground() {
  const group=new T.Group()
  const canvas=document.createElement('canvas')
  canvas.width=canvas.height=256
  const ctx=canvas.getContext('2d')
  const gradient=ctx.createRadialGradient(128,128,10,128,128,128)
  gradient.addColorStop(0,'rgba(255,172,85,.49)')
  gradient.addColorStop(.22,'rgba(219,140,75,.36)')
  gradient.addColorStop(.49,'rgba(144,103,78,.28)')
  gradient.addColorStop(.73,'rgba(114,103,92,.1)')
  gradient.addColorStop(1,'rgba(20,20,20,0)')
  ctx.fillStyle=gradient
  ctx.fillRect(0,0,256,256)
  const rng=random(1818)
  for(let i=0;i<4300;i++){
    const a=rng()*TAU,r=Math.sqrt(rng())*124,s=.2+rng()*1.75
    ctx.fillStyle=i%5?'rgba(255,224,163,'+((1-r/124)*.29)+')':'rgba(10,25,46,'+((1-r/124)*.24)+')'
    ctx.fillRect(128+Math.cos(a)*r,128+Math.sin(a)*r,s,s*.83)
  }
  const map=new T.CanvasTexture(canvas)
  map.colorSpace=T.SRGBColorSpace
  const glow=new T.Mesh(new T.PlaneGeometry(26,22),new T.MeshBasicMaterial({map,transparent:true,depthWrite:false,toneMapped:false}))
  glow.rotation.x=-Math.PI/2
  glow.position.y=startY-.42
  glow.renderOrder=-4
  group.add(glow)
  const ringMaterial=new T.MeshBasicMaterial({color:'#ebb278',transparent:true,opacity:.22,depthWrite:false,toneMapped:false,side:T.DoubleSide})
  const ring=new T.Mesh(new T.RingGeometry(6.51,6.55,128),ringMaterial)
  ring.rotation.x=-Math.PI/2
  ring.position.y=startY-.405
  ring.renderOrder=-3
  group.add(ring)
  return { group,ringMaterial }
}

const snowVertex=`
  uniform float time; uniform float pixels;
  attribute float seed; attribute float size;
  varying float vAlpha;
  void main(){
    vec3 p=position;
    p.y=mod(p.y-time*(.36+seed*.77)+32.,28.)-10.;
    p.x+=sin(time*.5+seed*37.+p.y*.32)*(.38+seed*.5);
    p.z+=cos(time*.39+seed*41.)*.53;
    vec4 mv=modelViewMatrix*vec4(p,1.);
    vAlpha=smoothstep(3.,11.,-mv.z)*(.24+seed*.61)*smoothstep(-9.5,-6.,p.y);
    gl_PointSize=clamp(size*pixels*38./max(2.,-mv.z),1.,12.);
    gl_Position=projectionMatrix*mv;
  }
`
const snowFragment=`
  varying float vAlpha;
  void main(){
    float r=length(gl_PointCoord-.5);
    float a=(1.-smoothstep(.07,.48,r))*vAlpha;
    if(a<.018)discard;
    gl_FragColor=vec4(.63,.81,1.,a);
    #include <colorspace_fragment>
  }
`

function snowfall(lite) {
  const rng=random(4817), points=[], sizes=[], seeds=[]
  for(let i=0;i<(lite?400:1400);i++){
    const angle=rng()*TAU,r=Math.sqrt(rng())*30
    points.push(Math.cos(angle)*r,rng()*28,Math.sin(angle)*r)
    sizes.push(.85+Math.pow(rng(),4)*4.3)
    seeds.push(rng())
  }
  const geo=new T.BufferGeometry()
  geo.setAttribute('position',new T.Float32BufferAttribute(points,3))
  geo.setAttribute('seed',new T.Float32BufferAttribute(seeds,1))
  geo.setAttribute('size',new T.Float32BufferAttribute(sizes,1))
  const snow=new T.Points(geo,new T.ShaderMaterial({ uniforms:{time:{value:0},pixels:{value:1}},
    vertexShader:snowVertex,fragmentShader:snowFragment,transparent:true,depthWrite:false,toneMapped:false }))
  snow.frustumCulled=false
  return snow
}

export function createWorld(element, options) {
  const { lite, config, hand, audio, onStatus }=options
  const reduce=window.matchMedia('(prefers-reduced-motion: reduce)').matches
  const renderer=new T.WebGLRenderer({alpha:false,antialias:lite,powerPreference:'high-performance', preserveDrawingBuffer:false})
  renderer.autoClear=false
  renderer.toneMapping=T.ACESFilmicToneMapping
  renderer.toneMappingExposure=1.12
  renderer.domElement.setAttribute('role','img')
  renderer.domElement.setAttribute('aria-label','极光与星雪中的三维圣诞树，拖动旋转，滚动缩放')
  element.append(renderer.domElement)
  const scene=new T.Scene()
  scene.fog=new T.Fog('#142b3b',37,72)
  const camera=new T.PerspectiveCamera(40,1,.3,150)
  let initialPosition=false
  const controls=new OrbitControls(camera,renderer.domElement)
  controls.enablePan=false
  controls.enableDamping=!reduce
  controls.dampingFactor=.085
  controls.minDistance=8
  controls.maxDistance=45
  controls.minPolarAngle=.55
  controls.maxPolarAngle=Math.PI*.55
  controls.target.set(0,.74,0)
  const sky=makeSky(lite)
  const tree=makeTree(lite,config)
  const gallery=makeGallery(reduce,renderer)
  tree.root.add(gallery.root)
  const snow=snowfall(lite)
  const field=ground()
  scene.add(tree.root,snow,field.group)
  scene.add(new T.HemisphereLight('#b0e2f4','#323b36',1.23))
  const cool=new T.DirectionalLight('#a0dfff',1.92)
  cool.position.set(-8,6,-6)
  const warm=new T.DirectionalLight('#ffe1a6',1.90)
  warm.position.set(6,5,9)
  const rim=new T.DirectionalLight('#69cba3',.77)
  rim.position.set(-6,3,7)
  scene.add(cool,warm,rim)
  const generator=new T.PMREMGenerator(renderer)
  const studio=new RoomEnvironment()
  const environment=generator.fromScene(studio,.032)
  scene.environment=environment.texture
  scene.environmentIntensity=.39
  studio.dispose()
  generator.dispose()
  const worldPass=new WorldPass(sky,scene,camera)
  const composer=lite?null:new EffectComposer(renderer)
  const bloom=lite?null:new UnrealBloomPass(new T.Vector2(1,1),.31,.49,.59)
  const output=lite?null:new OutputPass()
  if(composer) {
    composer.addPass(worldPass)
    composer.addPass(bloom)
    composer.addPass(output)
  }
  let mode='tree', frameId=0, prev=null, time=0, spread=0, floating=0, level=0, pixels=1, burstWidth=1, status='', disposed=false
  const mouse={x:0,y:0,active:false,pinch:false}
  let activePointer=null
  const surface=renderer.domElement
  function coordinates(event) {
    const rect=surface.getBoundingClientRect()
    if(!rect.width || !rect.height)return
    mouse.x=(event.clientX-rect.left)/rect.width*2-1
    mouse.y=1-(event.clientY-rect.top)/rect.height*2
    mouse.active=event.clientX>=rect.left && event.clientX<=rect.right && event.clientY>=rect.top && event.clientY<=rect.bottom
  }
  const down=event=>{
    if(event.button!==0 || activePointer!==null)return
    activePointer=event.pointerId
    coordinates(event)
    if(event.pointerType==='touch' && gallery.tap(camera,mouse.x,mouse.y)) {
      mouse.active=false
      return
    }
    mouse.pinch=true
  }
  const up=event=>{
    if(event.pointerId!==activePointer)return
    activePointer=null
    mouse.pinch=false
    if(event.pointerType==='touch' || event.type==='pointercancel')mouse.active=false
  }
  const leave=()=>{ mouse.active=false }
  const blur=()=>{ activePointer=null; mouse.active=false; mouse.pinch=false }
  surface.addEventListener('pointermove',coordinates)
  surface.addEventListener('pointerleave',leave)
  surface.addEventListener('pointerdown',down)
  window.addEventListener('pointerup',up)
  window.addEventListener('pointercancel',up)
  window.addEventListener('blur',blur)
  function resize() {
    const w=element.clientWidth,h=element.clientHeight
    if(!w||!h)return
    const mobile=w<760, ratio=w/h
    burstWidth=T.MathUtils.clamp(ratio*.81,.43,1)
    pixels=Math.min(lite?1:1.45,window.devicePixelRatio||1)
    renderer.setPixelRatio(pixels)
    renderer.setSize(w,h,false)
    if(composer){composer.setPixelRatio(pixels);composer.setSize(w,h)}
    sky.resize(w,h)
    camera.aspect=ratio
    scene.fog.near=mobile?45:37
    if(!initialPosition) {
      camera.position.set(0,3.45,mobile?Math.min(44,Math.max(40,19.7/ratio)):29.5)
      camera.lookAt(controls.target)
      initialPosition=true
    }
    camera.setViewOffset(w,h,mobile?0:-w*.083,mobile?h*.095:-h*.005,w,h)
    camera.updateProjectionMatrix()
    controls.update()
  }
  const observer=new ResizeObserver(resize)
  observer.observe(element)
  resize()

  function tick(now) {
    if(disposed)return
    frameId=requestAnimationFrame(tick)
    const dt=prev===null?1/60:Math.min(.14,Math.max(0,(now-prev)/1000))
    prev=now
    if(!reduce)time+=dt
    controls.update()
    const current=hand.current
    const control=current.present && !mouse.pinch
      ? {x:current.x*2-1,y:1-current.y*2,active:current.gesture!=='fist',pinch:current.gesture==='pinch',hand:true}
      : mouse
    const handBurst=current.present && (current.gesture==='pinch'||current.gesture==='open')
    const burst=mouse.pinch || handBurst
    spread=fit(spread,burst?1:0,burst?7.6:5.9,dt)
    if(burst && spread>.999)spread=1
    if(!burst && spread<.0007)spread=0
    floating=fit(floating,mode==='float'?1:0,2.8,dt)
    level=fit(level,audio.current,6,dt)
    tree.frame({time,dt,spread,burstWidth,floating,audio:level,pixels,reduce})
    snow.material.uniforms.time.value=time
    snow.material.uniforms.pixels.value=pixels
    sky.uniforms.time.value=time
    field.ringMaterial.opacity=.18+Math.sin(time*.8)*.045
    const hovered=gallery.frame(camera,control,time,dt,tree.root.rotation.y)
    const next=burst?'burst':hovered?'hover':'idle'
    if(next!==status){status=next;onStatus(next);surface.style.cursor=burst?'grabbing':hovered?'pointer':'grab'}
    if(composer)composer.render(dt)
    else {worldPass.renderToScreen=true;worldPass.render(renderer,null,null)}
  }
  frameId=requestAnimationFrame(tick)
  return {
    config: tree.update,
    photos: gallery.update,
    setMode(next){ mode=next },
    dispose(){
      disposed=true
      cancelAnimationFrame(frameId)
      observer.disconnect()
      controls.dispose()
      surface.removeEventListener('pointermove',coordinates)
      surface.removeEventListener('pointerleave',leave)
      surface.removeEventListener('pointerdown',down)
      window.removeEventListener('pointerup',up)
      window.removeEventListener('pointercancel',up)
      window.removeEventListener('blur',blur)
      gallery.dispose()
      sky.dispose()
      environment.dispose()
      scene.traverse(object=>{
        object.geometry?.dispose()
        object.material?.map?.dispose()
        object.material?.dispose()
      })
      bloom?.dispose()
      output?.dispose()
      composer?.dispose()
      renderer.dispose()
      surface.remove()
    },
  }
}
