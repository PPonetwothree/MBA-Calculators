# Design notes

This records why the app was rebuilt the way it was, what it now covers, and what could come next.

## 1. Problems with the previous version

| Problem | Effect |
| --- | --- |
| Purple gradients, emoji headings, card hover animations, "AI-powered insights" | It looked like a generic AI template, and students didn't trust the numbers. |
| "AI insights" were canned if/else text | They claimed more than the code did, and the text was often vague or wrong for the inputs. |
| Each calculator opened in a modal, with a Calculate button | You couldn't link to a calculator, the back button closed the page, and every change needed an extra click. |
| 11 calculators | Large gaps in operations, optimization, economics and statistics. |
| No formulas shown | Students couldn't check the method against their coursework. |
| Chart.js loaded from a CDN with no version pinned | Updates could break it, and charts didn't adapt to dark mode. |
| `Cache-Control: immutable` on JS/CSS that weren't fingerprinted | Returning visitors would keep stale code for a year. |

## 2. Design principles

1. **Playful 8-bit look, serious numbers.** An original retro theme: pixel fonts (Press Start 2P for headings and score-style results, VT323 for readable body text), notched pixel frames with hard shadows, a small fixed palette, a colour and an 8×8 pixel icon for each category ("world"), score-box results and a terminal-style formula panel. There is no copied game art, blinking and animation respect reduced-motion settings, and long text stays in the readable font.
2. **Results first, and live.** Inputs on the left, results on the right, recalculated on every keystroke. The headline numbers are large; the secondary ones sit in a quiet two-column list.
3. **Show the work.** Every page ends with its formula. Where it helps, there's a schedule table (cash flows, amortization, depreciation, CPM) and a chart.
4. **Every calculator has its own URL, and inputs live in the link.** `#/eoq?d=24000` reopens exactly what you saw, so students can paste a worked example into notes or a group chat.
5. **Honest, factual notes only.** Short notes state facts ("NPV is positive at 10%", "expected counts below 5 make chi-square unreliable"). There is no generated advice.
6. **Errors say what to fix.** "Annual demand: enter a number" or "Arrival rate must be less than c × μ (20.00)" appears in place of the results, with no alerts.
7. **Fast and private.** About 200 KB of uncompressed JS and CSS (much smaller gzipped), no framework, no build, no network calls after load, and a strict Content-Security-Policy.

## 3. Layout

```
┌──────────────────────────────────────────────────────────────┐
│ MBA Calculators   [ Search calculators      / ]   Currency $ │
├────────────┬─────────────────────────────────────────────────┤
│ FINANCE    │ All calculators / Finance                       │
│  NPV & IRR │ NPV & IRR                                       │
│  MIRR      │ One-line description                            │
│  …         │ ┌───────────────┬──────────────────────────────┐│
│ OPERATIONS │ │ INPUTS        │ RESULTS                      ││
│  EOQ       │ │ Discount rate │ ┌ NPV ────────┬ IRR ───────┐ ││
│  …         │ │ [10      ] %  │ │ $48,032.61  │ 25.75%     │ ││
│            │ │ Cash flows    │ └─────────────┴────────────┘ ││
│            │ │ [-100000, …]  │ Profitability index  1.4803  ││
│            │ │ [Reset][Copy] │ PV of inflows   $148,032.61  ││
│            │ └───────────────┴──────────────────────────────┘│
│            │ Chart · schedule table · formula · related      │
└────────────┴─────────────────────────────────────────────────┘
```

- **Sidebar:** every calculator, grouped by subject. It filters as you search and collapses behind a Menu button below 960px.
- **Search:** press `/` to focus it and Enter to open the first match. It matches names, descriptions and synonyms ("emi", "hungarian", "wilson", "ytm" all work).
- **Currency selector:** $, €, £, ₹, ¥ or none. It is remembered per browser.
- **Mobile:** inputs stack above results, there's no horizontal scrolling, and wide tables scroll inside their own box.
- **Dark mode** follows the system setting; charts use the same colour tokens.
- **Print:** navigation and buttons are hidden, and inputs and results print side by side.

## 4. Calculator catalogue

**80 are built.** The items marked *(proposed)* are good candidates for the next round.

### Finance
Built: NPV & IRR · MIRR · payback & discounted payback · equivalent annual annuity · TVM solver (N, I/Y, PV, PMT, FV) · loan amortization with extra payments · effective annual rate · ROI & CAGR · WACC · CAPM with the security market line · dividend discount (Gordon and two-stage) · DCF valuation · FCFF/FCFE · bond price, YTM, duration and convexity · Black–Scholes with Greeks · two-asset portfolio with frontier and tangency portfolio · Sharpe/Treynor/Jensen/M² · sustainable and internal growth.

Proposed: APV and flow-to-equity valuation · lease vs buy · binomial option tree · put–call parity checker · forward/futures pricing with carry · Value at Risk (parametric and historical) · n-asset mean–variance optimizer · beta from return series · yield curve bootstrapping · capital rationing (via the LP solver) · comparable-company multiples · working capital financing needs · M&A accretion/dilution · cost of equity via build-up/Fama–French.

