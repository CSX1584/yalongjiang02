import * as T from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {RoomEnvironment} from 'three/addons/environments/RoomEnvironment.js';
import {buildAnatomy,buildMasterplan} from './precision-models.js?v=5';
const ease=t=>t*t*t*(t*(t*6-15)+10);
let instance=0;
export function createPrecisionScene(initialHost,initialOptions){
 let host=initialHost,opt={...initialOptions},mode=opt.mode,dead=false,suspended=false,flight=null,halfHeight=6,aspect=1,lastTime=performance.now(),explosion=0;
 const colors={active:new T.Color(0xe96636),shaft:new T.Color(0x6c7672),body:new T.Color(0x40494a),activeLine:new T.Color(0xffb086),line:new T.Color(0xbac5bc)};
 const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
 const renderer=new T.WebGLRenderer({antialias:true,alpha:true,powerPreference:'high-performance'});
 renderer.setPixelRatio(Math.min(devicePixelRatio,1.7));renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.PCFSoftShadowMap;
 renderer.outputColorSpace=T.SRGBColorSpace;renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.12;
 const canvas=renderer.domElement;canvas.style.width='100%';canvas.style.height='100%';canvas.style.display='block';Object.assign(canvas.dataset,{sceneId:'precision-'+(++instance),engine:'anatomy-v5',projection:'orthographic',scanEnabled:'false',scan:'0.00'});canvas.setAttribute('aria-label','可旋转的三维结构图');host.appendChild(canvas);
 const world=new T.Scene(),camera=new T.OrthographicCamera(-10,10,10,-10,.05,250);
 const controls=new OrbitControls(camera,canvas);controls.enableDamping=true;controls.dampingFactor=.09;controls.minPolarAngle=.15;controls.maxPolarAngle=Math.PI*.49;controls.minZoom=.5;controls.maxZoom=4;
 const pmrem=new T.PMREMGenerator(renderer),env=new RoomEnvironment(),envTarget=pmrem.fromScene(env,.025);world.environment=envTarget.texture;world.environmentIntensity=.48;env.dispose();pmrem.dispose();
 const ambient=new T.HemisphereLight(0xffffff,0x737b73,1.1);world.add(ambient);
 const sun=new T.DirectionalLight(0xfffcf0,3.2);sun.position.set(-24,16,13);sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);sun.shadow.camera.left=-28;sun.shadow.camera.right=28;sun.shadow.camera.top=28;sun.shadow.camera.bottom=-28;sun.shadow.camera.near=.5;sun.shadow.camera.far=100;sun.shadow.normalBias=.035;sun.shadow.bias=-.0002;sun.shadow.radius=2;world.add(sun);
 const rim=new T.DirectionalLight(0xf1f5ff,1.2);rim.position.set(14,9,-10);world.add(rim);
 const plan=buildMasterplan(),anatomy=buildAnatomy();world.add(plan.root,anatomy.root);
 const labels=document.createElement('div');labels.className='scene-labels precision-labels';host.appendChild(labels);
 const ray=new T.Raycaster(),pointer=new T.Vector2(),projected=new T.Vector3();let down=null;
 const onDown=e=>{down={x:e.clientX,y:e.clientY}};
 const onUp=e=>{if(!down||Math.hypot(e.clientX-down.x,e.clientY-down.y)>5)return;down=null;const rect=canvas.getBoundingClientRect();pointer.set((e.clientX-rect.left)/rect.width*2-1,-(e.clientY-rect.top)/rect.height*2+1);ray.setFromCamera(pointer,camera);const list=mode==='map'?plan.pickables:anatomy.pickables;const hit=ray.intersectObjects(list,false).find(h=>mode==='map'||!opt.focusedPart||h.object.userData.id===opt.focusedPart);if(hit){const id=hit.object.userData.id;if(mode==='map'||['bearing','cooler','rotor'].includes(id))opt.onSelect?.(id);}};
 canvas.addEventListener('pointerdown',onDown);canvas.addEventListener('pointerup',onUp);controls.addEventListener('start',()=>{flight=null;canvas.dataset.motion='manual'});
 function frustum(){camera.left=-halfHeight*aspect;camera.right=halfHeight*aspect;camera.top=halfHeight;camera.bottom=-halfHeight;camera.updateProjectionMatrix();}
 function measure(){if(!host||suspended)return;const {width,height}=host.getBoundingClientRect();if(width<2||height<2)return;const resized=Math.abs(aspect-width/height)>.01;aspect=width/height;if(resized){halfHeight=pose().height;if(flight)flight.heightTo=halfHeight;}renderer.setSize(width,height,false);frustum();}
 const observer=new ResizeObserver(measure);observer.observe(host);
 function pose(){
  if(mode==='map'){const point=opt.focus?plan.stationPositions.get(opt.focus):null;return {target:point?point.clone():new T.Vector3(-1,0,0),offset:new T.Vector3(26,34,31),height:point?Math.max(6,6/aspect):Math.max(15.4,19/aspect)};}
  const focus=opt.focusedPart,dy=opt.exploded?anatomy.parts[focus]?.userData.offset||0:0;
  if(focus==='bearing')return {target:new T.Vector3(.15,6.3+dy,0),offset:new T.Vector3(8,5,15),height:Math.max(1.73,2.5/aspect)};
  if(focus==='cooler')return {target:new T.Vector3(2.75,4, -.45),offset:new T.Vector3(7,4,16),height:Math.max(3.23,2.9/aspect)};
  if(focus==='rotor')return {target:new T.Vector3(0,3.7+dy,0),offset:new T.Vector3(9,5,16),height:Math.max(2.65,3.5/aspect)};
  return {target:new T.Vector3(.65,opt.exploded?4.8:4.3,0),offset:new T.Vector3(9,5.5,17),height:Math.max(opt.exploded?6.25:5.15,4.4/aspect)};
 }
 function navigate(instant=false){const p=pose(),to=p.target.clone().add(p.offset);camera.zoom=1;if(instant||reduced){camera.position.copy(to);controls.target.copy(p.target);halfHeight=p.height;flight=null;frustum();controls.update();canvas.dataset.motion='idle';}else{flight={start:performance.now(),position:camera.position.clone(),target:controls.target.clone(),height:halfHeight,to,targetTo:p.target,heightTo:p.height};canvas.dataset.motion='focusing';}}
 function rebuildLabels(){labels.innerHTML='';const source=mode==='map'?plan.anchors:anatomy.anchors;
  for(const a of source){const el=document.createElement('button');el.className=mode==='map'?'plan-label':'anatomy-label';el.type='button';el.dataset.object=a.id;el.setAttribute('aria-label',mode==='map'?'定位'+a.name:'定位'+a.name);el.innerHTML=mode==='map'?`<span>${a.name}</span>${a.id==='guandi'&&!opt.closed?'<i></i>':''}`:`<span>${a.name}</span><small>${a.id==='bearing'?(opt.closed?'64.2':'78.6')+'°C':a.id==='cooler'?'F-302':'UNIT 03'}</small>`;el.addEventListener('click',()=>opt.onSelect?.(a.id));labels.appendChild(el);a.el=el;}
 }
 function sync(previousMode){const map=mode==='map';plan.root.visible=map;anatomy.root.visible=!map;world.background=map?new T.Color(0xaeb1ae):null;renderer.setClearColor(map?0xaeb1ae:0x161a1b,map?1:0);sun.castShadow=map;sun.intensity=map?3:1.8;ambient.intensity=map?.3:.95;world.environmentIntensity=map?.25:.48;renderer.toneMappingExposure=map?.97:1.12;controls.maxPolarAngle=map?Math.PI*.48:Math.PI*.85;
  Object.assign(canvas.dataset,{mode,focusPart:opt.focusedPart||'whole',visualization:opt.deviceMode||'cutaway',sceneKind:map?'planar-masterplan':'sectioned-generator'});
  for(const a of plan.anchors){a.pin.material=a.id===opt.selected?plan.materials.selected:plan.materials.sphere;a.cross.visible=a.id!==opt.selected;}
  rebuildLabels();measure();navigate(previousMode!==mode);
 }
 function updateMaterials(dt){const focus=opt.focusedPart,wire=opt.deviceMode==='wireframe';for(const entry of anatomy.materials){const {id,kind,mat,lineMat}=entry,active=focus?id===focus:id==='bearing'&&!opt.closed,ghost=!!focus&&id!==focus;
   const alpha=ghost?0:wire?(active?.06:0):active?(kind==='shell'?.18:.98):kind==='shell'?.045:.96;
   const lineAlpha=ghost?(kind==='winding'?.018:.065):active?.8:wire?(kind==='winding'?.38:.62):kind==='shell'?.24:.42;
   mat.opacity=T.MathUtils.damp(mat.opacity,alpha,10,dt);mat.depthWrite=!ghost&&!wire&&kind!=='shell';lineMat.opacity=T.MathUtils.damp(lineMat.opacity,lineAlpha,10,dt);
   mat.color.lerp(active?colors.active:kind==='shaft'?colors.shaft:colors.body,1-Math.exp(-dt*10));lineMat.color.lerp(active?colors.activeLine:colors.line,1-Math.exp(-dt*10));
  }}
 function positionLabels(){const source=mode==='map'?plan.anchors:anatomy.anchors,w=canvas.clientWidth,h=canvas.clientHeight;
  for(const a of source){const p=a.position.clone();if(mode==='device')p.y+=anatomy.parts[a.id].position.y;projected.copy(p).project(camera);const visible=projected.z<1&&projected.z>-1&&Math.abs(projected.x)<.94&&Math.abs(projected.y)<.85&&(mode==='map'||!opt.focusedPart||a.id===opt.focusedPart);a.el.style.display=visible?'':'none';a.el.style.left=((projected.x+1)*w/2)+'px';a.el.style.top=((-projected.y+1)*h/2)+'px';a.el.classList.toggle('selected',mode==='map'?a.id===opt.selected:a.id===opt.focusedPart);}
 }
 function frame(now){if(dead)return;requestAnimationFrame(frame);const dt=Math.min((now-lastTime)/1000,.05);lastTime=now;if(suspended||!host||document.hidden)return;
  if(flight){let t=Math.min(1,(now-flight.start)/950),k=ease(t);camera.position.lerpVectors(flight.position,flight.to,k);controls.target.lerpVectors(flight.target,flight.targetTo,k);halfHeight=T.MathUtils.lerp(flight.height,flight.heightTo,k);frustum();if(t===1){flight=null;canvas.dataset.motion='idle';}}
  controls.update();if(mode==='device'){updateMaterials(dt);explosion=reduced?(opt.exploded?1:0):T.MathUtils.damp(explosion,opt.exploded?1:0,7,dt);for(const g of Object.values(anatomy.parts))g.position.y=g.userData.offset*explosion;}else if(!reduced){for(const r of plan.rotors)r.rotation.z+=dt*.23;}
  positionLabels();renderer.render(world,camera);canvas.dataset.camera=halfHeight.toFixed(2);canvas.dataset.ghosted=String(mode==='device'&&!!opt.focusedPart);
 }
 sync(null);navigate(true);requestAnimationFrame(frame);
 return {theme:'precision',detach(){observer.disconnect();canvas.remove();labels.remove();host=null;suspended=true;},attach(nextHost,nextOptions){const oldMode=mode,oldFocus=opt.focusedPart,oldPlanFocus=opt.focus,oldExploded=opt.exploded;host=nextHost;opt={...nextOptions};mode=opt.mode;suspended=false;host.append(canvas,labels);observer.observe(host);if(mode!==oldMode||oldFocus!==opt.focusedPart||oldPlanFocus!==opt.focus||oldExploded!==opt.exploded){sync(oldMode);}else{rebuildLabels();measure();Object.assign(canvas.dataset,{visualization:opt.deviceMode||'cutaway',focusPart:opt.focusedPart||'whole'});} },suspend(){suspended=true;observer.disconnect();},zoom(factor){flight=null;camera.zoom=T.MathUtils.clamp(camera.zoom/factor,.5,4);camera.updateProjectionMatrix();},reset(){opt.focus=null;opt.focusedPart=null;canvas.dataset.focusPart='whole';navigate();},dispose(){dead=true;observer.disconnect();controls.dispose();canvas.removeEventListener('pointerdown',onDown);canvas.removeEventListener('pointerup',onUp);const geometries=new Set(),mats=new Set();world.traverse(o=>{if(o.geometry)geometries.add(o.geometry);if(o.material)(Array.isArray(o.material)?o.material:[o.material]).forEach(m=>mats.add(m));});geometries.forEach(g=>g.dispose());mats.forEach(m=>m.dispose());envTarget.dispose();renderer.dispose();canvas.remove();labels.remove();}};
}
