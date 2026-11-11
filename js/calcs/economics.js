(function () {
  'use strict';
  const M = window.MC;
  const { need, fmt, sum } = M;
  const r = (label, value, f, key, hint) => ({ label, value, fmt: f, key, hint });
  const sec = section => ({ section });
  const pct = v => v / 100;

  M.register('economics', [
    {
      id: 'elasticity', name: 'Elasticity (midpoint)', desc: 'Price, income or cross-price elasticity of demand using the arc (midpoint) method.',
      keywords: 'price elasticity of demand income elasticity cross price elasticity arc midpoint elastic inelastic',
      inputs: [
        { id: 'type', label: 'Type', type: 'select', value: 'price', options: [['price', 'Own-price elasticity'], ['income', 'Income elasticity'], ['cross', 'Cross-price elasticity']] },
        { id: 'q1', label: 'Quantity before', value: 1000 },
        { id: 'q2', label: 'Quantity after', value: 800 },
        { id: 'x1', label: 'Price / income / other good\'s price before', value: 10 },
        { id: 'x2', label: 'Price / income / other good\'s price after', value: 12 }
      ],
      compute(v) {
        need(v.x1 !== v.x2, 'The before and after values of the driver must differ.');
        const dq = (v.q2 - v.q1) / ((v.q1 + v.q2) / 2), dx = (v.x2 - v.x1) / ((v.x1 + v.x2) / 2), e = dq / dx;
        let cls;
        if (v.type === 'price') { const a = Math.abs(e); cls = a > 1 ? 'Elastic (|E| > 1)' : a < 1 ? 'Inelastic (|E| < 1)' : 'Unit elastic'; }
        else if (v.type === 'income') cls = e < 0 ? 'Inferior good' : e > 1 ? 'Luxury (normal) good' : 'Necessity (normal) good';
        else cls = e > 0 ? 'Substitutes' : e < 0 ? 'Complements' : 'Unrelated';
        const res = [r('Elasticity', e, 'd4', true), r('Interpretation', cls, 'text', true), r('% change in quantity (midpoint)', dq, 'pct'), r('% change in driver (midpoint)', dx, 'pct')];
        if (v.type === 'price') res.push(r('Revenue before', v.q1 * v.x1, 'money'), r('Revenue after', v.q2 * v.x2, 'money'));
        return { results: res };
      },
      formula: ['E = [(Q₂ − Q₁)/((Q₁ + Q₂)/2)] / [(X₂ − X₁)/((X₁ + X₂)/2)]']
    },
    {
      id: 'equilibrium', name: 'Market equilibrium & tax', desc: 'Equilibrium price and quantity, consumer and producer surplus, and the effect of a per-unit tax.',
      keywords: 'supply and demand equilibrium consumer surplus producer surplus deadweight loss tax incidence',
      inputs: [
        { id: 'a', label: 'Demand intercept a (Qd = a − bP)', value: 100 },
        { id: 'b', label: 'Demand slope b', value: 2 },
        { id: 'c', label: 'Supply intercept c (Qs = c + dP)', value: 10 },
        { id: 'd', label: 'Supply slope d', value: 1 },
        { id: 't', label: 'Per-unit tax on sellers', unit: 'cur', value: 6 }
      ],
      compute(v) {
        need(v.b > 0 && v.d > 0, 'Slopes b and d must be positive.');
        const P = (v.a - v.c) / (v.b + v.d), Q = v.a - v.b * P;
        need(Q > 0, 'No positive equilibrium quantity with these curves.');
        const cs = (q, p) => (v.a * q - q * q / 2) / v.b - p * q, ps = (q, p) => p * q - (q * q / 2 - v.c * q) / v.d;
        const Pb = (v.a - v.c + v.d * v.t) / (v.b + v.d), Ps = Pb - v.t, Qt = Math.max(0, v.a - v.b * Pb);
        const cs0 = cs(Q, P), ps0 = ps(Q, P), cs1 = cs(Qt, Pb), ps1 = ps(Qt, Ps), tr = v.t * Qt;
        const qmax = Math.max(Q * 1.4, 1), qs = M.range(0, qmax, 2);
        return {
          results: [
            r('Equilibrium price', P, 'money', true), r('Equilibrium quantity', Q, 'd2', true),
            r('Consumer surplus', cs0, 'money'), r('Producer surplus', ps0, 'money'),
            sec('With tax of ' + fmt(v.t, 'money') + ' per unit'),
            r('Price buyers pay', Pb, 'money'), r('Price sellers keep', Ps, 'money'), r('Quantity', Qt, 'd2'),
            r('Tax revenue', tr, 'money'), r('Deadweight loss', cs0 + ps0 - cs1 - ps1 - tr, 'money', true),
            r('Share of tax borne by buyers', v.t ? (Pb - P) / v.t : NaN, 'pct')
          ],
          charts: [{ type: 'line', title: 'Supply and demand', xLabel: 'Quantity', yLabel: 'Price',
            series: [{ name: 'Demand', points: qs.map(q => [q, (v.a - q) / v.b]) }, { name: 'Supply', points: qs.map(q => [q, (q - v.c) / v.d]) }, { name: 'Supply + tax', points: qs.map(q => [q, (q - v.c) / v.d + v.t]), dashed: true }],
            hlines: [{ y: P, label: 'P*' }] }]
        };
      },
      formula: ['P* = (a − c) / (b + d)', 'With tax t: buyers pay (a − c + d·t)/(b + d), sellers keep that minus t', 'DWL = surplus lost − tax revenue']
    },
    {
      id: 'monopoly', name: 'Monopoly vs competition', desc: 'Profit-maximizing output and price for a monopolist with linear demand, compared with perfect competition.',
      keywords: 'monopoly pricing marginal revenue marginal cost deadweight loss lerner index market power profit maximization',
      inputs: [
        { id: 'a', label: 'Demand intercept a (P = a − bQ)', unit: 'cur', value: 100 },
        { id: 'b', label: 'Demand slope b', value: 0.5 },
        { id: 'c', label: 'Marginal cost (constant)', unit: 'cur', value: 20 },
        { id: 'f', label: 'Fixed cost', unit: 'cur', value: 1000 }
      ],
      compute(v) {
        need(v.b > 0 && v.a > v.c, 'Need b > 0 and a > marginal cost.');
        const qm = (v.a - v.c) / (2 * v.b), pm = v.a - v.b * qm, qc = (v.a - v.c) / v.b;
        const pi = (pm - v.c) * qm - v.f, dwl = 0.5 * (qc - qm) * (pm - v.c);
        const qs = M.range(0, qc * 1.1, 2);
        return {
          results: [
            r('Monopoly quantity', qm, 'd2', true), r('Monopoly price', pm, 'money', true), r('Monopoly profit', pi, 'money', true),
            r('Lerner index (P − MC)/P', (pm - v.c) / pm, 'pct'), r('Price elasticity at monopoly point', -pm / (v.b * qm), 'd4'),
            sec('Perfect competition'), r('Competitive quantity', qc, 'd2'), r('Competitive price', v.c, 'money'),
            r('Deadweight loss from monopoly', dwl, 'money', true),
            r('Consumer surplus (monopoly)', 0.5 * qm * (v.a - pm), 'money'), r('Consumer surplus (competition)', 0.5 * qc * (v.a - v.c), 'money')
          ],
          charts: [{ type: 'line', title: 'Demand, marginal revenue and marginal cost', xLabel: 'Quantity', yLabel: 'Price',
            series: [{ name: 'Demand', points: qs.map(q => [q, v.a - v.b * q]) }, { name: 'Marginal revenue', points: qs.map(q => [q, v.a - 2 * v.b * q]), dashed: true }, { name: 'Marginal cost', points: qs.map(q => [q, v.c]) }],
            vlines: [{ x: qm, label: 'Qm' }] }]
        };
      },
      formula: ['MR = a − 2bQ;  set MR = MC → Q = (a − c)/2b', 'Competition: P = MC → Q = (a − c)/b', 'DWL = ½ × (Q_c − Q_m) × (P_m − MC)']
    },
    {
      id: 'cournot', name: 'Duopoly: Cournot, Stackelberg, Bertrand', desc: 'Output, price and profit for two firms facing linear demand.',
      keywords: 'oligopoly duopoly cournot stackelberg bertrand nash equilibrium game theory quantity competition',
      inputs: [
        { id: 'a', label: 'Demand intercept a (P = a − bQ)', unit: 'cur', value: 120 },
        { id: 'b', label: 'Demand slope b', value: 1 },
        { id: 'c1', label: 'Firm 1 marginal cost', unit: 'cur', value: 20 },
        { id: 'c2', label: 'Firm 2 marginal cost', unit: 'cur', value: 20 }
      ],
      compute(v) {
        const { a, b, c1, c2 } = v;
        need(b > 0, 'Slope must be positive.');
        const row = (name, q1, q2, P) => {
          q1 = Math.max(0, q1); q2 = Math.max(0, q2);
          if (P === undefined) P = a - b * (q1 + q2);
          return [name, q1, q2, P, (P - c1) * q1, (P - c2) * q2];
        };
        const cq1 = (a - 2 * c1 + c2) / (3 * b), cq2 = (a - 2 * c2 + c1) / (3 * b);
        const sq1 = (a - 2 * c1 + c2) / (2 * b), sq2 = (a - c2 - b * Math.max(0, sq1)) / (2 * b);
        const cmin = Math.min(c1, c2), mq = (a - cmin) / (2 * b);
        const bP = c1 === c2 ? c1 : Math.max(c1, c2);
        const bq = (a - bP) / b;
        const rows = [
          row('Cournot', cq1, cq2),
          row('Stackelberg (firm 1 leads)', sq1, sq2),
          row('Bertrand', c1 < c2 ? bq : c1 === c2 ? bq / 2 : 0, c2 < c1 ? bq : c1 === c2 ? bq / 2 : 0, bP),
          row('Collusion (joint monopoly)', c1 <= c2 ? (c1 === c2 ? mq / 2 : mq) : 0, c2 < c1 ? mq : c1 === c2 ? mq / 2 : 0)
        ];
        const C = rows[0];
        return {
          results: [r('Cournot output, firm 1', C[1], 'd2', true), r('Cournot output, firm 2', C[2], 'd2', true), r('Cournot price', C[3], 'money', true), r('Cournot profit, firm 1', C[4], 'money'), r('Cournot profit, firm 2', C[5], 'money')],
          tables: [{ head: ['Model', 'q₁', 'q₂', 'Price', 'Profit 1', 'Profit 2'], fmts: ['text', 'd2', 'd2', 'money', 'money', 'money'], rows }],
          notes: ['Bertrand with unequal costs: the low-cost firm prices just below the rival\'s cost and serves the whole market.']
        };
      },
      formula: ['Cournot: qᵢ = (a − 2cᵢ + cⱼ) / 3b', 'Stackelberg leader: q₁ = (a − 2c₁ + c₂) / 2b; follower: q₂ = (a − c₂ − bq₁) / 2b']
    },
    {
      id: 'nash', name: 'Nash equilibrium (2-player game)', desc: 'Pure-strategy equilibria for any two-player matrix game, and the mixed equilibrium for 2×2 games.',
      keywords: 'game theory nash equilibrium prisoners dilemma dominant strategy mixed strategy payoff matrix',
      inputs: [
        { id: 'g', label: 'Payoffs as row/column, one row per line', type: 'text', rows: 4, value: '3/3  0/5\n5/0  1/1', help: 'Each cell is "row player payoff/column player payoff". Separate cells with spaces or commas.' }
      ],
      compute(v) {
        const rows = String(v.g).split('\n').map(l => l.trim()).filter(Boolean).map((l, i) => l.split(/[\s,;]+/).filter(Boolean).map(cell => {
          const p = cell.split('/').map(Number);
          need(p.length === 2 && p.every(Number.isFinite), 'Line ' + (i + 1) + ': cell "' + cell + '" must look like 3/2.');
          return p;
        }));
        need(rows.length >= 2 && rows.every(x => x.length === rows[0].length) && rows[0].length >= 2, 'Enter at least a 2×2 matrix with equal-length rows.');
        const m = rows.length, n = rows[0].length;
        const A = rows.map(x => x.map(c => c[0])), B = rows.map(x => x.map(c => c[1]));
        const pure = [];
        for (let i = 0; i < m; i++) for (let j = 0; j < n; j++) {
          const bestRow = A.every(rw => rw[j] <= A[i][j]), bestCol = B[i].every(x => x <= B[i][j]);
          if (bestRow && bestCol) pure.push('(R' + (i + 1) + ', C' + (j + 1) + ') → ' + A[i][j] + '/' + B[i][j]);
        }
        const domRow = A.findIndex((rw, i) => A.every((o, k) => k === i || rw.every((x, j) => x >= o[j])));
        const domCol = B[0].map((_, j) => j).find(j => B[0].map((_, k) => k).every(k => k === j || B.every(rw => rw[j] >= rw[k])));
        const res = [
          r('Pure-strategy Nash equilibria', pure.length ? pure.join('; ') : 'None', 'text', true),
          r('Dominant strategy, row player', domRow >= 0 ? 'R' + (domRow + 1) : 'None', 'text'),
          r('Dominant strategy, column player', domCol !== undefined ? 'C' + (domCol + 1) : 'None', 'text')
        ];
        if (m === 2 && n === 2) {
          const dp = B[0][0] - B[1][0] - B[0][1] + B[1][1], dq = A[0][0] - A[0][1] - A[1][0] + A[1][1];
          const p = dp ? (B[1][1] - B[1][0]) / dp : NaN, q = dq ? (A[1][1] - A[0][1]) / dq : NaN;
          if (p > 0 && p < 1 && q > 0 && q < 1) {
            res.push(sec('Mixed-strategy equilibrium'), r('Row player plays R1 with probability', p, 'pct'), r('Column player plays C1 with probability', q, 'pct'),
              r('Expected payoff, row', q * A[0][0] + (1 - q) * A[0][1], 'd4'), r('Expected payoff, column', p * B[0][0] + (1 - p) * B[1][0], 'd4'));
          } else res.push(r('Mixed-strategy equilibrium', 'None in the interior', 'text'));
        }
        return { results: res, tables: [{ head: [''].concat(B[0].map((_, j) => 'C' + (j + 1))), fmts: [], rows: A.map((rw, i) => ['R' + (i + 1)].concat(rw.map((x, j) => x + ' / ' + B[i][j]))) }] };
      },
      formula: ['A cell is a Nash equilibrium if neither player can gain by changing strategy alone', '2×2 mixed: each player mixes so the other is indifferent between strategies']
    },
    {
      id: 'costcurves', name: 'Firm cost curves', desc: 'ATC, AVC and MC for a quadratic cost function, with the profit-maximizing output at a given price.',
      keywords: 'perfect competition cost curves average total cost marginal cost shutdown price break even price',
      inputs: [
        { id: 'f', label: 'Fixed cost F', unit: 'cur', value: 500 },
        { id: 'a', label: 'Linear cost coefficient a', value: 10 },
        { id: 'b', label: 'Quadratic cost coefficient b', value: 0.5 },
        { id: 'p', label: 'Market price', unit: 'cur', value: 50 }
      ],
      compute(v) {
        need(v.b > 0 && v.f >= 0, 'Need b > 0 and F ≥ 0.');
        const tc = q => v.f + v.a * q + v.b * q * q;
        const qe = Math.sqrt(v.f / v.b), minAtc = tc(qe) / qe;
        const q = Math.max(0, (v.p - v.a) / (2 * v.b));
        const produce = v.p >= v.a;
        const qs = M.range(Math.max(0.5, qe * 0.15), Math.max(qe, q) * 2, 60);
        return {
          results: [
            r('Profit-maximizing output (P = MC)', produce ? q : 0, 'd2', true),
            r('Profit', produce ? v.p * q - tc(q) : -v.f, 'money', true),
            r('Break-even price (min ATC)', minAtc, 'money'), r('Output at min ATC', qe, 'd2'),
            r('Shutdown price (min AVC)', v.a, 'money'),
            r('Decision', v.p >= minAtc ? 'Produce, earning a profit' : produce ? 'Produce in the short run, at a loss' : 'Shut down', 'text')
          ],
          charts: [{ type: 'line', title: 'Cost curves', xLabel: 'Quantity', yLabel: 'Cost per unit',
            series: [{ name: 'MC', points: qs.map(x => [x, v.a + 2 * v.b * x]) }, { name: 'ATC', points: qs.map(x => [x, tc(x) / x]) }, { name: 'AVC', points: qs.map(x => [x, v.a + v.b * x]), dashed: true }],
            hlines: [{ y: v.p, label: 'Price' }] }]
        };
      },
      formula: ['TC = F + aQ + bQ²;  MC = a + 2bQ;  AVC = a + bQ;  ATC = TC/Q', 'Min ATC at Q = √(F/b)']
    },
    {
      id: 'fisher', name: 'Real interest rate (Fisher)', desc: 'Real rate from nominal rate and inflation, exact and approximate.',
      keywords: 'fisher equation real interest rate nominal inflation',
      inputs: [
        { id: 'n', label: 'Nominal interest rate', unit: '%', value: 8 },
        { id: 'i', label: 'Inflation rate', unit: '%', value: 3 }
      ],
      compute(v) {
        return { results: [r('Real interest rate (exact)', (1 + pct(v.n)) / (1 + pct(v.i)) - 1, 'pct', true), r('Real interest rate (approximate)', pct(v.n - v.i), 'pct')] };
      },
      formula: ['(1 + nominal) = (1 + real)(1 + inflation)', 'Approximation: real ≈ nominal − inflation']
    },
    {
      id: 'cpi', name: 'Inflation adjustment (CPI)', desc: 'Convert money between years using a price index, and find the inflation rate.',
      keywords: 'cpi consumer price index inflation adjust purchasing power real value constant dollars',
      inputs: [
        { id: 'amt', label: 'Amount', unit: 'cur', value: 1000 },
        { id: 'i1', label: 'Price index, original year', value: 218.1 },
        { id: 'i2', label: 'Price index, target year', value: 310.3 },
        { id: 'years', label: 'Years between them', value: 14 }
      ],
      compute(v) {
        const g = v.i2 / v.i1;
        return { results: [r('Equivalent amount in target year', v.amt * g, 'money', true), r('Cumulative inflation', g - 1, 'pct'), r('Average annual inflation', v.years > 0 ? Math.pow(g, 1 / v.years) - 1 : NaN, 'pct')] };
      },
      formula: ['Value₂ = Value₁ × Index₂ / Index₁']
    },
    {
      id: 'gdp', name: 'GDP deflator & real growth', desc: 'Real GDP, deflator-based inflation and real growth between two years.',
      keywords: 'gdp deflator real gdp nominal gdp economic growth',
      inputs: [
        { id: 'n1', label: 'Nominal GDP, year 1', unit: 'cur', value: 20000 },
        { id: 'n2', label: 'Nominal GDP, year 2', unit: 'cur', value: 21500 },
        { id: 'd1', label: 'GDP deflator, year 1', value: 100 },
        { id: 'd2', label: 'GDP deflator, year 2', value: 103 }
      ],
      compute(v) {
        const r1 = v.n1 / v.d1 * 100, r2 = v.n2 / v.d2 * 100;
        return { results: [r('Real GDP growth', r2 / r1 - 1, 'pct', true), r('Nominal GDP growth', v.n2 / v.n1 - 1, 'pct'), r('Inflation (deflator)', v.d2 / v.d1 - 1, 'pct'), r('Real GDP, year 1', r1, 'money'), r('Real GDP, year 2', r2, 'money')] };
      },
      formula: ['Real GDP = Nominal GDP / Deflator × 100']
    },
    {
      id: 'multiplier', name: 'Fiscal multiplier', desc: 'Spending and tax multipliers in a simple Keynesian model with taxes and imports.',
      keywords: 'keynesian multiplier marginal propensity to consume mpc mps government spending tax multiplier aggregate demand',
      inputs: [
        { id: 'mpc', label: 'Marginal propensity to consume', value: 0.8 },
        { id: 't', label: 'Marginal tax rate', unit: '%', value: 20 },
        { id: 'mpi', label: 'Marginal propensity to import', value: 0.1 },
        { id: 'dg', label: 'Change in government spending', unit: 'cur', value: 100 },
        { id: 'dt', label: 'Change in lump-sum taxes', unit: 'cur', value: 0 }
      ],
      compute(v) {
        need(v.mpc > 0 && v.mpc < 1, 'MPC must be between 0 and 1.');
        const den = 1 - v.mpc * (1 - pct(v.t)) + v.mpi, k = 1 / den, kt = -v.mpc / den;
        return {
          results: [r('Spending multiplier', k, 'd4', true), r('Tax multiplier', kt, 'd4'), r('Simple multiplier 1/(1 − MPC)', 1 / (1 - v.mpc), 'd4'),
            r('Change in output', k * v.dg + kt * v.dt, 'money', true)]
        };
      },
      formula: ['k = 1 / [1 − MPC(1 − t) + MPI]', 'Tax multiplier = −MPC / [1 − MPC(1 − t) + MPI]']
    },
    {
      id: 'parity', name: 'Interest & purchasing power parity', desc: 'Forward exchange rate from covered interest parity and expected spot from relative PPP.',
      keywords: 'interest rate parity forward exchange rate purchasing power parity ppp currency fx international finance',
      inputs: [
        { id: 's', label: 'Spot rate (domestic per 1 foreign)', value: 83.2 },
        { id: 'id', label: 'Domestic interest rate', unit: '%', value: 6.5 },
        { id: 'if', label: 'Foreign interest rate', unit: '%', value: 4.5 },
        { id: 'pd', label: 'Domestic inflation', unit: '%', value: 5 },
        { id: 'pf', label: 'Foreign inflation', unit: '%', value: 2.5 },
        { id: 't', label: 'Horizon', unit: 'years', value: 1 }
      ],
      compute(v) {
        const f = v.s * Math.pow((1 + pct(v.id)) / (1 + pct(v.if)), v.t), e = v.s * Math.pow((1 + pct(v.pd)) / (1 + pct(v.pf)), v.t);
        return {
          results: [r('Forward rate (CIP)', f, 'd4', true), r('Forward premium (+) / discount (−) on foreign currency', f / v.s - 1, 'pct'),
            r('Expected spot rate (relative PPP)', e, 'd4', true), r('Expected change in foreign currency value', e / v.s - 1, 'pct')]
        };
      },
      formula: ['F = S × [(1 + i_d)/(1 + i_f)]ᵗ', 'E(S_t) = S × [(1 + π_d)/(1 + π_f)]ᵗ']
    },
    {
      id: 'hhi', name: 'Market concentration (HHI)', desc: 'Herfindahl-Hirschman Index, concentration ratio and the effect of a merger.',
      keywords: 'herfindahl hirschman index market concentration cr4 antitrust merger',
      inputs: [
        { id: 'shares', label: 'Market shares (%)', type: 'list', value: '30, 25, 20, 10, 8, 7' },
        { id: 'merge', label: 'Firms to merge (positions in list)', type: 'list', value: '2, 4', optional: true }
      ],
      compute(v) {
        const s = v.shares, hhi = sum(s.map(x => x * x)), sorted = s.slice().sort((a, b) => b - a);
        const cls = h => h > 1800 ? 'Highly concentrated' : h >= 1000 ? 'Moderately concentrated' : 'Unconcentrated';
        const res = [r('HHI', hhi, 'd2', true), r('Classification', cls(hhi), 'text'), r('CR4', sum(sorted.slice(0, 4)) / 100, 'pct'), r('Total share entered', sum(s) / 100, 'pct')];
        if (v.merge && v.merge.length >= 2) {
          const idx = v.merge.map(x => Math.round(x) - 1);
          need(idx.every(i => i >= 0 && i < s.length), 'Merger positions must refer to firms in the list.');
          const delta = sum(idx.map(i => s[i])) ** 2 - sum(idx.map(i => s[i] ** 2));
          res.push(sec('Merger'), r('Post-merger HHI', hhi + delta, 'd2', true), r('Change in HHI', delta, 'd2'), r('Post-merger classification', cls(hhi + delta), 'text'));
        }
        return { results: res, notes: ['Thresholds follow the 2023 US Merger Guidelines (HHI above 1,800 is highly concentrated; an increase above 100 in such a market is presumed to raise concerns).'] };
      },
      formula: ['HHI = Σ sᵢ² (shares in percent)', 'ΔHHI from merging firms i and j = 2·sᵢ·sⱼ']
    }
  ]);
})();
