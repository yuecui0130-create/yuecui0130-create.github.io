"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const {quote,cdf} = require("./pricing.js");
const base = {type:"call",spot:100,strike:100,years:1,vol:.2,rate:.05,dividend:0};
function near(actual,expected,tolerance=1e-8){assert.ok(Math.abs(actual-expected)<=tolerance,`${actual} vs ${expected}; tolerance ${tolerance}`);}
test("standard normal reference probabilities and tail symmetry",()=>{
  near(cdf(0),.5,1e-15);near(cdf(1),.8413447460685429,1e-14);near(cdf(-1.96),.024997895148220435,1e-14);near(cdf(3),.9986501019683699,1e-14);
  for(let x=0;x<=8;x+=.125)near(cdf(x)+cdf(-x),1,1e-14);
});
test("canonical one-year European call and put prices",()=>{
  near(quote(base).price,10.450583572185565);near(quote({...base,type:"put"}).price,5.573526022256971);
  near(quote(base).delta,.6368306511756191);near(quote(base).gamma,.018762017345846895);
});
test("analytic Greeks match independent central finite differences, including dividend and negative rate cases",()=>{
  for(const type of ["call","put"]) for(const extras of [{},{dividend:.03,rate:-.015,spot:92,years:.4},{dividend:.015,rate:.06,spot:118,years:2,vol:.5}]){
    const p={...base,type,...extras},g=quote(p);
    const derivative=(key,h)=> (quote({...p,[key]:p[key]+h}).price-quote({...p,[key]:p[key]-h}).price)/(2*h);
    near(g.delta,derivative("spot",.001),1e-8);
    near(g.gamma,(quote({...p,spot:p.spot+.01}).price-2*g.price+quote({...p,spot:p.spot-.01}).price)/.0001,2e-8);
    near(g.vega,derivative("vol",1e-5)/100,1e-8);
    near(g.rho,derivative("rate",1e-5)/100,1e-8);
    near(g.theta,-derivative("years",1e-5)/365,1e-8);
  }
});
test("discounted risk-neutral payoff integration matches closed-form prices",()=>{
  // Simpson quadrature is independent of the pricing formula. Split at the
  // payoff kink and integrate the nonzero region of a lognormal distribution.
  for(const type of ["call","put"]) {
    const p={...base,type,spot:93,strike:105,years:.7,dividend:.025,rate:.01,vol:.32};
    const sd=p.vol*Math.sqrt(p.years),mu=(p.rate-p.dividend-p.vol*p.vol/2)*p.years;
    const cutoff=(Math.log(p.strike/p.spot)-mu)/sd;
    const a=type==="call"?cutoff:-10,b=type==="call"?10:cutoff,n=10000,h=(b-a)/n;
    function integrand(z){const st=p.spot*Math.exp(mu+sd*z);return Math.max(type==="call"?st-p.strike:p.strike-st,0)*Math.exp(-z*z/2)/Math.sqrt(2*Math.PI);}
    let sum=integrand(a)+integrand(b);
    for(let i=1;i<n;i++)sum+=(i%2?4:2)*integrand(a+i*h);
    near(quote(p).price,Math.exp(-p.rate*p.years)*sum*h/3,1e-8);
  }
});
test("put-call parity, bounds and nonnegative gamma/vega across 500 deterministic scenarios",()=>{
  let seed=17;const rand=()=>{seed=(1664525*seed+1013904223)>>>0;return seed/4294967296;};
  for(let i=0;i<500;i++){
    const p={...base,spot:1+9999*rand(),strike:1+9999*rand(),years:(1+3649*rand())/365,vol:.01+1.99*rand(),rate:-.1+.4*rand(),dividend:.3*rand()};
    const c=quote(p),put=quote({...p,type:"put"}),sd=p.spot*Math.exp(-p.dividend*p.years),kd=p.strike*Math.exp(-p.rate*p.years);
    near(c.price-put.price,sd-kd,1e-9);
    assert.ok(c.price>=Math.max(0,sd-kd)-1e-9&&c.price<=sd+1e-9);
    assert.ok(put.price>=Math.max(0,kd-sd)-1e-9&&put.price<=kd+1e-9);
    for(const q of [c,put]){assert.ok(Object.values(q).every(Number.isFinite));assert.ok(q.gamma>=0&&q.vega>=0);}
  }
});
test("expiry limit and invalid inputs",()=>{
  near(quote({...base,spot:120,years:1e-10}).price,20,1e-8);
  near(quote({...base,type:"put",spot:80,years:1e-10}).price,20,1e-8);
  for(const p of [{spot:0},{strike:-1},{years:0},{vol:0},{rate:NaN},{dividend:Infinity},{type:"unknown"}])assert.throws(()=>quote({...base,...p}),RangeError);
});
