# Derivatives Lab

European option pricing and risk analysis using the Black–Scholes–Merton model.

The calculator prices calls and puts with a continuous dividend yield. Change spot, strike, maturity, volatility or rates to compare option values, Greeks and payoff profiles.

## What it does

- Calculates option prices and Delta, Gamma, Vega, Theta and Rho.
- Plots option value, Delta and expiry P&L against the underlying price.
- Reprices each scenario rather than relying on a first-order approximation.
- Checks put–call parity for the current inputs.

The site runs entirely in the browser. It has no external dependencies or live market feed.

## Run locally

Open `index.html` in a browser.

With Node.js installed, run the numerical checks:

```sh
node --test pricing.test.cjs
```

Tests cover reference prices, finite-difference checks of the Greeks, independent integration of the risk-neutral payoff, and parity and price bounds across 500 parameter sets. They also check near-expiry limits and invalid inputs.

## Conventions

| Quantity | Convention |
| --- | --- |
| Prices | Per unit of underlying, without a contract multiplier |
| Time | Calendar days divided by 365 |
| Interest rate and dividend yield | Annual, continuously compounded |
| Volatility | Annualized; entered as a percentage |
| Vega | Price change per 1 percentage point increase in volatility |
| Rho | Price change per 1 percentage point increase in interest rate |
| Theta | Price change per calendar day elapsed |
| Expiry P&L | Terminal payoff less the current model premium |

Greeks are local sensitivities with other inputs held constant. Expiry P&L excludes fees and premium financing costs; it is not a measure of the option's mark-to-market change before expiry.

## Model limits

BSM assumes European exercise, constant volatility and rates, a continuous dividend yield, frictionless markets and continuous trading. This implementation does not model early exercise, discrete cash dividends, volatility smiles or jumps. Inputs are illustrative rather than market quotes.

## Files

| File | Purpose |
| --- | --- |
| `index.html` | Calculator and model notes |
| `styles.css` | Layout and styling |
| `pricing.js` | BSM valuation and analytic Greeks |
| `app.js` | Input validation and charts |
| `profile.js` | Name, GitHub link and project description |
| `pricing.test.cjs` | Numerical tests |

## References

- [CME Group: Option Greeks](https://www.cmegroup.com/education/courses/option-greeks)
- [Yuh-Dauh Lyuu, National Taiwan University: Toward the Black-Scholes Formula](https://www.csie.ntu.edu.tw/~lyuu/finance1/2006/20060329.pdf)