### Accounting & ratios
Built: break-even & CVP · margin & markup · depreciation (SL, DDB, SYD) · full ratio analysis · DuPont (3- and 5-step) · cash conversion cycle · DOL/DFL/DTL.

Proposed: multi-product break-even (sales mix) · activity-based costing allocation · standard costing variance analysis (price, quantity, efficiency, volume) · absorption vs variable costing reconciliation · units-of-production depreciation · relevant cost (special order, keep/drop) · Altman Z-score · pro-forma statements from percent of sales.

### Operations
Built: EOQ · EPQ · quantity-discount EOQ · safety stock and reorder point · newsvendor · inventory turnover · Little's law · M/M/c queue with staffing cost comparison · takt time and line balancing (longest-task heuristic with precedence) · process capacity and bottleneck · OEE · Cp/Cpk · DPMO and sigma level · X̄–R chart · p- and c-charts · learning curve · capacity utilization · forecasting (MA, WMA, SES, Holt, trend) with MAD/MSE/MAPE/tracking signal.

Proposed: ABC inventory classification · periodic-review (order-up-to) model · MRP explosion · aggregate planning (level vs chase vs mixed, via LP) · project crashing (time–cost trade-off) · seasonal forecasting (Holt–Winters, seasonal indices) · M/G/1 and finite-queue models · Kanban count · acceptance sampling OC curve · center-of-gravity location · break-even location analysis · Johnson's rule two-machine sequencing · priority rules (FCFS, SPT, EDD) scheduling · bullwhip/variance amplification.

### Optimization & decisions
Built: general LP solver (two-phase simplex, integer branch and bound, shadow prices, slack, 2-D feasible region with corner points) · transportation (auto-balancing) · assignment (min/max, unbalanced) · CPM/PERT with completion probability · payoff-table decision analysis (EMV, EVPI, maximax, maximin, Hurwicz, Laplace, minimax regret) · make-or-buy crossover · weighted scoring.

Proposed: decision tree with roll-back · Bayesian revision with expected value of sample information · LP sensitivity ranges (objective coefficients and RHS) · goal programming · 0–1 knapsack and capital budgeting selection · shortest path / minimum spanning tree / maximum flow · nonlinear single-variable optimizer · Monte Carlo simulation for a simple P&L · AHP pairwise comparison.

### Economics
Built: arc elasticities (price, income, cross) · equilibrium with tax incidence and deadweight loss · monopoly vs competition · Cournot/Stackelberg/Bertrand/collusion · Nash equilibria (pure for any size, mixed for 2×2) · firm cost curves and shutdown rule · Fisher equation · CPI adjustment · GDP deflator and real growth · fiscal multiplier · covered interest parity and relative PPP · HHI with merger screening.

Proposed: price ceilings/floors and subsidies · third-degree price discrimination · two-part tariff · consumer optimum (Cobb–Douglas utility) · Cobb–Douglas production and returns to scale · Solow growth steady state · IS–LM equilibrium · Taylor rule · Phillips curve / Okun's law estimates · present value of a perpetuity under inflation · repeated prisoner's dilemma (discount factor needed to cooperate).

### Marketing
Built: CLV with retention table · CAC/LTV/payback · ROAS & ROI · optimal price from elasticity · TAM/SAM/SOM · funnel · churn & retention · NPS with margin of error.

Proposed: Bass diffusion model · conjoint part-worth utilities and market share simulator · Van Westendorp price sensitivity · market share from a logit model · RFM scoring · advertising reach/frequency/GRP · cohort retention curves · break-even advertising lift · Lanchester/share-of-voice models.

### Statistics
Built: descriptive statistics with histogram · simple regression with significance and prediction · normal probabilities and percentiles · confidence intervals (mean, proportion) · sample size · one- and two-sample t-tests · A/B test · chi-square independence · binomial and Poisson · Bayes' theorem.

Proposed: multiple regression (matrix least squares) · one-way ANOVA · paired t-test · two-proportion confidence interval and power analysis · correlation matrix · goodness-of-fit chi-square · nonparametric tests (Mann–Whitney, Wilcoxon) · exponential and uniform distributions · time-series decomposition · z-table and t-table lookups.

## 5. Next steps beyond calculators

1. **Sensitivity sliders.** Let users drag the one or two most important inputs (discount rate, growth, demand) and watch the key result move. The live engine already supports this.
2. **Scenario compare.** Pin the current results, change inputs, and see the two scenarios side by side.
3. **CSV paste and export.** Paste a column from Excel into list inputs (tab and newline separators already work), and download result tables as CSV.
4. **Worked examples.** Add a "Load textbook example" menu with two or three classic problems per calculator.
5. **Automated tests.** Turn the textbook-value checks used during this rebuild into a `node --test` suite that runs in CI.
6. **Offline support.** A small service worker would make the site an installable PWA for exam rooms without Wi-Fi.
