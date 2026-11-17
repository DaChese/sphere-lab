'use strict';
(() => {
const canvas=document.querySelector('#scene'),ctx=canvas.getContext('2d');
const settings={speed:.22,deform:1,influence:.55,count:5600};
const cards=[...document.querySelectorAll('.card')];
const motionPreference=matchMedia('(prefers-reduced-motion: reduce)');
let reduced=motionPreference.matches;
let paused=reduced,w=0,h=0,dpr=1,points=[],clock=0,previous=0;
let pointer={x:0,y:0},smooth={x:0,y:0},rotation={x:0,y:0},drag=null,scroll=0,spread=0;
function seed(i){const v=Math.sin(i*127.1+311.7)*43758.5453;return v-Math.floor(v);}
function makePoints(){points=[];const n=settings.count,golden=Math.PI*(3-Math.sqrt(5));for(let i=0;i<n;i++){const y=1-2*(i+.5)/n,r=Math.sqrt(1-y*y),a=golden*i;points.push({x:Math.cos(a)*r,y,z:Math.sin(a)*r,seed:seed(i),size:.65+seed(i+43)*.65});}}
canvas.ondblclick=()=>window.scrollTo({top:h*(reduced?.8:1.3),behavior:reduced?'instant':'smooth'});
motionPreference.addEventListener('change',e=>{reduced=e.matches;paused=reduced;});
function resize(){w=innerWidth;h=innerHeight;dpr=Math.min(devicePixelRatio||1,2);canvas.width=Math.round(w*dpr);canvas.height=Math.round(h*dpr);ctx.setTransform(dpr,0,0,dpr,0,0);}addEventListener('resize',resize);resize();
canvas.addEventListener('pointermove',e=>{pointer.x=(e.clientX/w-.5)*2;pointer.y=(e.clientY/h-.5)*2;if(drag){rotation.y+=(e.clientX-drag.x)*.006;rotation.x+=(e.clientY-drag.y)*.006;drag={x:e.clientX,y:e.clientY};}});
canvas.addEventListener('pointerdown',e=>{drag={x:e.clientX,y:e.clientY};canvas.setPointerCapture(e.pointerId);canvas.style.cursor='grabbing';});
function release(){drag=null;canvas.style.cursor='grab';}canvas.addEventListener('pointerup',release);canvas.addEventListener('pointercancel',release);canvas.addEventListener('pointerleave',()=>{if(!drag)pointer={x:0,y:0};});canvas.style.cursor='grab';
addEventListener('scroll',()=>{scroll=window.scrollY/Math.max(1,h);},{passive:true});scroll=scrollY/Math.max(1,h);
function rotate(x,y,z,ax,ay){const cy=Math.cos(ay),sy=Math.sin(ay),cx=Math.cos(ax),sx=Math.sin(ax);let xx=x*cy+z*sy,zz=-x*sy+z*cy;return{x:xx,y:y*cx-zz*sx,z:y*sx+zz*cx};}
// Deform in object space: neighboring particles sample the same continuous field.
// The envelope periodically relaxes toward a sphere; no per-particle jitter.
function membrane(p,t,amount){
 const envelope=amount*(.18+.82*(.5+.5*Math.sin(t*.48))**2);
 const wave=Math.sin(p.y*3.2+p.x*1.5-t*.85)*Math.cos(p.z*2.4+t*.43);
 const ripple=Math.sin(p.x*4.2-p.z*2.8+t*.65);
 const radial=1+envelope*(.18*wave+.065*ripple);
 const stretch=Math.exp(envelope*.25*Math.sin(t*.67));
 let x=p.x*radial*stretch,y=p.y*radial/Math.sqrt(stretch),z=p.z*radial/Math.sqrt(stretch);
 const twist=envelope*.58*Math.sin(p.y*2.2-t*.56);
 const c=Math.cos(twist),sn=Math.sin(twist),xx=x*c-z*sn;
 z=x*sn+z*c;x=xx;
 x+=envelope*.12*Math.sin(p.y*2.5+t*.72)*(1-p.x*p.x);
 y+=envelope*.09*Math.sin(p.z*3-t*.53)*(1-p.y*p.y);
 return {x,y,z};
}
function smoothstep(value){const v=Math.max(0,Math.min(1,value));return v*v*(3-2*v);}
function render(now){const dt=Math.min((now-previous)/1000||0,.05);previous=now;if(!paused)clock+=dt;const ease=1-Math.exp(-dt*6);smooth.x+=(pointer.x-smooth.x)*ease;smooth.y+=(pointer.y-smooth.y)*ease;const target=reduced?0:smoothstep((scroll-.25)/1.05);spread+=(target-spread)*(reduced?1:ease);ctx.clearRect(0,0,w,h);
const mobile=w<750,radius=Math.min(w*(mobile?.29:.205),h*.30),centerX=w*.5,centerY=h*.58,ay=clock*settings.speed*.4+rotation.y+smooth.x*.35*settings.influence,ax=Math.sin(clock*.13)*.12+rotation.x+smooth.y*.2*settings.influence;
const plotted=[];
const fade=1-smoothstep((scroll-1.55)/1.1);
for(const p of points){
 const surface=membrane(p,clock,reduced?0:settings.deform);
 let q=rotate(surface.x,surface.y,surface.z,ax,ay);
 const near=Math.exp(-((q.x-smooth.x*1.4)**2+(q.y-smooth.y*1.4)**2)*5);
 q.z+=near*.16*settings.influence;
 // Expand along the particle's original direction into a stable 3D volume.
 // Perspective and depth sorting make near particles larger than distant ones.
 const direction=rotate(p.x,p.y,p.z,ax*.4,ay*.4);
 const volume=.35+Math.cbrt(p.seed)*1.05;
 const cloudZ=direction.z*volume*1.9;
 const z=q.z+(cloudZ-q.z)*spread;
 const perspective=4/Math.max(1.1,4-z);
 const zoom=1+(reduced?0:Math.min(scroll,.8)*.55);
 const sx=q.x*radius*zoom,sy=q.y*radius*zoom;
 const cloudX=direction.x*volume*w*.62+smooth.x*24*(cloudZ/3);
 const cloudY=direction.y*volume*h*.72+smooth.y*24*(cloudZ/3);
 const px=centerX+(sx+(cloudX-sx)*spread)*perspective;
 const py=centerY+(h*.5-centerY)*spread+(sy+(cloudY-sy)*spread)*perspective;
 plotted.push({x:px,y:py,z,size:Math.min(4.5,p.size*perspective),alpha:Math.max(.09,Math.min(.8,.4+z*.16))*fade});
}
plotted.sort((a,b)=>a.z-b.z);
for(const p of plotted){
 if(p.x<0||p.x>w||p.y<0||p.y>h||p.alpha<=0)continue;
 ctx.fillStyle=`rgba(28,36,25,${p.alpha})`;ctx.beginPath();ctx.arc(p.x,p.y,p.size,0,Math.PI*2);ctx.fill();
}
cards.forEach((card,i)=>{const a=i*Math.PI/3+clock*settings.speed*.18,q=rotate(Math.cos(a)*1.65,Math.sin(a)*1.2,Math.sin(a+.7)*1.15,ax*.4-.3,ay*.45),scale=3.6/(3.6-q.z)*(mobile?.6:.8),x=centerX+q.x*radius*(1+spread*2),y=centerY+q.y*radius*(1+spread*2);
card.style.transform=`translate(${x-card.offsetWidth/2}px,${y-card.offsetHeight/2}px) scale(${scale}) rotate(${Math.sin(a)*17}deg)`;
card.style.opacity=String(Math.max(0,(1-spread*1.8)*(.45+(q.z+1.3)*.18)));
card.style.filter=`blur(${Math.max(0,-q.z)*.65}px)`;
});
document.documentElement.style.setProperty('--intro-opacity',String(1-Math.min(1,scroll/.65)));
requestAnimationFrame(render);}
makePoints();requestAnimationFrame(render);
})();
