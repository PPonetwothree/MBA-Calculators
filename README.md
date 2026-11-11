# MBA Calculators

80 calculators for business school coursework, covering finance, accounting, operations, optimization, economics, marketing and statistics.

**Live site:** https://mbadecode.netlify.app/

- Results update as you type, so there is no Calculate button.
- Every calculator shows the formula it uses.
- Each calculator has its own URL, and the inputs are saved in the link, so you can share a worked example.
- It works on phones, follows your system's dark mode, and prints cleanly.
- It's plain HTML, CSS and JavaScript, with no build step, no dependencies and no tracking. All calculations run in your browser.

See [DESIGN.md](DESIGN.md) for the design rationale, the full catalogue and ideas for what to add next.

## Calculators

| Area | Calculators |
| --- | --- |
| Finance (18) | NPV & IRR, MIRR, payback (simple and discounted), equivalent annual annuity, time value of money solver, loan amortization, effective annual rate, ROI & CAGR, WACC, CAPM, dividend discount model, DCF valuation, free cash flow, bond price/yield/duration, Black–Scholes with Greeks, two-asset portfolio, portfolio performance, sustainable growth rate |
| Accounting & ratios (7) | Break-even & CVP, margin & markup, depreciation (SL/DDB/SYD), financial ratio analysis, DuPont, cash conversion cycle, operating & financial leverage |
| Operations (18) | EOQ, production order quantity, quantity discount EOQ, safety stock & reorder point, newsvendor, inventory turnover, Little's law, M/M/c queueing, takt time & line balancing, process capacity & bottleneck, OEE, process capability, Six Sigma DPMO, X̄–R chart, p-chart & c-chart, learning curve, capacity utilization, demand forecasting (MA, WMA, exponential smoothing, Holt, trend) |
| Optimization & decisions (7) | Linear programming solver (simplex, integer, shadow prices, graphical view), transportation problem, assignment problem, CPM/PERT, decision analysis (EMV, EVPI, maximin, regret…), make-or-buy crossover, weighted scoring |
| Economics (12) | Elasticity, market equilibrium & tax incidence, monopoly vs competition, Cournot/Stackelberg/Bertrand, Nash equilibrium, firm cost curves, Fisher equation, CPI adjustment, GDP deflator, fiscal multiplier, interest & purchasing power parity, HHI |
| Marketing (8) | Customer lifetime value, CAC/LTV/payback, ROAS & marketing ROI, optimal price from elasticity, TAM/SAM/SOM, conversion funnel, churn & retention, NPS |
| Statistics (10) | Descriptive statistics, regression & correlation, normal distribution, confidence intervals, sample size, t-tests, A/B test, chi-square test, binomial & Poisson, Bayes' theorem |

## Run locally

Open `index.html` in a browser, or serve the folder:

```bash
python3 -m http.server 8000
```

Then visit http://localhost:8000.

## Deploy

The site is static. On Netlify, connect the repository and leave the build command empty, with `.` as the publish directory. `netlify.toml` already sets the security and cache headers.

## Project structure

```
index.html            Page shell (header, sidebar, main)
styles.css            All styles; light and dark themes via CSS variables
js/lib.js             Parsing, formatting, numerics, statistics, LP solver, SVG charts
js/app.js             Routing, search, form rendering, live results, shareable URLs
js/calcs/*.js         Calculator definitions, one file per category
```

## Adding a calculator

Each calculator is a plain object registered with `MC.register(category, [...])`:

```js
{
  id: 'fisher',                       // used in the URL: #/fisher
  name: 'Real interest rate (Fisher)',
  desc: 'One-line description shown in lists.',
  keywords: 'extra search terms',
  inputs: [
    { id: 'n', label: 'Nominal rate', unit: '%', value: 8 },     // number (default type)
    // type: 'list' (numbers), 'text' (multi-line), 'select' (options: [[value, label]])
    // unit: 'cur' shows the chosen currency; optional: true; showIf: v => v.mode === 'x'
  ],
  compute(v) {                        // v holds parsed inputs; throw MC.fail('message') on bad input
    return {
      results: [{ label: 'Real rate', value: 0.0485, fmt: 'pct', key: true }],
      tables: [{ head: [...], fmts: [...], rows: [...] }],   // optional
      charts: [{ type: 'line', series: [{ name, points }] }], // optional
      notes: ['Plain-language note']                          // optional
    };
  },
  formula: ['(1 + nominal) = (1 + real)(1 + inflation)']
}
```

Result formats are `money`, `pct` (pass a fraction), `int`, `d2`, `d4`, `x` (a multiple) and `text`.

## Disclaimer

The calculators are for study and estimation. Check important decisions against your own models.
