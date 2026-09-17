# Yue Cui · Derivatives Lab

A reproducible financial engineering project for exploring European options, risk sensitivities and scenario analysis.

一个围绕欧式期权的金融工程学习项目，将定价公式、风险敏感度与交互图表联系起来。

## Features / 功能

- Black–Scholes–Merton pricing for European calls and puts with continuous dividend yield.
- Six adjustable inputs: spot, strike, maturity, volatility, risk-free rate and dividend yield.
- Delta, Gamma, Vega, Theta and Rho, with explicit units.
- Option value, Delta and expiry P&L charts, plus a scenario data table.
- Put–call parity residual and short notes on the model’s assumptions.
- Responsive layout and keyboard-accessible controls. No external APIs, fonts or runtime dependencies.

## Run locally / 本地运行

Open `index.html` in a browser. No installation is needed.

To run the numerical checks with Node.js:

```sh
node --test pricing.test.cjs
```

The test suite covers standard normal reference values, benchmark prices, finite-difference Greeks, independent risk-neutral numerical integration, put–call parity and bounds over 500 deterministic scenarios, expiry limits and invalid input.

## Conventions / 计算约定

- Price outputs are per unit of underlying; there is no contract multiplier.
- Time uses ACT/365. The interface accepts 1–3650 remaining calendar days.
- Rates and dividend yields are annual and continuously compounded. The UI uses percentages; the pricing engine receives decimals.
- Vega and Rho are quoted per one percentage point. Theta is per calendar day of elapsed time.
- Expiry P&L is terminal payoff less the current model premium, excluding fees and premium financing costs.
- Inputs are illustrative scenarios, not live market data.

## Model limitations / 模型边界

BSM assumes European exercise, constant volatility and interest rates, continuous dividend yield, frictionless markets and continuous trading. This implementation does not directly model American early exercise, discrete cash dividends, volatility smiles, jumps or complex structured products.

## Project structure

| File | Purpose |
| --- | --- |
| `index.html` | Interface, model notes and semantic structure |
| `styles.css` | Responsive visual design |
| `pricing.js` | Standalone BSM price and Greeks engine |
| `app.js` | Parameter validation, charts and interaction |
| `profile.js` | Public profile settings |
| `pricing.test.cjs` | Numerical verification |

## References

- [CME Group: Option Greeks](https://www.cmegroup.com/education/courses/option-greeks)
- [Yuh-Dauh Lyuu, National Taiwan University: Toward the Black-Scholes Formula](https://www.csie.ntu.edu.tw/~lyuu/finance1/2006/20060329.pdf)

Built with AI assistance as a financial engineering learning project.
