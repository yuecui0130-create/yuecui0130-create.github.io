(function () {
  "use strict";
  const $ = id => document.getElementById(id);
  const engine = window.OptionPricing;
  const profile = window.SITE_PROFILE || {};
  if (profile.name) {
    $("site-name").textContent = profile.name;
    $("footer-name").textContent = profile.name;
    document.title = profile.name + " · Derivatives Lab";
  }
  if (profile.about) $("about-copy").textContent = profile.about;
  if (/^[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,37}[a-zA-Z0-9])?$/.test(profile.githubUsername || "")) {
    $("github-link").href = "https://github.com/" + profile.githubUsername;
    $("github-link").target = "_blank";
    $("github-link").rel = "noopener noreferrer";
    $("github-link").hidden = false;
  }
  const bounds = {
    spot:[1,10000,"标的价格"], strike:[1,10000,"行权价格"],
    days:[1,3650,"剩余期限"], vol:[1,200,"波动率"],
    rate:[-10,30,"无风险利率"], dividend:[0,30,"连续股息率"]
  };
  const defaults = {spot:100,strike:100,days:180,vol:20,rate:3,dividend:0};
  let state = null, chartMode = "value", geometry = null, hover = null, announcement;
  const canvas = $("chart"), ctx = canvas.getContext("2d");
  const fmt = (n,d=4) => Number.isFinite(n) ? (Math.abs(n)<.5*10**(-d)?0:n).toLocaleString("en-US",{minimumFractionDigits:d,maximumFractionDigits:d}) : "—";
  function rawInputs() {
    const p = {type:document.querySelector('input[name="type"]:checked').value};
    for (const key of Object.keys(bounds)) p[key] = $(key).value.trim() === "" ? NaN : Number($(key).value);
    return p;
  }
  function validateInput(p) {
    if (!p || !["call","put"].includes(p.type)) throw new Error("请选择看涨或看跌期权。");
    for (const [key,[min,max,label]] of Object.entries(bounds)) {
      if (!Number.isFinite(p[key]) || p[key]<min || p[key]>max || (key==="days" && !Number.isInteger(p[key]))) {
        const err = new Error(label+"须为 "+min+" 至 "+max+(key==="days"?" 的整数。":" 之间的数值。"));
        err.field = key;
        throw err;
      }
    }
    return {type:p.type,spot:p.spot,strike:p.strike,years:p.days/365,vol:p.vol/100,rate:p.rate/100,dividend:p.dividend/100};
  }
  function refresh() {
    clearTimeout(announcement);
    Object.keys(bounds).forEach(key=>$(key).removeAttribute("aria-invalid"));
    const raw = rawInputs();
    try {
      const p = validateInput(raw), quote = engine.quote(p);
      state = {p,raw,quote};
      $("input-error").hidden = true;
      $("vol-slider").value = raw.vol;
      $("price").textContent = fmt(quote.price);
      $("intrinsic").textContent = fmt(quote.intrinsic,2);
      const direction = (p.spot-p.strike)*(p.type==="call"?1:-1);
      $("moneyness").textContent = direction===0?"平值 ATM":direction>0?"价内 ITM":"价外 OTM";
      const breakeven = p.strike+(p.type==="call"?quote.price:-quote.price);
      $("breakeven").textContent = breakeven<0?"无非负解":fmt(breakeven,2);
      $("option-label").textContent = "EUROPEAN "+p.type.toUpperCase();
      for (const k of ["delta","gamma","vega","theta","rho"]) $(k).textContent = fmt(quote[k]);
      const call = engine.quote({...p,type:"call"}).price, put = engine.quote({...p,type:"put"}).price;
      const parity = call-put-(p.spot*Math.exp(-p.dividend*p.years)-p.strike*Math.exp(-p.rate*p.years));
      $("parity").textContent = Math.abs(parity)<1e-10?"< 1 × 10⁻¹⁰":parity.toExponential(2);
      renderTable();
      clearTimeout(announcement);
      announcement = setTimeout(()=>{$("result-summary").textContent=(p.type==="call"?"看涨":"看跌")+"期权，理论价格 "+fmt(quote.price)+"，Delta "+fmt(quote.delta)+"。";},250);
    } catch (e) {
      state = null;
      $("input-error").textContent = e.message;
      $("input-error").hidden = false;
      if (e.field) $(e.field).setAttribute("aria-invalid","true");
      for (const id of ["price","intrinsic","moneyness","breakeven","delta","gamma","vega","theta","rho","parity"]) $(id).textContent="—";
      $("scenario-body").replaceChildren();
    }
    hover=null;
    $("chart-tooltip").hidden=true;
    drawChart();
  }
  function point(spot) {
    const q=engine.quote({...state.p,spot});
    const payoff=engine.intrinsic(state.p.type,spot,state.p.strike);
    return {spot,value:q.price,delta:q.delta,profit:payoff-state.quote.price,intrinsic:payoff};
  }
  function renderTable() {
    const fragment=document.createDocumentFragment();
    [-.2,-.1,0,.1,.2].forEach(change=>{
      const p=point(state.p.spot*(1+change));
      const row=document.createElement("tr");
      [(change>0?"+":"")+Math.round(change*100)+"%",fmt(p.spot,2),fmt(p.value),fmt(p.delta),fmt(p.profit)].forEach(v=>{const cell=document.createElement("td");cell.textContent=v;row.appendChild(cell);});
      fragment.appendChild(row);
    });
    $("scenario-body").replaceChildren(fragment);
  }
  const config = {
    value:{title:"期权价值与标的价格",legend:"BSM 理论价格",unit:"期权价格",caption:"其他参数不变，比较不同标的价格下的期权价值；灰线为即刻内在价值。"},
    delta:{title:"Delta 与标的价格",legend:"Delta 敏感度",unit:"Delta",caption:"曲线越陡，Delta 对标的价格的变化越敏感。当前期限、波动率、利率与股息率保持不变。"},
    profit:{title:"买入期权的到期盈亏",legend:"到期净盈亏",unit:"到期盈亏",caption:"到期盈亏 = 到期收益 − 当前理论权利金。忽略手续费与权利金融资成本，非持有期间的市值盈亏。"}
  };
  function setChart(mode,focus=false) {
    if (!config[mode]) throw new Error("未知图表指标。");
    chartMode=mode;
    document.querySelectorAll("[data-chart]").forEach(b=>{const active=b.dataset.chart===mode;b.setAttribute("aria-selected",String(active));b.tabIndex=active?0:-1;if(active&&focus)b.focus();});
    $("chart-title").textContent=config[mode].title;
    $("legend-primary").textContent=config[mode].legend;
    $("legend-secondary").hidden=mode!=="value";
    $("chart-caption").textContent=config[mode].caption;
    $("chart-region").setAttribute("aria-labelledby","tab-"+mode);
    canvas.setAttribute("aria-label",config[mode].title+"；精确情景数值见下方数据表。");
    hover=null;
    $("chart-tooltip").hidden=true;
    drawChart();
  }
  function drawChart() {
    if (!ctx) return;
    const w=canvas.clientWidth,h=canvas.clientHeight,dpr=Math.min(window.devicePixelRatio||1,3);
    if (!w || !h) return;
    canvas.width=Math.round(w*dpr);canvas.height=Math.round(h*dpr);ctx.setTransform(dpr,0,0,dpr,0,0);ctx.clearRect(0,0,w,h);
    if (!state) {ctx.fillStyle="#617085";ctx.textAlign="center";ctx.font="14px sans-serif";ctx.fillText("填写有效参数后显示图表",w/2,h/2);geometry=null;return;}
    const left=w<400?48:56,right=16,top=22,bottom=39;
    const pw=w-left-right,ph=h-top-bottom;
    const minX=state.p.spot*.6,maxX=state.p.spot*1.4;
    const samples=Array.from({length:161},(_,i)=>point(minX+(maxX-minX)*i/160));
    let minY=Math.min(0,...samples.map(p=>p[chartMode])),maxY=Math.max(0,...samples.map(p=>p[chartMode]));
    if(chartMode==="delta"){minY=state.p.type==="call"?0:-1;maxY=state.p.type==="call"?1:0;}
    else{if(chartMode==="value")maxY=Math.max(maxY,...samples.map(p=>p.intrinsic));const span=maxY-minY||1;maxY+=span*.08;if(minY<0)minY-=span*.08;}
    const sx=x=>left+(x-minX)/(maxX-minX)*pw,sy=y=>top+ph-(y-minY)/(maxY-minY)*ph;
    geometry={left,right,top,bottom,w,h,minX,maxX,sx,sy};
    ctx.font="12px -apple-system, sans-serif";ctx.lineWidth=1;
    for(let i=0;i<=4;i++){
      const y=minY+(maxY-minY)*i/4,yp=sy(y);
      ctx.beginPath();ctx.strokeStyle="#e6ebf1";ctx.setLineDash([3,4]);ctx.moveTo(left,yp);ctx.lineTo(w-right,yp);ctx.stroke();ctx.setLineDash([]);
      ctx.fillStyle="#718096";ctx.textAlign="right";ctx.fillText(fmt(y,maxY-minY<2?2:1),left-9,yp+4);
    }
    for(let i=0;i<=4;i++){const x=minX+(maxX-minX)*i/4;ctx.textAlign="center";ctx.fillText(fmt(x,x<10?1:0),sx(x),h-19);}
    ctx.textAlign="left";ctx.fillStyle="#718096";ctx.font="11px -apple-system, sans-serif";ctx.fillText(config[chartMode].unit,left,12);
    ctx.textAlign="right";ctx.fillText(chartMode==="profit"?"到期标的价格":"标的价格",w-right,h-1);
    ctx.save();ctx.beginPath();ctx.rect(left,top,pw,ph);ctx.clip();
    if(minY<0){ctx.beginPath();ctx.strokeStyle="#b6c1ce";ctx.moveTo(left,sy(0));ctx.lineTo(w-right,sy(0));ctx.stroke();}
    const curve=(key,color,width)=>{ctx.beginPath();samples.forEach((p,i)=>{if(i===0)ctx.moveTo(sx(p.spot),sy(p[key]));else ctx.lineTo(sx(p.spot),sy(p[key]));});ctx.strokeStyle=color;ctx.lineWidth=width;ctx.stroke();};
    if(chartMode==="value")curve("intrinsic","#a0adbc",1.5);
    curve(chartMode,"#225ed8",2.7);
    const spot=hover!==null?hover:state.p.spot,q=point(spot),x=sx(spot),y=sy(q[chartMode]);
    ctx.beginPath();ctx.lineWidth=1;ctx.strokeStyle="#92a6c3";ctx.setLineDash([4,4]);ctx.moveTo(x,top);ctx.lineTo(x,top+ph);ctx.stroke();ctx.setLineDash([]);
    ctx.beginPath();ctx.arc(x,y,5,0,2*Math.PI);ctx.fillStyle="#225ed8";ctx.fill();ctx.lineWidth=2;ctx.strokeStyle="#fff";ctx.stroke();ctx.restore();
    if(hover!==null){const tip=$("chart-tooltip");tip.textContent="S = "+fmt(spot,2)+"\n"+config[chartMode].unit+" = "+fmt(q[chartMode]);tip.hidden=false;tip.style.left=Math.min(w-tip.offsetWidth-5,Math.max(5,x+12))+"px";tip.style.top=Math.max(0,Math.min(h-tip.offsetHeight-3,y-tip.offsetHeight-12))+"px";}
  }
  function configure(raw) {
    validateInput(raw);
    Object.keys(bounds).forEach(key=>{$(key).value=raw[key];});
    document.querySelector('input[name="type"][value="'+raw.type+'"]').checked=true;
    refresh();
    return {inputs:state.raw,...state.quote};
  }
  $("pricing-form").addEventListener("submit",e=>e.preventDefault());
  $("pricing-form").addEventListener("input",e=>{if(e.target.id==="vol-slider")$("vol").value=e.target.value;refresh();});
  $("reset").addEventListener("click",()=>configure({...defaults,type:"call"}));
  document.querySelectorAll("[data-preset]").forEach(b=>b.addEventListener("click",()=>{const p={...defaults,type:rawInputs().type};if(b.dataset.preset==="volatile")p.vol=60;if(b.dataset.preset==="expiry")p.days=7;configure(p);}));
  const tabs=[...document.querySelectorAll("[data-chart]")];
  tabs.forEach((b,i)=>{
    b.addEventListener("click",()=>setChart(b.dataset.chart));
    b.addEventListener("keydown",e=>{let j;if(e.key==="ArrowRight")j=(i+1)%tabs.length;if(e.key==="ArrowLeft")j=(i+tabs.length-1)%tabs.length;if(e.key==="Home")j=0;if(e.key==="End")j=tabs.length-1;if(j!==undefined){e.preventDefault();setChart(tabs[j].dataset.chart,true);}});
  });
  canvas.addEventListener("pointermove",e=>{if(!geometry||!state)return;const x=e.clientX-canvas.getBoundingClientRect().left;const {left,right,w,minX,maxX}=geometry;hover=minX+Math.max(0,Math.min(1,(x-left)/(w-left-right)))*(maxX-minX);drawChart();});
  canvas.addEventListener("pointerleave",()=>{hover=null;$("chart-tooltip").hidden=true;drawChart();});
  if(window.ResizeObserver)new ResizeObserver(drawChart).observe(canvas.parentElement);else window.addEventListener("resize",drawChart);
  refresh();
  // Optional browser agent interface; the website works without this proposed API.
  const context=document.modelContext;
  if(context && typeof context.registerTool==="function"){
    const lifecycle=new AbortController();
    const tool={
      name:"configure_european_option",title:"配置欧式期权定价",
      description:"Set all visible option inputs and return the recalculated BSM price and Greeks. Rates and volatility are percentages, days are ACT/365. Changes only this page's calculator.",
      inputSchema:{type:"object",properties:{type:{type:"string",enum:["call","put"]},...Object.fromEntries(Object.entries(bounds).map(([key,[minimum,maximum]])=>[key,{type:key==="days"?"integer":"number",minimum,maximum}]))},required:["type",...Object.keys(bounds)],additionalProperties:false},
      annotations:{readOnlyHint:false,untrustedContentHint:false},
      execute(input){if(!input||typeof input!=="object"||Object.keys(input).some(k=>!["type",...Object.keys(bounds)].includes(k)))throw new Error("输入字段无效。");return configure(input);}
    };
    try{Promise.resolve(context.registerTool(tool,{signal:lifecycle.signal})).catch(()=>{});}catch{}
    window.addEventListener("pagehide",()=>lifecycle.abort(),{once:true});
  }
})();
