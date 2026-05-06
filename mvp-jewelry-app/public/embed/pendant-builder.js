"use strict";var PendantBuilder=(()=>{var q=Object.defineProperty;var j=(s,i,e)=>i in s?q(s,i,{enumerable:!0,configurable:!0,writable:!0,value:e}):s[i]=e;var b=(s,i,e)=>j(s,typeof i!="symbol"?i+"":i,e);var c=`
  :host {
    --pb-accent: #d1b873;
    --pb-blue: #3b82f6;
    --pb-bg: linear-gradient(180deg, #C0883E 0%, #4A2510 50%, #050101 100%);
    --pb-card: rgba(0, 0, 0, 0.9);
    --pb-text: #ffffff;
    --pb-text-muted: rgba(255, 255, 255, 0.7);
    --pb-error: #ef4444;
    --pb-success: #10b981;
    --pb-radius: 30px;
    --pb-radius-sm: 16px;
    --pb-shadow: 0 10px 30px rgba(0, 0, 0, 0.35);
    display: block;
    width: 100%;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    color: var(--pb-text);
    line-height: 1.5;
    -webkit-font-smoothing: antialiased;
    container-type: inline-size;
  }

  .pb-root {
    background: var(--pb-bg);
    min-height: 100%;
    padding: 24px 16px;
    display: flex;
    flex-direction: column;
    align-items: center;
  }

  .pb-inner {
    width: 100%;
    max-width: 520px;
    display: flex;
    flex-direction: column;
    gap: 24px;
  }

  .pb-header {
    text-align: left;
    max-width: 420px;
    width: 100%;
  }

  .pb-header-index {
    font-size: 11px;
    text-transform: uppercase;
    letter-spacing: 0.35em;
    color: var(--pb-text-muted);
    margin-bottom: 8px;
  }

  .pb-title {
    font-size: 2.2rem;
    font-weight: 700;
    line-height: 1.1;
    margin: 0 0 8px 0;
  }

  .pb-subtitle {
    font-size: 1.6rem;
    font-style: italic;
    color: rgba(255, 255, 255, 0.9);
    font-family: Georgia, "Times New Roman", serif;
    margin: 0 0 8px 0;
  }

  .pb-desc {
    font-size: 13px;
    color: var(--pb-text-muted);
    margin: 0;
  }

  .pb-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 12px;
    width: 100%;
  }

  @container (min-width: 400px) {
    .pb-grid-3 {
      grid-template-columns: repeat(3, 1fr);
    }
  }

  .pb-grid-3 {
    grid-template-columns: repeat(2, 1fr);
  }

  @container (min-width: 400px) {
    .pb-grid-3 {
      grid-template-columns: repeat(3, 1fr);
    }
  }

  @container (min-width: 300px) {
    .pb-title { font-size: 2.6rem; }
    .pb-subtitle { font-size: 1.8rem; }
  }

  .pb-card {
    aspect-ratio: 1;
    border-radius: var(--pb-radius);
    border: 1px solid rgba(209, 184, 115, 0.25);
    background: var(--pb-card);
    padding: 20px 12px;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    text-align: center;
    cursor: pointer;
    transition: border-color 0.2s, box-shadow 0.2s, opacity 0.2s;
    box-shadow: var(--pb-shadow);
    gap: 8px;
  }

  .pb-card:hover:not(.pb-card--disabled) {
    border-color: rgba(209, 184, 115, 0.7);
    box-shadow: 0 0 28px rgba(209, 184, 115, 0.14);
  }

  .pb-card--disabled {
    cursor: not-allowed;
    opacity: 0.55;
  }

  .pb-card--active {
    border: 2px solid var(--pb-blue);
    box-shadow: 0 0 25px rgba(59, 130, 246, 0.35);
  }

  .pb-card--selected {
    border: 2px solid #C5934F;
    box-shadow: 0 12px 30px rgba(113, 69, 31, 0.45);
  }

  .pb-card-emoji {
    font-size: 3rem;
    line-height: 1;
  }

  .pb-card-label {
    font-size: 14px;
    font-weight: 600;
    color: var(--pb-text);
    line-height: 1.2;
  }

  .pb-card-coming {
    font-size: 10px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.24em;
    color: rgba(255, 255, 255, 0.3);
  }

  .pb-card-img {
    width: 80px;
    height: 80px;
    object-fit: contain;
    border-radius: 12px;
  }

  .pb-style-picker {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 10px;
    width: 100%;
  }

  @container (min-width: 400px) {
    .pb-style-picker {
      grid-template-columns: repeat(3, 1fr);
    }
  }

  .pb-style-card {
    border-radius: var(--pb-radius-sm);
    border: 1px solid rgba(255, 255, 255, 0.15);
    background: rgba(0, 0, 0, 0.45);
    padding: 12px;
    text-align: center;
    cursor: pointer;
    transition: border-color 0.2s, box-shadow 0.2s;
  }

  .pb-style-card:hover {
    border-color: rgba(255, 255, 255, 0.4);
  }

  .pb-style-card--selected {
    border-color: #C5934F;
    box-shadow: 0 8px 24px rgba(113, 69, 31, 0.35);
  }

  .pb-style-card-img {
    width: 100%;
    height: 80px;
    object-fit: contain;
    border-radius: 8px;
    margin-bottom: 6px;
  }

  .pb-style-card-label {
    font-size: 12px;
    font-weight: 600;
    color: var(--pb-text);
  }

  .pb-input {
    width: 100%;
    padding: 14px 16px;
    border-radius: var(--pb-radius-sm);
    border: 1px solid rgba(255, 255, 255, 0.15);
    background: rgba(0, 0, 0, 0.45);
    color: var(--pb-text);
    font-size: 16px;
    outline: none;
    transition: border-color 0.2s;
    box-sizing: border-box;
    font-family: inherit;
  }

  .pb-input:focus {
    border-color: rgba(255, 255, 255, 0.4);
  }

  .pb-input::placeholder {
    color: rgba(255, 255, 255, 0.35);
  }

  .pb-label {
    font-size: 13px;
    font-weight: 600;
    color: var(--pb-text-muted);
    margin-bottom: 6px;
    text-transform: uppercase;
    letter-spacing: 0.08em;
  }

  .pb-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    padding: 14px 28px;
    border-radius: 14px;
    border: none;
    font-size: 15px;
    font-weight: 600;
    cursor: pointer;
    transition: opacity 0.2s, transform 0.15s;
    font-family: inherit;
    width: 100%;
  }

  .pb-btn:active {
    transform: scale(0.98);
  }

  .pb-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .pb-btn-primary {
    background: linear-gradient(135deg, rgba(59, 130, 246, 0.8), rgba(37, 99, 235, 0.8));
    color: #fff;
  }

  .pb-btn-accent {
    background: linear-gradient(135deg, #d1b873, #a0804a);
    color: #1a1a1a;
  }

  .pb-btn-outline {
    background: transparent;
    border: 1px solid rgba(255, 255, 255, 0.25);
    color: var(--pb-text);
  }

  .pb-btn-sm {
    padding: 8px 18px;
    font-size: 13px;
    border-radius: 10px;
    width: auto;
  }

  .pb-section-title {
    font-size: 15px;
    font-weight: 700;
    color: var(--pb-text);
    margin: 0 0 12px 0;
  }

  .pb-result-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 12px;
    width: 100%;
  }

  @container (min-width: 500px) {
    .pb-result-grid {
      grid-template-columns: repeat(3, 1fr);
    }
  }

  .pb-result-card {
    border-radius: var(--pb-radius-sm);
    border: 1px solid rgba(255, 255, 255, 0.12);
    background: rgba(0, 0, 0, 0.45);
    overflow: hidden;
  }

  .pb-result-card img {
    width: 100%;
    display: block;
  }

  .pb-result-label {
    padding: 8px 12px;
    font-size: 11px;
    color: var(--pb-text-muted);
    text-align: center;
  }

  .pb-skeleton {
    aspect-ratio: 1;
    border-radius: var(--pb-radius-sm);
    background: rgba(255, 255, 255, 0.05);
    animation: pb-pulse 1.5s ease-in-out infinite;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 13px;
    color: var(--pb-text-muted);
  }

  @keyframes pb-pulse {
    0%, 100% { opacity: 0.4; }
    50% { opacity: 0.7; }
  }

  .pb-upload-zone {
    border: 2px dashed rgba(255, 255, 255, 0.2);
    border-radius: var(--pb-radius-sm);
    padding: 40px 20px;
    text-align: center;
    cursor: pointer;
    transition: border-color 0.2s, background 0.2s;
  }

  .pb-upload-zone:hover {
    border-color: rgba(255, 255, 255, 0.4);
    background: rgba(255, 255, 255, 0.03);
  }

  .pb-upload-zone--has-image {
    border-style: solid;
    border-color: rgba(209, 184, 115, 0.4);
    padding: 12px;
  }

  .pb-upload-preview {
    max-width: 100%;
    max-height: 220px;
    border-radius: 12px;
    object-fit: contain;
  }

  .pb-upload-text {
    font-size: 14px;
    color: var(--pb-text-muted);
  }

  .pb-emblem-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 8px;
    width: 100%;
  }

  .pb-emblem-btn {
    aspect-ratio: 1;
    border-radius: 14px;
    border: 1px solid rgba(255, 255, 255, 0.15);
    background: rgba(0, 0, 0, 0.45);
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 4px;
    cursor: pointer;
    transition: border-color 0.2s, box-shadow 0.2s;
    padding: 8px;
  }

  .pb-emblem-btn:hover {
    border-color: rgba(255, 255, 255, 0.4);
  }

  .pb-emblem-btn--selected {
    border-color: #C5934F;
    box-shadow: 0 6px 20px rgba(113, 69, 31, 0.3);
  }

  .pb-emblem-btn-img {
    width: 36px;
    height: 36px;
    object-fit: contain;
  }

  .pb-emblem-btn-label {
    font-size: 10px;
    color: var(--pb-text-muted);
    text-align: center;
  }

  .pb-metal-tabs {
    display: flex;
    gap: 8px;
    width: 100%;
    flex-wrap: wrap;
  }

  .pb-metal-tab {
    flex: 1;
    min-width: 100px;
    padding: 10px 12px;
    border-radius: 12px;
    border: 1px solid rgba(255, 255, 255, 0.15);
    background: rgba(0, 0, 0, 0.45);
    cursor: pointer;
    text-align: center;
    font-size: 12px;
    font-weight: 600;
    color: var(--pb-text);
    transition: border-color 0.2s, box-shadow 0.2s;
  }

  .pb-metal-tab:hover {
    border-color: rgba(255, 255, 255, 0.4);
  }

  .pb-metal-tab--selected {
    border-color: #C5934F;
    box-shadow: 0 6px 20px rgba(113, 69, 31, 0.3);
  }

  .pb-quality-tabs {
    display: flex;
    gap: 8px;
    width: 100%;
  }

  .pb-quality-tab {
    flex: 1;
    padding: 12px;
    border-radius: 12px;
    border: 1px solid rgba(255, 255, 255, 0.15);
    background: rgba(0, 0, 0, 0.45);
    cursor: pointer;
    text-align: center;
    font-size: 14px;
    font-weight: 600;
    color: var(--pb-text);
    transition: border-color 0.2s, box-shadow 0.2s;
  }

  .pb-quality-tab:hover {
    border-color: rgba(255, 255, 255, 0.4);
  }

  .pb-quality-tab--selected {
    border-color: var(--pb-blue);
    box-shadow: 0 6px 20px rgba(59, 130, 246, 0.25);
  }

  .pb-back-link {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    font-size: 13px;
    color: var(--pb-text-muted);
    cursor: pointer;
    background: none;
    border: none;
    padding: 6px 0;
    font-family: inherit;
  }

  .pb-back-link:hover {
    color: var(--pb-text);
  }

  .pb-error-msg {
    color: var(--pb-error);
    font-size: 13px;
    padding: 10px 14px;
    border-radius: 10px;
    background: rgba(239, 68, 68, 0.1);
    border: 1px solid rgba(239, 68, 68, 0.3);
  }

  .pb-success-msg {
    color: var(--pb-success);
    font-size: 13px;
    padding: 10px 14px;
    border-radius: 10px;
    background: rgba(16, 185, 129, 0.1);
    border: 1px solid rgba(16, 185, 129, 0.3);
    text-align: center;
  }

  .pb-footer-dots {
    display: flex;
    justify-content: center;
    gap: 16px;
    padding-top: 24px;
  }

  .pb-footer-dot {
    width: 10px;
    height: 10px;
    border-radius: 50%;
    border: 2px solid #d1b873;
    background: transparent;
  }

  .pb-footer-dot--active {
    background: #d1b873;
  }

  .pb-spinner {
    display: inline-block;
    width: 20px;
    height: 20px;
    border: 2px solid rgba(255, 255, 255, 0.3);
    border-top-color: var(--pb-text);
    border-radius: 50%;
    animation: pb-spin 0.8s linear infinite;
  }

  @keyframes pb-spin {
    to { transform: rotate(360deg); }
  }

  .pb-row {
    display: flex;
    gap: 10px;
    width: 100%;
  }

  .pb-row > * {
    flex: 1;
  }

  .pb-mt {
    margin-top: 8px;
  }

  .pb-hidden {
    display: none !important;
  }

  .pb-text-center {
    text-align: center;
  }

  .pb-color-swatch {
    display: inline-block;
    width: 14px;
    height: 14px;
    border-radius: 50%;
    margin-right: 6px;
    vertical-align: middle;
    border: 1px solid rgba(255,255,255,0.3);
  }

  .pb-swatch-yellow { background: #f0c060; }
  .pb-swatch-white { background: #e8e8e8; }
  .pb-swatch-rose { background: #e8a0a0; }
`;var u=[{id:"pendant",label:"Pendant",disabled:!1,emoji:"\u{1F48E}"},{id:"ring",label:"Ring",disabled:!0,emoji:"\u{1F48D}"},{id:"bracelet",label:"Bracelet",disabled:!0,emoji:"\u{1F4FF}"},{id:"necklace",label:"Necklace",disabled:!0,emoji:"\u26D3\uFE0F"}],m=[{id:"logo",label:"Logo",disabled:!0,emoji:"\u{1F3F7}\uFE0F",mode:null},{id:"name",label:"Name / Initials",disabled:!1,emoji:"\u2728",mode:"name"},{id:"picture",label:"Picture Pendants",disabled:!1,emoji:"\u{1F5BC}\uFE0F",mode:"picture"},{id:"custom",label:"Custom Design",disabled:!0,emoji:"\u270F\uFE0F",mode:null},{id:"inspire",label:"Get Inspired",disabled:!0,emoji:"\u{1F4A1}",mode:null},{id:"draw",label:"Draw Your Design",disabled:!0,emoji:"\u{1F3A8}",mode:null}],g=[{id:"deja",label:"Deja",src:"/pendants/deja.png"},{id:"gatti",label:"Gatti",src:"/pendants/gatti.png"},{id:"jaida",label:"Jaida",src:"/pendants/jaida.png"},{id:"jhon",label:"Jhon",src:"/pendants/jhon.png"},{id:"jwae",label:"Jwae",src:"/pendants/jwae.png"},{id:"king",label:"King",src:"/pendants/king.png"},{id:"lexy",label:"Lexy",src:"/pendants/lexy.png"},{id:"neiko",label:"Neiko",src:"/pendants/neiko.png"}],h=[{id:"pendant1",label:"Round Classic",src:"/picture-pendants/pendant1.jpg",available:!0},{id:"picturependant2",label:"Oval Halo",src:"/picture-pendants/picturependant2.jpg",available:!0},{id:"picturependant3",label:"Winged Round",src:"/picture-pendants/picturependant3.jpg",available:!0},{id:"picturependant4",label:"Sunburst Round",src:"/picture-pendants/picturependant4.jpg",available:!0},{id:"picturependant5",label:"Heart Frame",src:"/picture-pendants/picturependant5.jpg",available:!0}],v=[{id:"none",label:"None"},{id:"moneybag",label:"Money Bag",src:"/emblems/moneybag emblem.png"},{id:"crown",label:"Crown",src:"/emblems/CROWN EMBLEM.png"},{id:"heart",label:"Heart",src:"/emblems/heart emblem.png"},{id:"spade",label:"Spade",src:"/emblems/SPADE EMBLEM.png"},{id:"butterfly",label:"Butterfly",src:"/emblems/BUTTERFLY EMBLEM.png"}],d=[{primary:"yellow_gold",secondary:"white_gold",label:"Yellow + White Gold",twoTone:!0},{primary:"rose_gold",secondary:"white_gold",label:"Rose + White Gold",twoTone:!0},{primary:"white_gold",secondary:"white_gold",label:"White Gold",twoTone:!1}],y=["VS","VVS"];function l(s,i){return`${s.replace(/\/+$/,"")}${i}`}async function f(s,i){let e=await fetch(l(s,"/api/requests"),{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(i)});if(!e.ok){let a=await e.json().catch(()=>({error:"Request failed"}));throw new Error(a.error??`HTTP ${e.status}`)}return e.json()}async function x(s,i){let e=await fetch(l(s,`/api/requests/${i}`));if(!e.ok)throw new Error(`Request status fetch failed: ${e.status}`);return e.json()}async function w(s,i){let e=await fetch(l(s,"/api/picture-requests"),{method:"POST",body:i});if(!e.ok){let a=await e.json().catch(()=>({error:"Upload failed"}));throw new Error(a.error??`HTTP ${e.status}`)}return e.json()}async function k(s,i){let e=await fetch(l(s,"/api/leads"),{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(i)});if(!e.ok){let a=await e.json().catch(()=>({error:"Lead submission failed"}));throw new Error(a.error??`HTTP ${e.status}`)}return e.json()}async function P(s,i){let e=await fetch(l(s,"/api/quote-requests"),{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(i)});if(!e.ok){let a=await e.json().catch(()=>({error:"Quote request failed"}));throw new Error(a.error??`HTTP ${e.status}`)}return e.json()}function I(s,i){return!i||i.startsWith("http")?i:`${s.replace(/\/+$/,"")}${i}`}function $(s){return{screen:s.mode==="name"?"nameConfig":s.mode==="picture"?"pictureConfig":"category",storeId:s.storeId??"demo",apiBase:s.apiBase??"",mode:s.mode??"pendants",theme:s.theme??"warm-brown",selectedStyleId:"",selectedPictureStyleId:"",text:"",emblem:"none",metalComboIndex:0,diamondQuality:"VS",requestId:null,results:[],uploadFile:null,uploadPreviewUrl:null,customerName:"",customerPhone:"",customerEmail:"",quoteSuccess:!1,generating:!1,pollIntervalId:null}}function B(s){return s.replace(/--pb-/g,"m").replace(/rgb?\(/g,"(").slice(0,120)}var p=class extends HTMLElement{constructor(){super();b(this,"state");this.attachShadow({mode:"open"})}static get observedAttributes(){return["store-id","api-base","mode","theme"]}connectedCallback(){let e={storeId:this.getAttribute("store-id")??void 0,apiBase:this.getAttribute("api-base")??void 0,mode:this.getAttribute("mode")??void 0,theme:this.getAttribute("theme")??void 0};this.state=$(e),this.render()}attributeChangedCallback(e,a,t){if(this.state){if(e==="store-id"&&(this.state.storeId=t||"demo"),e==="api-base"&&(this.state.apiBase=t||""),e==="mode"){let r=t||"pendants";this.state.mode=r,r==="name"?this.state.screen="nameConfig":r==="picture"?this.state.screen="pictureConfig":this.state.screen="category"}e==="theme"&&(this.state.theme=t||"warm-brown"),this.render()}}clearPolling(){this.state.pollIntervalId&&(clearInterval(this.state.pollIntervalId),this.state.pollIntervalId=null)}setScreen(e){e!=="generating"&&e!=="results"&&this.clearPolling(),this.state.screen=e,this.state.generating=e==="generating",this.render()}asset(e){return I(this.state.apiBase,e)}handleError(e){let a=e instanceof Error?e.message:"Something went wrong";this.state.generating=!1,this.render(),this.showError(a)}showError(e){let a=this.shadowRoot.querySelector(".pb-root");if(!a)return;let t=a.querySelector(".pb-error-msg");if(t)t.textContent=e;else{let r=document.createElement("div");r.className="pb-error-msg",r.textContent=e,a.querySelector(".pb-inner")?.insertBefore(r,a.querySelector(".pb-inner").firstChild),setTimeout(()=>r.remove(),5e3)}}async submitNameRequest(){let e=this.state;if(!e.selectedStyleId||!e.text.trim())return;e.generating=!0,this.render();let a=d[e.metalComboIndex];try{let{requestId:t}=await f(e.apiBase,{userId:e.storeId,styleId:e.selectedStyleId,text:e.text.toUpperCase(),twoTone:a.twoTone,primaryMetal:a.primary,secondaryMetal:a.twoTone?a.secondary:null,emblem:e.emblem});e.requestId=t,e.screen="results",e.generating=!1,this.startPolling(),this.render()}catch(t){this.handleError(t)}}async submitPictureRequest(){let e=this.state;if(!e.selectedPictureStyleId||!e.uploadFile)return;e.generating=!0,this.render();let a=d[e.metalComboIndex],t=new FormData;t.append("userId",e.storeId),t.append("styleId",e.selectedPictureStyleId),t.append("primaryMetal",a.primary),t.append("image",e.uploadFile);try{let{requestId:r}=await w(e.apiBase,t);e.requestId=r,e.screen="results",e.generating=!1,this.startPolling(),this.render()}catch(r){this.handleError(r)}}startPolling(){this.clearPolling();let e=async()=>{if(this.state.requestId)try{let a=await x(this.state.apiBase,this.state.requestId),t=(a.results||[]).filter(r=>r.status==="succeeded"&&r.imageUrl).map(r=>({variant:r.variant,imageUrl:r.imageUrl,modelId:r.modelId??null,durationSeconds:r.durationSeconds??null}));this.state.results=t,a.done&&this.clearPolling(),this.render()}catch{}};e(),this.state.pollIntervalId=setInterval(e,2e3)}async submitLead(){let e=this.state;if(!(!e.customerName||!e.customerPhone||!e.customerEmail))try{await k(e.apiBase,{requestId:e.requestId??void 0,name:e.customerName,phone:e.customerPhone,email:e.customerEmail})}catch{}}async submitQuote(){let e=this.state;if(e.requestId)try{await this.submitLead();let a=e.results[0]?.imageUrl??void 0;await P(e.apiBase,{requestId:e.requestId,designedImageUrl:a,diamondQuality:e.diamondQuality,customerName:e.customerName,customerPhone:e.customerPhone,customerEmail:e.customerEmail}),e.quoteSuccess=!0,this.render()}catch(a){this.handleError(a)}}handleUpload(e){if(!e.type.startsWith("image/")){this.showError("Please upload an image file.");return}this.state.uploadFile=e;let a=new FileReader;a.onload=()=>{this.state.uploadPreviewUrl=a.result,this.render()},a.readAsDataURL(e)}renderScreen(){switch(this.state.screen){case"category":return this.renderCategory();case"pendantType":return this.renderPendantType();case"nameConfig":return this.renderNameConfig();case"pictureConfig":return this.renderPictureConfig();case"results":return this.renderResults();case"quote":return this.renderQuote();default:return this.renderCategory()}}renderCategory(){return`
      <div class="pb-header">
        <div class="pb-header-index">001</div>
        <h1 class="pb-title">Dream it first</h1>
        <p class="pb-subtitle">we'll build it.</p>
        <p class="pb-desc">Choose your format and we'll help you design and customize it to your liking</p>
      </div>
      <div class="pb-grid">
        ${u.map(e=>`
          <div class="pb-card ${e.disabled?"pb-card--disabled":""}"
               data-action="select-category" data-id="${e.id}"
               ${e.disabled?'aria-disabled="true"':""}>
            <span class="pb-card-emoji">${e.emoji}</span>
            <span class="pb-card-label">${e.label}</span>
            ${e.disabled?'<span class="pb-card-coming">coming soon</span>':""}
          </div>
        `).join("")}
      </div>
      <div class="pb-footer-dots">
        ${[0,1,2,3,4].map(e=>`
          <span class="pb-footer-dot ${e===0?"pb-footer-dot--active":""}"></span>
        `).join("")}
      </div>
    `}renderPendantType(){return`
      <button class="pb-back-link" data-action="back">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="15 18 9 12 15 6"/></svg>
        Back
      </button>
      <div class="pb-header">
        <div class="pb-header-index">002</div>
        <h1 class="pb-title">Pendant Format</h1>
        <p class="pb-desc">Choose how you want your pendant designed</p>
      </div>
      <div class="pb-grid pb-grid-3">
        ${m.map(e=>`
          <div class="pb-card ${e.disabled?"pb-card--disabled":""}"
               data-action="select-pendant-type" data-id="${e.id}"
               data-mode="${e.mode??""}"
               ${e.disabled?'aria-disabled="true"':""}>
            <span class="pb-card-emoji">${e.emoji}</span>
            <span class="pb-card-label">${e.label}</span>
            ${e.disabled?'<span class="pb-card-coming">coming soon</span>':""}
          </div>
        `).join("")}
      </div>
      <div class="pb-footer-dots">
        ${[0,1,2,3,4].map(e=>`
          <span class="pb-footer-dot ${e===2?"pb-footer-dot--active":""}"></span>
        `).join("")}
      </div>
    `}renderNameConfig(){let e=this.state,a=B(c);return`
      <button class="pb-back-link" data-action="back" ${e.mode==="name"?'data-back="category"':""}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="15 18 9 12 15 6"/></svg>
        Back
      </button>
      <div class="pb-header">
        <h1 class="pb-title">Name / Initials</h1>
        <p class="pb-desc">Enter the text and choose a style for your pendant</p>
      </div>
      <div>
        <div class="pb-label">Your Text</div>
        <input class="pb-input" type="text" placeholder="Enter name or initials"
               data-bind="text" value="${this.escapeHtml(e.text)}" maxlength="12" />
      </div>
      <div>
        <div class="pb-label">Style</div>
        <div class="pb-style-picker">
          ${g.map(t=>`
            <div class="pb-style-card ${e.selectedStyleId===t.id?"pb-style-card--selected":""}"
                 data-action="select-style" data-id="${t.id}">
              <img class="pb-style-card-img" src="${this.asset(t.src)}" alt="${t.label}" loading="lazy" />
              <div class="pb-style-card-label">${t.label}</div>
            </div>
          `).join("")}
        </div>
      </div>
      <div>
        <div class="pb-label">Emblem</div>
        <div class="pb-emblem-grid">
          ${v.map(t=>`
            <div class="pb-emblem-btn ${e.emblem===t.id?"pb-emblem-btn--selected":""}"
                 data-action="select-emblem" data-id="${t.id}">
              ${t.src?`<img class="pb-emblem-btn-img" src="${this.asset(t.src)}" alt="${t.label}" loading="lazy" />`:""}
              <span class="pb-emblem-btn-label">${t.label}</span>
            </div>
          `).join("")}
        </div>
      </div>
      <div>
        <div class="pb-label">Metal</div>
        <div class="pb-metal-tabs">
          ${d.map((t,r)=>`
            <div class="pb-metal-tab ${e.metalComboIndex===r?"pb-metal-tab--selected":""}"
                 data-action="select-metal" data-index="${r}">
              <span class="pb-color-swatch pb-swatch-${t.primary==="yellow_gold"?"yellow":t.primary==="rose_gold"?"rose":"white"}"></span>
              ${t.twoTone?'<span class="pb-color-swatch pb-swatch-white"></span>':""}
              ${t.label}
            </div>
          `).join("")}
        </div>
      </div>
      <div>
        <div class="pb-label">Diamond Quality</div>
        <div class="pb-quality-tabs">
          ${y.map(t=>`
            <div class="pb-quality-tab ${e.diamondQuality===t?"pb-quality-tab--selected":""}"
                 data-action="select-quality" data-value="${t}">${t}</div>
          `).join("")}
        </div>
      </div>
      <button class="pb-btn pb-btn-accent" data-action="submit-name"
              ${!e.selectedStyleId||!e.text.trim()?"disabled":""}>
        Generate Design
      </button>
    `}renderPictureConfig(){let e=this.state;return`
      <button class="pb-back-link" data-action="back" ${e.mode==="picture"?'data-back="category"':""}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="15 18 9 12 15 6"/></svg>
        Back
      </button>
      <div class="pb-header">
        <h1 class="pb-title">Picture Pendants</h1>
        <p class="pb-desc">Upload a photo and choose a pendant style</p>
      </div>
      <div class="pb-upload-zone ${e.uploadPreviewUrl?"pb-upload-zone--has-image":""}" data-action="upload">
        ${e.uploadPreviewUrl?`<img class="pb-upload-preview" src="${e.uploadPreviewUrl}" alt="Preview" />`:'<div class="pb-upload-text">Tap or click to upload a photo</div>'}
      </div>
      <input type="file" accept="image/*" style="display:none" id="pb-file-input" />
      <div>
        <div class="pb-label">Style</div>
        <div class="pb-style-picker">
          ${h.map(a=>`
            <div class="pb-style-card ${e.selectedPictureStyleId===a.id?"pb-style-card--selected":""}"
                 data-action="select-picture-style" data-id="${a.id}">
              <img class="pb-style-card-img" src="${this.asset(a.src)}" alt="${a.label}" loading="lazy" />
              <div class="pb-style-card-label">${a.label}</div>
            </div>
          `).join("")}
        </div>
      </div>
      <div>
        <div class="pb-label">Metal Color</div>
        <div class="pb-metal-tabs">
          ${d.map((a,t)=>`
            <div class="pb-metal-tab ${e.metalComboIndex===t?"pb-metal-tab--selected":""}"
                 data-action="select-metal" data-index="${t}">
              <span class="pb-color-swatch pb-swatch-${a.primary==="yellow_gold"?"yellow":a.primary==="rose_gold"?"rose":"white"}"></span>
              ${a.twoTone?'<span class="pb-color-swatch pb-swatch-white"></span>':""}
              ${a.label}
            </div>
          `).join("")}
        </div>
      </div>
      <button class="pb-btn pb-btn-accent" data-action="submit-picture"
              ${!e.selectedPictureStyleId||!e.uploadFile?"disabled":""}>
        Generate Design
      </button>
    `}renderResults(){let e=this.state,a=e.mode==="picture",t=!!e.pollIntervalId,n=Math.max(0,(a?1:2)-e.results.length-(t?1:0));return`
      <div class="pb-header">
        <h1 class="pb-title">Your Designs</h1>
        <p class="pb-desc">${t?"Generating your pendant design"+(e.results.length>0?"s":"")+"...":e.results.length?"Here are your generated designs":"Waiting for results..."}</p>
      </div>
      <div class="pb-result-grid">
        ${e.results.map(o=>`
          <div class="pb-result-card">
            <img src="${this.asset(o.imageUrl)}" alt="Design ${o.variant}" loading="lazy" />
            <div class="pb-result-label">Design ${o.variant}</div>
          </div>
        `).join("")}
        ${t?`
          <div class="pb-skeleton">
            <span class="pb-spinner"></span>
          </div>
        `:""}
        ${Array.from({length:n}).map(()=>`
          <div class="pb-skeleton">Waiting...</div>
        `).join("")}
      </div>
      ${!t&&e.results.length>0?`
        <button class="pb-btn pb-btn-primary" data-action="go-quote">Get a Quote</button>
      `:""}
      <button class="pb-btn pb-btn-outline ${e.results.length?"":"pb-mt"}" data-action="start-over">Start Over</button>
    `}renderQuote(){let e=this.state;return e.quoteSuccess?`
        <div class="pb-header">
          <h1 class="pb-title">Thank You!</h1>
          <p class="pb-subtitle">your Design has been sent!</p>
        </div>
        <div class="pb-success-msg">
          We will reach back soon through email or text
        </div>
        <button class="pb-btn pb-btn-outline" data-action="start-over">Design Another</button>
      `:`
      <button class="pb-back-link" data-action="back" data-back="results">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="15 18 9 12 15 6"/></svg>
        Back to designs
      </button>
      <div class="pb-header">
        <h1 class="pb-title">Get a Quote</h1>
        <p class="pb-desc">We'll send you pricing for your custom pendant</p>
      </div>
      <div>
        <div class="pb-label">Your Name</div>
        <input class="pb-input" type="text" placeholder="Full name"
               data-bind="customerName" value="${this.escapeHtml(e.customerName)}" />
      </div>
      <div>
        <div class="pb-label">Phone</div>
        <input class="pb-input" type="tel" placeholder="+1234567890"
               data-bind="customerPhone" value="${this.escapeHtml(e.customerPhone)}" />
      </div>
      <div>
        <div class="pb-label">Email</div>
        <input class="pb-input" type="email" placeholder="you@example.com"
               data-bind="customerEmail" value="${this.escapeHtml(e.customerEmail)}" />
      </div>
      <button class="pb-btn pb-btn-primary" data-action="submit-quote"
              ${!e.customerName||!e.customerPhone||!e.customerEmail?"disabled":""}>
        Submit Quote Request
      </button>
    `}escapeHtml(e){return e.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;")}bindEvents(){let e=this.shadowRoot,a=this.state;e.querySelectorAll("[data-action]").forEach(r=>{let n=r.dataset.action;if(!n)return;let o=this.makeActionHandler(n,r);o&&r.addEventListener("click",o)}),e.querySelectorAll("[data-bind]").forEach(r=>{let n=r.dataset.bind;n&&r.addEventListener("input",o=>{a[n]=o.target.value})});let t=e.getElementById("pb-file-input");t&&t.addEventListener("change",()=>{let r=t.files?.[0];r&&this.handleUpload(r)})}makeActionHandler(e,a){let t=this.state;switch(e){case"select-category":return r=>{r.currentTarget.dataset.id==="pendant"&&this.setScreen("pendantType")};case"select-pendant-type":return r=>{let n=r.currentTarget;n.dataset.mode==="name"?(t.mode="name",this.setScreen("nameConfig")):n.dataset.mode==="picture"&&(t.mode="picture",this.setScreen("pictureConfig"))};case"back":return r=>{let o=r.currentTarget.dataset.back;o==="category"?this.setScreen("category"):o==="results"?this.setScreen("results"):t.mode==="name"||t.mode==="picture"?this.setScreen("pendantType"):this.setScreen("category")};case"select-style":return r=>{t.selectedStyleId=r.currentTarget.dataset.id||"",this.render()};case"select-picture-style":return r=>{t.selectedPictureStyleId=r.currentTarget.dataset.id||"",this.render()};case"select-emblem":return r=>{t.emblem=r.currentTarget.dataset.id||"none",this.render()};case"select-metal":return r=>{t.metalComboIndex=parseInt(r.currentTarget.dataset.index||"0",10),this.render()};case"select-quality":return r=>{t.diamondQuality=r.currentTarget.dataset.value||"VS",this.render()};case"submit-name":return()=>this.submitNameRequest();case"submit-picture":return()=>this.submitPictureRequest();case"upload":return()=>{this.shadowRoot.getElementById("pb-file-input")?.click()};case"go-quote":return()=>this.setScreen("quote");case"submit-quote":return()=>this.submitQuote();case"start-over":return()=>{this.clearPolling();let r=$({storeId:t.storeId,apiBase:t.apiBase,mode:t.mode,theme:t.theme});Object.assign(t,r,{storeId:t.storeId,apiBase:t.apiBase,mode:t.mode,theme:t.theme}),this.render()};default:return null}}render(){this.clearPolling();let e=this.state;e.screen==="results"&&e.requestId&&e.pollIntervalId===null&&e.results.length===0&&this.startPolling();let t=this.shadowRoot.querySelector(".pb-root")?.scrollTop??0;this.shadowRoot.innerHTML=`
      <style>${c}</style>
      <div class="pb-root">
        <div class="pb-inner">
          ${this.renderScreen()}
        </div>
      </div>
    `;let r=this.shadowRoot.querySelector(".pb-root");r&&t>0&&(r.scrollTop=t),this.bindEvents()}};function E(s,i={}){let e=typeof s=="string"?document.querySelector(s):s;if(!e)throw new Error(`pendant-builder mount target not found: ${s}`);let a=document.createElement("pendant-builder");return i.storeId&&a.setAttribute("store-id",i.storeId),i.apiBase&&a.setAttribute("api-base",i.apiBase),i.mode&&a.setAttribute("mode",i.mode),i.theme&&a.setAttribute("theme",i.theme),e.innerHTML="",e.appendChild(a),a}var S="pendant-builder";function C(){customElements.get(S)||customElements.define(S,p)}C();var T={mount:E,define:C};window.PendantBuilder=T;window.PendantBuilder;})();
//# sourceMappingURL=pendant-builder.js.map
