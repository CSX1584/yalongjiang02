import * as T from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {ParametricGeometry} from 'three/addons/geometries/ParametricGeometry.js';

// Purpose-built diagram geometry. The open sectors expose the mechanism rather
// than drawing a wire texture over an opaque outer shell.
const TAU=Math.PI*2;
function sector(ro,ri,h,start=1.9,length=4.48,segments=64){
 const positions=[],uvs=[];
 const point=(r,y,a)=>[Math.cos(a)*r,y,Math.sin(a)*r];
 const quad=(a,b,c,d)=>{positions.push(...a,...b,...d,...b,...c,...d);uvs.push(0,0,1,0,0,1,1,0,1,1,0,1)};
 for(let i=0;i<segments;i++){const a=start+length*i/segments,b=start+length*(i+1)/segments;
  quad(point(ro,-h/2,a),point(ro,-h/2,b),point(ro,h/2,b),point(ro,h/2,a));
  quad(point(ri,h/2,a),point(ri,h/2,b),point(ri,-h/2,b),point(ri,-h/2,a));
  quad(point(ri,h/2,a),point(ro,h/2,a),point(ro,h/2,b),point(ri,h/2,b));
  quad(point(ro,-h/2,a),point(ri,-h/2,a),point(ri,-h/2,b),point(ro,-h/2,b));
 }
 for(const a of [start,start+length])quad(point(ri,-h/2,a),point(ro,-h/2,a),point(ro,h/2,a),point(ri,h/2,a));
 const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(positions,3));g.setAttribute('uv',new T.Float32BufferAttribute(uvs,2));g.computeVertexNormals();return g;
}
export function buildAnatomy(){
 const root=new T.Group(),parts={},pickables=[],materials=[],buckets=new Map(),windingLines=[];
 for(const [id,offset] of [['turbine',-.85],['rotor',.35],['bearing',1.35],['crown',2.1],['cooler',0]]){const g=new T.Group();g.userData={id,offset};root.add(g);parts[id]=g;}
 function add(id,geo,x=0,y=0,z=0,rotation=null,kind='body'){
  const m=new T.Matrix4().compose(new T.Vector3(x,y,z),new T.Quaternion().setFromEuler(new T.Euler(...(rotation||[0,0,0]))),new T.Vector3(1,1,1));geo.applyMatrix4(m);
  if(geo.index){const n=geo.toNonIndexed();geo.dispose();geo=n;}geo.deleteAttribute('uv');geo.deleteAttribute('normal');
  const key=id+':'+kind;if(!buckets.has(key))buckets.set(key,[]);buckets.get(key).push(geo);
 }
 const box=(id,w,h,d,x,y,z,kind='body',rot=null)=>add(id,new T.BoxGeometry(w,h,d),x,y,z,rot,kind);
 const cyl=(id,r,h,x,y,z,kind='body',rot=null)=>add(id,new T.CylinderGeometry(r,r,h,40),x,y,z,rot,kind);
 const ring=(id,ro,ri,h,y,kind='body',start=1.9,len=4.48,x=0,z=0)=>add(id,sector(ro,ri,h,start,len),x,y,z,null,kind);
 const pipe=(id,points,r,kind='body')=>{if(kind==='winding')for(let i=1;i<points.length;i++)windingLines.push(...points[i-1],...points[i]);add(id,new T.TubeGeometry(new T.CatmullRomCurve3(points.map(p=>new T.Vector3(...p))),64,r,10,false),0,0,0,null,kind);};
 function bolts(id,r,y,n=20,start=0,len=TAU){for(let i=0;i<n;i++){const a=start+i*len/n;cyl(id,.055,.09,r*Math.cos(a),y,r*Math.sin(a),'detail');}}
 // Foundation, open spiral casing and Francis runner.
 ring('turbine',2.3,1.72,.2,.12,'detail',0,TAU);ring('turbine',2.05,1.45,.22,.38);
 ring('turbine',2.07,1.49,.84,.98);ring('turbine',2.13,1.42,.14,1.46,'detail');bolts('turbine',1.94,1.56,24,1.9,4.48);
 for(let i=0;i<12;i++){const a=i*TAU/12;const blade=new ParametricGeometry((u,v,p)=>{const r=.52+u*.9,angle=a+u*.55+v*.26;p.set(Math.cos(angle)*r,.7+v*.62+u*.16,Math.sin(angle)*r)},10,7);add('turbine',blade,0,0,0,null,'detail');}
 cyl('turbine',.4,1.4,0,.9,0,'detail');ring('turbine',1.35,.4,.12,1.48,'detail',0,TAU);
 for(let i=0;i<8;i++){const a=2.05+i*.51;box('turbine',.16,1.7,.24,2.14*Math.cos(a),1.15,2.14*Math.sin(a),'body',[0,-a,0]);}
 // Stator is open at the front; each winding and the laminated rotor is visible.
 ring('rotor',2.12,1.78,.18,2.25,'detail');ring('rotor',2.12,1.78,.18,5.08,'detail');
 ring('rotor',2.03,1.86,2.64,3.66,'shell');
 for(let i=0;i<18;i++){const a=1.98+i*4.26/17;box('rotor',.11,2.72,.28,1.94*Math.cos(a),3.66,1.94*Math.sin(a),'detail',[0,-a,0]);
  for(let j=0;j<3;j++){const r=1.7-j*.075;const path=[];for(let k=0;k<40;k++){let t=k*TAU/39;const xx=Math.cos(t)*.145,yy=Math.sin(t)*1.13;path.push([Math.cos(a)*r+Math.sin(a)*xx,3.66+yy,Math.sin(a)*r-Math.cos(a)*xx]);}pipe('rotor',path,.024,'winding');}
 }
 for(let i=0;i<19;i++)ring('rotor',1.26,.36,.07,2.46+i*.125,'detail',0,TAU);
 cyl('rotor',.35,4.8,0,3.7,0,'shaft');ring('rotor',1.38,.36,.12,2.4,'detail',0,TAU);ring('rotor',1.38,.36,.12,4.84,'detail',0,TAU);
 for(let i=0;i<12;i++){const a=i*TAU/12;box('rotor',.14,2.35,.16,1.21*Math.cos(a),3.66,1.21*Math.sin(a),'detail',[0,-a,0]);}
 bolts('rotor',2,5.22,30,1.9,4.48);
 // Guide bearing: cut housing, segmented bearing pads and a temperature probe.
 ring('bearing',1.28,.88,.22,5.72,'body');ring('bearing',1.2,1.05,1.04,6.28,'shell');
 ring('bearing',1.3,.88,.16,6.88,'detail');ring('bearing',.95,.77,.86,6.27,'body');
 ring('bearing',.57,.36,1.02,6.27,'detail',0,TAU);
 for(let i=0;i<8;i++){if(i===1||i===2)continue;const a=i*TAU/8;add('bearing',sector(.77,.58,.7,a+.04,TAU/8-.08,10),0,6.27,0,null,'detail');}
 ring('bearing',.81,.56,.06,5.88,'detail',0,TAU);ring('bearing',.81,.56,.06,6.65,'detail',0,TAU);
 bolts('bearing',1.12,7,20,1.9,4.48);cyl('bearing',.35,1.4,0,6.48,0,'shaft');
 box('bearing',.26,.18,.2,.98,6.37,.57,'sensor',[0,-.55,0]);pipe('bearing',[[1.03,6.4,.63],[1.38,6.46,.72],[1.45,7.2,.76]],.025,'sensor');
 // Upper support and shaft coupling, kept separate for exploded viewing.
 ring('crown',1.43,.38,.15,7.39,'detail');ring('crown',.63,.36,.28,7.77,'detail',0,TAU);cyl('crown',.34,1.5,0,7.85,0,'shaft');
 for(let i=0;i<8;i++){const a=i*TAU/8;box('crown',.12,.36,1.08,.82*Math.cos(a),7.28,.82*Math.sin(a),'body',[0,-a+Math.PI/2,0]);cyl('crown',.07,.32,1.28*Math.cos(a),7.61,1.28*Math.sin(a),'detail');}
 // Closed cooling loop, isolation flanges and a sectioned strainer.
 pipe('cooler',[[.91,6.06,-.37],[1.44,6.06,-.7],[2.8,6.06,-.6],[3.04,5.76,-.6],[3.04,2.02,-.6],[2.83,1.72,-.6],[1.7,1.72,-.6]],.115);
 pipe('cooler',[[.78,6.57,-.53],[1.56,6.7,-1.15],[3.67,6.7,-1.15],[3.85,6.45,-1.15],[3.85,1.48,-1.15],[3.63,1.22,-1.15],[1.7,1.22,-1.15]],.115);
 for(const y of [2.05,4.48,5.73]){cyl('cooler',.23,.09,3.04,y,-.6,'detail');cyl('cooler',.23,.09,3.85,y,-1.15,'detail');}
 add('cooler',sector(.42,.35,1.22,1.9,4.48,40),3.04,3.3,-.6,null,'shell');
 for(let i=0;i<9;i++)add('cooler',sector(.25,.2,.025,0,TAU,32),3.04,2.83+i*.115,-.6,null,'detail');
 for(let i=0;i<12;i++){const a=i*TAU/12;box('cooler',.018,1,.018,3.04+.24*Math.cos(a),3.3,-.6+.24*Math.sin(a),'detail');}
 cyl('cooler',.43,.1,3.04,2.64,-.6,'detail');cyl('cooler',.43,.1,3.04,3.96,-.6,'detail');
 pipe('cooler',[[3.04,4.85,-.6],[3.04,4.85,-.18]],.055,'detail');add('cooler',new T.TorusGeometry(.25,.025,8,32),3.04,4.85,-.13,null,'detail');
 for(let i=0;i<4;i++){const a=i*Math.PI/2;box('cooler',.44,.022,.025,3.04,4.85,-.13,'detail',[0,0,a]);}
 for(const [key,geos]of buckets){const [id,kind]=key.split(':'),g=mergeGeometries(geos);geos.forEach(g=>g.dispose());g.computeVertexNormals();
  const mat=new T.MeshStandardMaterial({color:0x9da3a3,roughness:.54,metalness:.28,transparent:true,opacity:.65,side:T.DoubleSide,depthWrite:true});
  const mesh=new T.Mesh(g,mat);mesh.userData={id,kind};parts[id].add(mesh);pickables.push(mesh);
  const lineMat=new T.LineBasicMaterial({color:0xc5cfcb,transparent:true,opacity:.55,depthWrite:false});const edgeGeometry=kind==='winding'?new T.BufferGeometry().setAttribute('position',new T.Float32BufferAttribute(windingLines,3)):new T.EdgesGeometry(g,24);const edges=new T.LineSegments(edgeGeometry,lineMat);edges.renderOrder=3;parts[id].add(edges);
  materials.push({id,kind,mat,lineMat,mesh});
 }
 return {root,parts,pickables,materials,anchors:[{id:'bearing',name:'上导轴承',position:new T.Vector3(1.45,6.45,.76)},{id:'cooler',name:'冷却回路',position:new T.Vector3(3.5,3.3,-.6)},{id:'rotor',name:'发电机',position:new T.Vector3(-1.7,4,1)}]};
}

