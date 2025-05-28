import{_ as u,o as m,D as y,l as h}from"./index-Cd4aCzMT.js";const g={name:"RippleEffect",props:{color:{type:String,default:"rgba(255, 255, 255, 0.3)"},duration:{type:Number,default:600},disabled:{type:Boolean,default:!1}},setup(i){const s=new Set,p=e=>{if(i.disabled)return;e.type==="touchstart"&&e.preventDefault();const t=e.currentTarget;if(!t)return;const d=t.style.position,f=t.style.overflow;getComputedStyle(t).position==="static"&&(t.style.position="relative"),t.style.overflow="hidden";const l=t.getBoundingClientRect();let a,c;e.type==="touchstart"&&e.touches&&e.touches[0]?(a=e.touches[0].clientX-l.left,c=e.touches[0].clientY-l.top):(a=e.clientX-l.left,c=e.clientY-l.top);const n=Math.max(l.width,l.height)*2,o=document.createElement("div");o.className="ripple-wave",o.style.cssText=`
        position: absolute;
        border-radius: 50%;
        background-color: ${i.color};
        width: ${n}px;
        height: ${n}px;
        left: ${a-n/2}px;
        top: ${c-n/2}px;
        pointer-events: none;
        transform: scale(0);
        opacity: 1;
        z-index: 0;
        animation: ripple-animation ${i.duration}ms cubic-bezier(0.25, 0.46, 0.45, 0.94);
      `,s.add(o),t.appendChild(o),setTimeout(()=>{o.parentNode&&o.parentNode.removeChild(o),s.delete(o),s.size===0&&(d?t.style.position=d:t.style.position==="relative"&&(t.style.position=""),f?t.style.overflow=f:t.style.overflow="")},i.duration)},r=()=>{s.forEach(e=>{e.parentNode&&e.parentNode.removeChild(e)}),s.clear()};return m(()=>{if(!document.querySelector("#ripple-styles")){const e=document.createElement("style");e.id="ripple-styles",e.textContent=`
          @keyframes ripple-animation {
            0% {
              transform: scale(0);
              opacity: 1;
            }
            100% {
              transform: scale(1);
              opacity: 0;
            }
          }
        `,document.head.appendChild(e)}}),y(()=>{r()}),{createRipple:p}}};function x(i,s,p,r,e,t){return h(i.$slots,"default",{createRipple:r.createRipple})}const b=u(g,[["render",x]]);export{b as R};
