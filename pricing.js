/* Black–Scholes–Merton, European options with continuous dividend yield.
 * Monetary outputs are per one unit of underlying, without contract multiplier.
 * Inputs: years; annual continuous rates/volatility as decimals.
 * Greeks: theta per calendar day, vega/rho per +1 percentage point.
 */
(function (root) {
  "use strict";
  const pdf = x => Math.exp(-0.5 * x * x) / Math.sqrt(2 * Math.PI);
  // Integrate the standard normal density by a convergent power series.
  // Symmetry and saturation beyond 8 standard deviations bound tail error.
  function cdf(x) {
    if (x <= -8) return 0;
    if (x >= 8) return 1;
    let term = x, sum = x;
    for (let i = 3; i < 1000; i += 2) {
      term *= x * x / i;
      const next = sum + term;
      if (next === sum) break;
      sum = next;
    }
    return Math.min(1, Math.max(0, 0.5 + sum * pdf(x)));
  }
  function intrinsic(type, spot, strike) {
    return Math.max(type === "call" ? spot - strike : strike - spot, 0);
  }
  function validate(p) {
    if (!p || !["call", "put"].includes(p.type)) throw new RangeError("Option type must be call or put.");
    for (const k of ["spot", "strike", "years", "vol", "rate", "dividend"]) {
      if (!Number.isFinite(p[k])) throw new RangeError("All pricing inputs must be finite numbers.");
    }
    if (p.spot <= 0 || p.strike <= 0 || p.years <= 0 || p.vol <= 0) throw new RangeError("Spot, strike, time to expiry and volatility must be positive.");
  }
  function quote(p) {
    validate(p);
    const {spot:S, strike:K, years:T, vol:v, rate:r, dividend:q, type} = p;
    const sqrtT = Math.sqrt(T), dq = Math.exp(-q*T), dr = Math.exp(-r*T);
    const d1 = (Math.log(S/K)+(r-q+v*v/2)*T)/(v*sqrtT), d2 = d1-v*sqrtT;
    const n = pdf(d1), isCall = type === "call", sign = isCall ? 1 : -1;
    const nd1 = cdf(sign*d1), nd2 = cdf(sign*d2);
    const price = Math.max(0, sign*(S*dq*nd1-K*dr*nd2));
    return {
      price, intrinsic: intrinsic(type,S,K), d1, d2,
      delta: sign*dq*nd1,
      gamma: dq*n/(S*v*sqrtT),
      vega: S*dq*n*sqrtT/100,
      theta: (-S*dq*n*v/(2*sqrtT)-sign*r*K*dr*nd2+sign*q*S*dq*nd1)/365,
      rho: sign*K*T*dr*nd2/100
    };
  }
  const api = Object.freeze({quote, cdf, pdf, intrinsic});
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.OptionPricing = api;
})(typeof globalThis !== "undefined" ? globalThis : this);