export function buildMasterplan(){
 const root=new T.Group(),pickables=[],anchors=[],rotors=[],stationPositions=new Map();
 const mat=(color,roughness=.9,metalness=0)=>new T.MeshStandardMaterial({color,roughness,metalness});
 const m={ground:mat(0x747474),region:mat(0x585958),region2:mat(0x878787),water:mat(0xababab),white:mat(0xeeeeeC,.68),roof:mat(0xd6d6d4),dark:mat(0x6f7773),glass:mat(0x919b94,.4,.18),sphere:mat(0x4c5450,.33,.65),selected:mat(0xf6f3e8,.3,.2)};
 const geometryCache=new Map();
 function mesh(g,material,parent=root){const o=new T.Mesh(g,material);o.castShadow=true;o.receiveShadow=true;parent.add(o);return o}
 function box(w,h,d,x,y,z,material=m.white,parent=root){let key=[w,h,d].join();if(!geometryCache.has(key))geometryCache.set(key,new T.BoxGeometry(w,h,d));const o=mesh(geometryCache.get(key),material,parent);o.position.set(x,y,z);return o}
 function cylinder(r,h,x,y,z,material=m.white,parent=root,r2=r){const o=mesh(new T.CylinderGeometry(r,r2,h,24),material,parent);o.position.set(x,y,z);return o}
 function line(points,color=0x727a74,opacity=.55){const o=new T.Line(new T.BufferGeometry().setFromPoints(points.map(p=>new T.Vector3(...p))),new T.LineBasicMaterial({color,transparent:true,opacity}));root.add(o);return o}
 function polygon(points,material,y=.012){const s=new T.Shape();points.forEach(([x,z],i)=>i?s.lineTo(x,-z):s.moveTo(x,-z));s.closePath();const g=new T.ShapeGeometry(s);g.rotateX(-Math.PI/2);const o=mesh(g,material);o.position.y=y;o.castShadow=false;return o}
 const river=z=>Math.sin(z*.24)*3.1+Math.sin(z*.52)*.7;
 box(120,.12,100,0,-.08,0,m.ground).castShadow=false;
 polygon([[-40,-30],[-8,-30],[-8,-18],[-13,-9],[-11,-2],[-16,7],[-17,30],[-40,30]],m.region2);
 polygon([[5,-30],[40,-30],[40,30],[6,30],[6,15],[10,8],[8,1],[10,-8]],m.region);
 const banks=[];for(let z=-40;z<=40;z+=.4)banks.push([river(z)-1.45,z]);for(let z=40;z>=-40;z-=.4)banks.push([river(z)+1.45,z]);polygon(banks,m.water,.028);
 for(const side of [-1,1]){
  const road=[];for(let z=-29;z<=29;z+=.5)road.push([river(z)+side*(4.5+Math.sin(z*.12)*.6),.035,z]);line(road,0x626b64,.8);
  const shoulder=road.map(([x,y,z])=>[x+side*.19,y,z]);line(shoulder,0x8b938c,.75);
 }
 // Quiet cadastral linework: roads and parcels, not a large UI grid.
 for(let i=0;i<18;i++){const z=-27+i*3.2,x=river(z)+5.5;line([[x,.032,z],[18+(i%3)*1.2,.032,z+1],[24,.032,z-.2]],0x798179,.4);if(i%2===0)polygon([[x+1,z+.3],[x+5,z+.55],[x+5,z+2.2],[x+.8,z+2]],m.region2,.022);}
 for(let i=0;i<10;i++){const z=-25+i*5;line([[-25,.03,z],[-16,.03,z+1],[-12,.03,z-.9],[river(z)-4.5,.03,z]],0x828a81,.52);}
 function batchStation(group){
  const groups=new Map();
  for(const o of [...group.children]){if(!o.isMesh)continue;o.updateMatrix();let g=o.geometry.clone();g.applyMatrix4(o.matrix);if(g.index){const expanded=g.toNonIndexed();g.dispose();g=expanded;}const key=o.material.uuid;if(!groups.has(key))groups.set(key,{material:o.material,geometries:[]});groups.get(key).geometries.push(g);group.remove(o);}
  for(const {material,geometries}of groups.values()){const merged=mergeGeometries(geometries);geometries.forEach(g=>g.dispose());mesh(merged,material,group);}
 }
 const data=[['lianghekou','两河口',-12,.86],['jinping','锦屏一级',-4.5,1],['guandi','官地',4.2,.9],['ertan','二滩',12,.93]];
 for(const [id,name,z,scale]of data){const x=river(z),g=new T.Group();g.position.set(x,0,z);g.scale.set(scale*(id==='lianghekou'?1.22:1),scale*1.7,scale*(id==='jinping'?1.2:1));root.add(g);stationPositions.set(id,new T.Vector3(x,0,z));
  // Arch dam wall with an articulated crest and four spillway bays.
  const wall=sector(4.05,3.79,1.15,0.84,1.43,48);wall.translate(0,.6,-3.7);mesh(wall,m.white,g);
  for(let i=0;i<13;i++){const a=.84+i*1.43/12;box(.12,.18,.25,Math.cos(a)*3.93,1.27,Math.sin(a)*3.93-3.7,m.white,g);}
  for(let i=0;i<4;i++){const px=-.63+i*.42;box(.13,.8,.24,px,.47,.24,m.roof,g);box(.29,.035,1.4,px+.13,.035,1.02,m.dark,g);}
  box(2.7,.1,2,2.5,.06,1.05,m.roof,g);box(2.35,.62,1.1,2.5,.42,.85,m.white,g);box(2.53,.085,1.24,2.5,.78,.85,m.white,g);
  for(let i=0;i<9;i++){box(.045,.53,1.17,1.38+i*.28,.44,.85,m.roof,g);box(.17,.18,.025,1.52+i*.25,.51,1.414,m.glass,g);}
  for(let i=0;i<4;i++){box(.3,.12,.56,1.55+i*.58,.88,.85,m.roof,g);cylinder(.16,.13,1.55+i*.58,1.01,.85,m.white,g);}
  box(1.3,.34,.65,4.32,.23,.65,m.white,g);box(1.42,.05,.74,4.32,.43,.65,m.roof,g);
  // Switchyard, busbars and insulators give scale without a heavy footprint.
  box(2.4,.04,1.7,3.5,.04,-1.15,m.region2,g);
  for(let i=0;i<4;i++)for(let j=0;j<3;j++){let px=2.65+i*.56,pz=-1.7+j*.51;cylinder(.045,.33,px,.22,pz,m.white,g);for(let k=0;k<3;k++)cylinder(.075,.025,px,.16+k*.075,pz,m.roof,g);}
  for(let i=0;i<4;i++)box(.035,.035,1.23,2.65+i*.56,.41,-1.17,m.white,g);
  for(let i=0;i<3;i++){box(.16,.7,.12,4.8,.4,-1.8+i*.65,m.white,g);box(1.2,.07,.05,4.24,.78,-1.8+i*.65,m.white,g);}
  batchStation(g);g.traverse(o=>{if(o.isMesh){o.userData.id=id;pickables.push(o);}});
  addPin(id,name,new T.Vector3(x+.6,3.25*scale,z));
 }
 function addPin(id,name,p){const pin=mesh(new T.SphereGeometry(.32,32,24),m.sphere);pin.position.copy(p);pin.userData.id=id;pickables.push(pin);const stem=cylinder(.012,p.y-.35,p.x,(p.y-.35)/2,p.z,m.dark);stem.castShadow=false;
  const cross=new T.Group();for(const rot of [0,Math.PI/2]){const bar=box(.21,.017,.025,0,0,0,m.white,cross);bar.rotation.z=rot;}cross.position.copy(p);cross.position.z+=.305;root.add(cross);
  anchors.push({id,name,position:p.clone().add(new T.Vector3(0,.5,0)),pin,cross});
 }
 const wind=new T.Group();wind.position.set(-10.2,0,6);root.add(wind);stationPositions.set('labashan',wind.position.clone());
 for(let i=0;i<6;i++){const x=(i%3)*1.7-1.7,z=Math.floor(i/3)*2.4-1.2;box(.55,.07,.55,x,.04,z,m.roof,wind);cylinder(.045,1.65,x,.88,z,m.white,wind,.085);box(.27,.16,.36,x,1.75,z,m.white,wind);const rotor=new T.Group();rotor.position.set(x,1.75,z+.23);wind.add(rotor);for(let j=0;j<3;j++){const shape=new T.Shape();shape.moveTo(0,.08);shape.lineTo(.09,.32);shape.lineTo(.035,1.03);shape.lineTo(-.025,1.15);shape.lineTo(-.045,.25);shape.closePath();const blade=mesh(new T.ExtrudeGeometry(shape,{depth:.025,bevelEnabled:false}),m.white,rotor);blade.rotation.z=j*TAU/3;}rotors.push(rotor);}
 wind.traverse(o=>{if(o.isMesh){o.userData.id='labashan';pickables.push(o);}});addPin('labashan','腊巴山',new T.Vector3(-10.2,3,6));
 return {root,anchors,pickables,rotors,stationPositions,materials:m};
}
