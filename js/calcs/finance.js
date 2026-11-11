(function () {
  'use strict';
  const M = window.MC;
  const { need, fmt, npv, irr, sum } = M;
  const r = (label, value, f, key, hint) => ({ label, value, fmt: f, key, hint });
  const pct = v => v / 100;

  function cashFlowTable(cfs, rate) {
    let cum = 0, cumPv = 0;
    return {
      title: 'Cash flow schedule',
      head: ['Year', 'Cash flow', 'Discount factor', 'Present value', 'Cumulative PV'],
      fmts: ['int', 'money', 'd4', 'money', 'money'],
      rows: cfs.map((cf, t) => {
        const df = 1 / Math.pow(1 + rate, t), pv = cf * df;
        cum += cf; cumPv += pv;
        return [t, cf, df, pv, cumPv];
      })
    };
  }
  function npvProfile(cfs, irrVal) {
    const hi = Math.max(0.3, Number.isFinite(irrVal) ? irrVal * 2 : 0.3);
    const pts = M.range(0, hi, 60).map(x => [x, npv(x, cfs)]);
    return {
      type: 'line', title: 'NPV profile', xLabel: 'Discount rate', yLabel: 'NPV', xPct: true,
      series: [{ name: 'NPV', points: pts }],
      hlines: [{ y: 0 }],
      vlines: Number.isFinite(irrVal) ? [{ x: irrVal, label: 'IRR ' + fmt(irrVal, 'pct') }] : []
    };
  }
  function signChanges(cfs) {
    const s = cfs.filter(c => c !== 0).map(Math.sign);
    return s.slice(1).filter((x, i) => x !== s[i]).length;
  }
  function payback(cfs) {
    let cum = 0;
    for (let t = 0; t < cfs.length; t++) {
      const prev = cum;
      cum += cfs[t];
      if (t > 0 && prev < 0 && cum >= 0) return t - 1 + (-prev / cfs[t]);
      if (t === 0 && cum >= 0) return 0;
    }
    return NaN;
  }

  M.register('finance', [
    {
      id: 'npv', name: 'NPV & IRR', desc: 'Net present value, internal rate of return and profitability index for a series of cash flows.',
      keywords: 'net present value internal rate of return capital budgeting profitability index discounted cash flow',
      inputs: [
        { id: 'rate', label: 'Discount rate', unit: '%', value: 10, help: 'Cost of capital or required return.' },
        { id: 'cfs', label: 'Cash flows, year 0 first', type: 'list', value: '-100000, 30000, 35000, 40000, 45000, 50000', help: 'Year 0 is usually the (negative) investment. Separate with commas or spaces.' }
      ],
      compute(v) {
        const rate = pct(v.rate), cfs = v.cfs;
        need(cfs.length >= 2, 'Enter at least two cash flows.');
        const val = npv(rate, cfs), i = irr(cfs);
        const pvIn = sum(cfs.map((cf, t) => cf > 0 ? cf / Math.pow(1 + rate, t) : 0));
        const pvOut = -sum(cfs.map((cf, t) => cf < 0 ? cf / Math.pow(1 + rate, t) : 0));
        const pi = pvOut > 0 ? pvIn / pvOut : NaN;
        return {
          results: [
            r('Net present value', val, 'money', true),
            r('Internal rate of return', Number.isFinite(i) ? i : 'No IRR found', 'pct', true),
            r('Profitability index', pi, 'd4', false, 'PV of inflows ÷ PV of outflows'),
            r('PV of inflows', pvIn, 'money'),
            r('PV of outflows', pvOut, 'money'),
            r('Undiscounted net cash flow', sum(cfs), 'money')
          ],
          notes: [
            val > 0 ? 'NPV is positive: at ' + fmt(rate, 'pct') + ' the project adds value.' : val < 0 ? 'NPV is negative: at ' + fmt(rate, 'pct') + ' the project destroys value.' : 'NPV is zero: the project exactly earns the required return.',
            signChanges(cfs) > 1 ? 'Cash flows change sign more than once, so multiple IRRs may exist. Rely on NPV or MIRR.' : null
          ],
          tables: [cashFlowTable(cfs, rate)],
          charts: [npvProfile(cfs, i)]
        };
      },
      formula: ['NPV = Σ CFₜ / (1 + r)ᵗ,  t = 0 … n', 'IRR is the rate r at which NPV = 0', 'PI = PV(inflows) / PV(outflows)']
    },
    {
      id: 'mirr', name: 'MIRR', desc: 'Modified internal rate of return with separate finance and reinvestment rates.',
      keywords: 'modified internal rate of return reinvestment',
      inputs: [
        { id: 'cfs', label: 'Cash flows, year 0 first', type: 'list', value: '-100000, 30000, 35000, 40000, 45000, 50000' },
        { id: 'fin', label: 'Finance rate', unit: '%', value: 10, help: 'Rate used to discount negative cash flows.' },
        { id: 'rein', label: 'Reinvestment rate', unit: '%', value: 12, help: 'Rate earned on positive cash flows.' }
      ],
      compute(v) {
        const cfs = v.cfs, n = cfs.length - 1, f = pct(v.fin), re = pct(v.rein);
        need(n >= 1, 'Enter at least two cash flows.');
        const pvNeg = -sum(cfs.map((c, t) => c < 0 ? c / Math.pow(1 + f, t) : 0));
        const fvPos = sum(cfs.map((c, t) => c > 0 ? c * Math.pow(1 + re, n - t) : 0));
        need(pvNeg > 0 && fvPos > 0, 'Cash flows need at least one negative and one positive value.');
        const mirr = Math.pow(fvPos / pvNeg, 1 / n) - 1;
        return {
          results: [
            r('MIRR', mirr, 'pct', true),
            r('IRR (for comparison)', irr(cfs), 'pct'),
            r('PV of outflows at finance rate', pvNeg, 'money'),
            r('FV of inflows at reinvestment rate', fvPos, 'money'),
            r('Periods', n, 'int')
          ]
        };
      },
      formula: ['MIRR = (FV of positive flows at reinvestment rate / PV of negative flows at finance rate)^(1/n) − 1']
    },
    {
      id: 'payback', name: 'Payback period', desc: 'Simple and discounted payback period.',
      keywords: 'discounted payback recovery',
      inputs: [
        { id: 'cfs', label: 'Cash flows, year 0 first', type: 'list', value: '-100000, 30000, 35000, 40000, 45000' },
        { id: 'rate', label: 'Discount rate', unit: '%', value: 10 }
      ],
      compute(v) {
        const cfs = v.cfs, rate = pct(v.rate);
        need(cfs.length >= 2, 'Enter at least two cash flows.');
        const pvs = cfs.map((c, t) => c / Math.pow(1 + rate, t));
        const pb = payback(cfs), dpb = payback(pvs);
        let c1 = 0, c2 = 0;
        const rows = cfs.map((c, t) => { c1 += c; c2 += pvs[t]; return [t, c, c1, pvs[t], c2]; });
        return {
          results: [
            r('Payback period', Number.isFinite(pb) ? pb : 'Not recovered', 'd2', true, 'years'),
            r('Discounted payback period', Number.isFinite(dpb) ? dpb : 'Not recovered', 'd2', true, 'years'),
            r('NPV', sum(pvs), 'money')
          ],
          tables: [{ head: ['Year', 'Cash flow', 'Cumulative', 'PV', 'Cumulative PV'], fmts: ['int', 'money', 'money', 'money', 'money'], rows }],
          charts: [{
            type: 'line', title: 'Cumulative cash flow', xLabel: 'Year', yLabel: 'Cumulative',
            series: [{ name: 'Cumulative', points: rows.map(x => [x[0], x[2]]), markers: true }, { name: 'Cumulative PV', points: rows.map(x => [x[0], x[4]]), markers: true, dashed: true }],
            hlines: [{ y: 0 }]
          }]
        };
      },
      formula: ['Payback = years before recovery + (unrecovered amount at start of year / cash flow in that year)', 'Discounted payback uses present values of the cash flows.']
    },
    {
      id: 'eaa', name: 'Equivalent annual annuity', desc: 'Compare projects with unequal lives on an annual basis.',
      keywords: 'unequal lives replacement chain EAA',
      inputs: [
        { id: 'a', label: 'Project A cash flows', type: 'list', value: '-50000, 20000, 20000, 20000' },
        { id: 'b', label: 'Project B cash flows', type: 'list', value: '-80000, 22000, 22000, 22000, 22000, 22000' },
        { id: 'rate', label: 'Discount rate', unit: '%', value: 10 }
      ],
      compute(v) {
        const rate = pct(v.rate);
        const row = (name, cfs) => {
          const n = cfs.length - 1, val = npv(rate, cfs);
          need(n >= 1, 'Each project needs at least two cash flows.');
          const eaa = rate === 0 ? val / n : val * rate / (1 - Math.pow(1 + rate, -n));
          return [name, n, val, eaa];
        };
        const A = row('Project A', v.a), B = row('Project B', v.b);
        const best = A[3] >= B[3] ? 'Project A' : 'Project B';
        return {
          results: [r('EAA, Project A', A[3], 'money', true), r('EAA, Project B', B[3], 'money', true), r('Preferred', best, 'text')],
          tables: [{ head: ['Project', 'Life (years)', 'NPV', 'EAA'], fmts: ['text', 'int', 'money', 'money'], rows: [A, B] }],
          notes: ['Choose the project with the higher EAA when projects repeat indefinitely.']
        };
      },
      formula: ['EAA = NPV × r / (1 − (1 + r)⁻ⁿ)']
    },
    {
      id: 'tvm', name: 'Time value of money', desc: 'Solve for FV, PV, payment, number of periods or rate, like a financial calculator.',
      keywords: 'future value present value annuity payment pmt n i/y financial calculator',
      inputs: [
        { id: 'solve', label: 'Solve for', type: 'select', value: 'fv', options: [['fv', 'Future value (FV)'], ['pv', 'Present value (PV)'], ['pmt', 'Payment (PMT)'], ['n', 'Number of periods (N)'], ['rate', 'Rate per period (I/Y)']] },
        { id: 'n', label: 'Number of periods (N)', value: 10, showIf: v => v.solve !== 'n' },
        { id: 'rate', label: 'Rate per period (I/Y)', unit: '%', value: 8, showIf: v => v.solve !== 'rate' },
        { id: 'pv', label: 'Present value (PV)', unit: 'cur', value: -1000, showIf: v => v.solve !== 'pv' },
        { id: 'pmt', label: 'Payment per period (PMT)', unit: 'cur', value: -100, showIf: v => v.solve !== 'pmt' },
        { id: 'fv', label: 'Future value (FV)', unit: 'cur', value: 0, showIf: v => v.solve !== 'fv' },
        { id: 'timing', label: 'Payments at', type: 'select', value: 'end', options: [['end', 'End of period'], ['begin', 'Beginning of period']] }
      ],
      compute(v) {
        const t = v.timing === 'begin' ? 1 : 0;
        const f = (n, i, pv, pmt, fv) => Math.abs(i) < 1e-12 ? pv + pmt * n + fv
          : pv * Math.pow(1 + i, n) + pmt * (1 + i * t) * (Math.pow(1 + i, n) - 1) / i + fv;
        let { n, pv, pmt, fv } = v, i = pct(v.rate);
        const ann = (i, n) => Math.abs(i) < 1e-12 ? n : (1 + i * t) * (Math.pow(1 + i, n) - 1) / i;
        switch (v.solve) {
          case 'fv': fv = -(pv * Math.pow(1 + i, n) + pmt * ann(i, n)); break;
          case 'pv': pv = -(fv + pmt * ann(i, n)) / Math.pow(1 + i, n); break;
          case 'pmt': pmt = -(fv + pv * Math.pow(1 + i, n)) / ann(i, n); break;
          case 'n': n = M.findRoot(x => f(x, i, pv, pmt, fv), 0, 2000, 20000); need(Number.isFinite(n), 'No solution for N. Check signs: money paid out is negative, money received is positive.'); break;
          case 'rate': i = M.findRoot(x => f(n, x, pv, pmt, fv), -0.99, 5, 20000); need(Number.isFinite(i), 'No solution for the rate. Check signs: money paid out is negative, money received is positive.'); break;
        }
        const key = { fv: ['Future value', fv, 'money'], pv: ['Present value', pv, 'money'], pmt: ['Payment', pmt, 'money'], n: ['Number of periods', n, 'd4'], rate: ['Rate per period', i, 'pct'] }[v.solve];
        const totalPmt = pmt * n;
        return {
          results: [
            r(key[0], key[1], key[2], true),
            r('N', n, 'd4'), r('I/Y', i, 'pct'), r('PV', pv, 'money'), r('PMT', pmt, 'money'), r('FV', fv, 'money'),
            r('Total of payments', totalPmt, 'money'),
            r('Interest', -(pv + totalPmt + fv), 'money', false, 'Net of all cash flows, sign reversed')
          ],
          notes: ['Sign convention: cash you pay out is negative, cash you receive is positive.']
        };
      },
      formula: ['PV·(1+i)ᴺ + PMT·(1 + i·k)·[((1+i)ᴺ − 1)/i] + FV = 0', 'k = 1 for payments at the beginning of each period, 0 otherwise']
    },
    {
      id: 'loan', name: 'Loan amortization', desc: 'Payment, interest cost and amortization schedule, with optional extra payments.',
      keywords: 'mortgage emi installment schedule debt repayment',
      inputs: [
        { id: 'p', label: 'Loan amount', unit: 'cur', value: 250000 },
        { id: 'rate', label: 'Annual interest rate', unit: '%', value: 7 },
        { id: 'years', label: 'Term', unit: 'years', value: 20 },
        { id: 'freq', label: 'Payments per year', type: 'select', value: '12', options: [['12', 'Monthly (12)'], ['4', 'Quarterly (4)'], ['2', 'Semi-annual (2)'], ['1', 'Annual (1)'], ['26', 'Bi-weekly (26)'], ['52', 'Weekly (52)']] },
        { id: 'extra', label: 'Extra payment per period', unit: 'cur', value: 0 }
      ],
      compute(v) {
        const k = Number(v.freq), i = pct(v.rate) / k, n = Math.round(v.years * k);
        need(v.p > 0 && n > 0, 'Enter a positive loan amount and term.');
        const pmt = M.annuityPmt(i, n, v.p);
        const sched = extra => {
          let bal = v.p, per = 0, totalInt = 0;
          const years = [], bals = [[0, v.p]];
          let yInt = 0, yPrin = 0, yPay = 0;
          while (bal > 1e-8 && per < n) {
            per++;
            const int = bal * i;
            let pay = Math.min(pmt + extra, bal + int);
            const prin = pay - int;
            bal -= prin; totalInt += int;
            yInt += int; yPrin += prin; yPay += pay;
            if (per % k === 0 || bal <= 1e-8 || per === n) {
              years.push([Math.ceil(per / k), yPay, yInt, yPrin, Math.max(0, bal)]);
              bals.push([per / k, Math.max(0, bal)]);
              yInt = yPrin = yPay = 0;
            }
          }
          return { per, totalInt, years, bals };
        };
        const base = sched(0), ex = sched(v.extra || 0);
        const res = [
          r('Payment per period', pmt, 'money', true),
          r('Total interest', base.totalInt, 'money', true),
          r('Total paid', v.p + base.totalInt, 'money'),
          r('Number of payments', n, 'int')
        ];
        const series = [{ name: 'Balance', points: base.bals }];
        if (v.extra > 0) {
          res.push(r('With extra payments: payoff', ex.per / k, 'd2', true, 'years'));
          res.push(r('With extra payments: total interest', ex.totalInt, 'money'));
          res.push(r('Interest saved', base.totalInt - ex.totalInt, 'money', true));
          series.push({ name: 'Balance with extra payments', points: ex.bals, dashed: true });
        }
        return {
          results: res,
          tables: [{ title: 'Annual summary' + (v.extra > 0 ? ' (with extra payments)' : ''), head: ['Year', 'Paid', 'Interest', 'Principal', 'Ending balance'], fmts: ['int', 'money', 'money', 'money', 'money'], rows: ex.years }],
          charts: [{ type: 'line', title: 'Outstanding balance', xLabel: 'Year', yLabel: 'Balance', series }]
        };
      },
      formula: ['Payment = P × i / (1 − (1 + i)⁻ⁿ)', 'i = annual rate / payments per year, n = years × payments per year']
    },
    {
      id: 'ear', name: 'Effective annual rate', desc: 'Convert a nominal (APR) rate into the effective annual rate for any compounding frequency.',
      keywords: 'apr apy ear compounding continuous nominal',
      inputs: [
        { id: 'apr', label: 'Nominal annual rate (APR)', unit: '%', value: 12 },
        { id: 'm', label: 'Compounding', type: 'select', value: '12', options: [['1', 'Annual'], ['2', 'Semi-annual'], ['4', 'Quarterly'], ['12', 'Monthly'], ['52', 'Weekly'], ['365', 'Daily'], ['inf', 'Continuous']] }
      ],
      compute(v) {
        const a = pct(v.apr);
        const ear = m => m === 'inf' ? Math.exp(a) - 1 : Math.pow(1 + a / m, m) - 1;
        const m = v.m === 'inf' ? 'inf' : Number(v.m);
        const freqs = [['Annual', 1], ['Semi-annual', 2], ['Quarterly', 4], ['Monthly', 12], ['Weekly', 52], ['Daily', 365], ['Continuous', 'inf']];
        return {
          results: [
            r('Effective annual rate', ear(m), 'pct', true),
            r('Rate per compounding period', m === 'inf' ? 'n/a' : a / m, 'pct')
          ],
          tables: [{ title: 'Same APR, other frequencies', head: ['Compounding', 'EAR'], fmts: ['text', 'pct'], rows: freqs.map(f => [f[0], ear(f[1])]) }]
        };
      },
      formula: ['EAR = (1 + APR/m)ᵐ − 1', 'Continuous: EAR = e^APR − 1']
    },
    {
      id: 'cagr', name: 'ROI & CAGR', desc: 'Total return, compound annual growth rate and doubling time.',
      keywords: 'return on investment compound annual growth rate rule of 72 doubling annualized',
      inputs: [
        { id: 'begin', label: 'Beginning value', unit: 'cur', value: 50000 },
        { id: 'end', label: 'Ending value', unit: 'cur', value: 75000 },
        { id: 'years', label: 'Years', value: 3 },
        { id: 'income', label: 'Income received (dividends, interest)', unit: 'cur', value: 0 }
      ],
      compute(v) {
        need(v.begin > 0 && v.years > 0, 'Beginning value and years must be positive.');
        const gain = v.end + v.income - v.begin, roi = gain / v.begin;
        const cagr = Math.pow((v.end + v.income) / v.begin, 1 / v.years) - 1;
        return {
          results: [
            r('ROI (total return)', roi, 'pct', true),
            r('CAGR (annualized)', cagr, 'pct', true),
            r('Gain', gain, 'money'),
            r('Doubling time at this CAGR', cagr > 0 ? Math.log(2) / Math.log(1 + cagr) : NaN, 'd2', false, 'years'),
            r('Rule of 72 estimate', cagr > 0 ? 72 / (cagr * 100) : NaN, 'd2', false, 'years')
          ]
        };
      },
      formula: ['ROI = (End + Income − Begin) / Begin', 'CAGR = ((End + Income) / Begin)^(1/years) − 1', 'Doubling time = ln 2 / ln(1 + CAGR)']
    },
    {
      id: 'wacc', name: 'WACC', desc: 'Weighted average cost of capital from market values and component costs.',
      keywords: 'weighted average cost of capital discount rate hurdle',
      inputs: [
        { id: 'e', label: 'Market value of equity', unit: 'cur', value: 600000 },
        { id: 'd', label: 'Market value of debt', unit: 'cur', value: 400000 },
        { id: 'p', label: 'Market value of preferred stock', unit: 'cur', value: 0 },
        { id: 're', label: 'Cost of equity', unit: '%', value: 12 },
        { id: 'rd', label: 'Pre-tax cost of debt', unit: '%', value: 7 },
        { id: 'rp', label: 'Cost of preferred stock', unit: '%', value: 8 },
        { id: 'tax', label: 'Tax rate', unit: '%', value: 25 }
      ],
      compute(v) {
        const V = v.e + v.d + v.p;
        need(V > 0, 'Total capital must be positive.');
        const we = v.e / V, wd = v.d / V, wp = v.p / V, rdAt = pct(v.rd) * (1 - pct(v.tax));
        const w = we * pct(v.re) + wd * rdAt + wp * pct(v.rp);
        return {
          results: [
            r('WACC', w, 'pct', true),
            r('After-tax cost of debt', rdAt, 'pct'),
            r('Total capital', V, 'money')
          ],
          tables: [{ head: ['Component', 'Weight', 'Cost (after tax)', 'Contribution'], fmts: ['text', 'pct', 'pct', 'pct'], rows: [
            ['Equity', we, pct(v.re), we * pct(v.re)], ['Debt', wd, rdAt, wd * rdAt], ['Preferred', wp, pct(v.rp), wp * pct(v.rp)]
          ].filter(x => x[1] > 0) }]
        };
      },
      formula: ['WACC = E/V·rₑ + D/V·r_d·(1 − T) + P/V·rₚ', 'V = E + D + P']
    },
    {
      id: 'capm', name: 'CAPM', desc: 'Cost of equity from the capital asset pricing model, with the security market line.',
      keywords: 'capital asset pricing model beta cost of equity security market line risk premium',
      inputs: [
        { id: 'rf', label: 'Risk-free rate', unit: '%', value: 4 },
        { id: 'beta', label: 'Beta', value: 1.2 },
        { id: 'rm', label: 'Expected market return', unit: '%', value: 10 }
      ],
      compute(v) {
        const rf = pct(v.rf), rm = pct(v.rm), re = rf + v.beta * (rm - rf);
        const bmax = Math.max(2, v.beta * 1.25);
        return {
          results: [r('Expected return (cost of equity)', re, 'pct', true), r('Market risk premium', rm - rf, 'pct'), r('Risk premium for this asset', v.beta * (rm - rf), 'pct')],
          charts: [{ type: 'line', title: 'Security market line', xLabel: 'Beta', yLabel: 'Expected return', yPct: true,
            series: [{ name: 'SML', points: M.range(0, bmax, 20).map(b => [b, rf + b * (rm - rf)]) }, { name: 'Asset', points: [[v.beta, re]], dots: true }] }]
        };
      },
      formula: ['E(R) = R_f + β × (E(R_m) − R_f)']
    },
    {
      id: 'ddm', name: 'Dividend discount model', desc: 'Share value from dividends: Gordon growth or two-stage growth.',
      keywords: 'gordon growth model stock valuation dividend two stage perpetuity',
      inputs: [
        { id: 'd0', label: 'Current annual dividend (D₀)', unit: 'cur', value: 2 },
        { id: 'r', label: 'Required return', unit: '%', value: 10 },
        { id: 'n', label: 'Years of high growth', value: 5, help: 'Set to 0 for the single-stage Gordon model.' },
        { id: 'g1', label: 'High growth rate', unit: '%', value: 12 },
        { id: 'g2', label: 'Long-term growth rate', unit: '%', value: 4 }
      ],
      compute(v) {
        const rr = pct(v.r), g1 = pct(v.g1), g2 = pct(v.g2), n = Math.round(v.n);
        need(rr > g2, 'Required return must exceed the long-term growth rate.');
        need(n >= 0, 'Years must be zero or more.');
        let d = v.d0, pvDivs = 0;
        const rows = [];
        for (let t = 1; t <= n; t++) { d *= 1 + g1; const pv = d / Math.pow(1 + rr, t); pvDivs += pv; rows.push([t, d, pv]); }
        const terminal = d * (1 + g2) / (rr - g2), pvTerm = terminal / Math.pow(1 + rr, n);
        const price = pvDivs + pvTerm;
        return {
          results: [
            r('Intrinsic value per share', price, 'money', true),
            r('PV of high-growth dividends', pvDivs, 'money'),
            r('Terminal value at year ' + n, terminal, 'money'),
            r('PV of terminal value', pvTerm, 'money'),
            r('Implied dividend yield', v.d0 * (1 + (n ? g1 : g2)) / price, 'pct')
          ],
          tables: rows.length ? [{ head: ['Year', 'Dividend', 'Present value'], fmts: ['int', 'money', 'money'], rows }] : []
        };
      },
      formula: ['Gordon: P₀ = D₁ / (r − g)', 'Two-stage: P₀ = Σ Dₜ/(1+r)ᵗ for t ≤ n  +  [Dₙ(1+g₂)/(r − g₂)] / (1+r)ⁿ']
    },
    {
      id: 'dcf', name: 'DCF valuation', desc: 'Enterprise and equity value from projected free cash flow and a terminal value.',
      keywords: 'discounted cash flow enterprise value terminal value valuation intrinsic',
      inputs: [
        { id: 'fcf', label: 'Free cash flow, last year', unit: 'cur', value: 10000000 },
        { id: 'n', label: 'Forecast years', value: 5 },
        { id: 'g', label: 'Growth during forecast', unit: '%', value: 8 },
        { id: 'tg', label: 'Terminal growth', unit: '%', value: 2.5 },
        { id: 'wacc', label: 'WACC', unit: '%', value: 9 },
        { id: 'debt', label: 'Net debt (debt − cash)', unit: 'cur', value: 20000000 },
        { id: 'shares', label: 'Shares outstanding', value: 5000000 }
      ],
      compute(v) {
        const w = pct(v.wacc), g = pct(v.g), tg = pct(v.tg), n = Math.round(v.n);
        need(w > tg, 'WACC must exceed terminal growth.');
        need(n >= 1, 'Use at least one forecast year.');
        let f = v.fcf, pvSum = 0;
        const rows = [];
        for (let t = 1; t <= n; t++) { f *= 1 + g; const df = 1 / Math.pow(1 + w, t); pvSum += f * df; rows.push([t, f, df, f * df]); }
        const tv = f * (1 + tg) / (w - tg), pvTv = tv / Math.pow(1 + w, n);
        const ev = pvSum + pvTv, eq = ev - v.debt;
        return {
          results: [
            r('Enterprise value', ev, 'money', true),
            r('Equity value', eq, 'money', true),
            r('Value per share', v.shares > 0 ? eq / v.shares : NaN, 'money', true),
            r('PV of forecast cash flows', pvSum, 'money'),
            r('PV of terminal value', pvTv, 'money'),
            r('Terminal value share of EV', pvTv / ev, 'pct')
          ],
          tables: [{ head: ['Year', 'FCF', 'Discount factor', 'PV'], fmts: ['int', 'money', 'd4', 'money'], rows }],
          notes: [pvTv / ev > 0.75 ? 'More than 75% of value comes from the terminal value; the result is sensitive to terminal growth and WACC.' : null]
        };
      },
      formula: ['EV = Σ FCFₜ/(1+WACC)ᵗ + TV/(1+WACC)ⁿ', 'TV = FCFₙ × (1 + g) / (WACC − g)', 'Equity = EV − net debt']
    },
    {
      id: 'fcf', name: 'Free cash flow', desc: 'Free cash flow to the firm (FCFF) and to equity (FCFE).',
      keywords: 'fcff fcfe free cash flow capex working capital',
      inputs: [
        { id: 'ebit', label: 'EBIT', unit: 'cur', value: 500000 },
        { id: 'tax', label: 'Tax rate', unit: '%', value: 25 },
        { id: 'da', label: 'Depreciation & amortization', unit: 'cur', value: 80000 },
        { id: 'capex', label: 'Capital expenditure', unit: 'cur', value: 120000 },
        { id: 'nwc', label: 'Increase in net working capital', unit: 'cur', value: 30000 },
        { id: 'int', label: 'Interest expense', unit: 'cur', value: 40000 },
        { id: 'borrow', label: 'Net borrowing', unit: 'cur', value: 10000 }
      ],
      compute(v) {
        const t = pct(v.tax), nopat = v.ebit * (1 - t);
        const fcff = nopat + v.da - v.capex - v.nwc;
        const fcfe = fcff - v.int * (1 - t) + v.borrow;
        return { results: [r('FCFF', fcff, 'money', true), r('FCFE', fcfe, 'money', true), r('NOPAT', nopat, 'money'), r('Reinvestment (capex − D&A + ΔNWC)', v.capex - v.da + v.nwc, 'money')] };
      },
      formula: ['FCFF = EBIT(1 − t) + D&A − Capex − ΔNWC', 'FCFE = FCFF − Interest(1 − t) + Net borrowing']
    },
    {
      id: 'bond', name: 'Bond price & yield', desc: 'Price, yield to maturity, duration and convexity of a fixed-coupon bond.',
      keywords: 'ytm yield to maturity duration convexity coupon fixed income macaulay modified',
      inputs: [
        { id: 'solve', label: 'Solve for', type: 'select', value: 'price', options: [['price', 'Price (given yield)'], ['ytm', 'Yield (given price)']] },
        { id: 'face', label: 'Face value', unit: 'cur', value: 1000 },
        { id: 'coupon', label: 'Annual coupon rate', unit: '%', value: 6 },
        { id: 'years', label: 'Years to maturity', value: 10 },
        { id: 'freq', label: 'Coupons per year', type: 'select', value: '2', options: [['1', 'Annual'], ['2', 'Semi-annual'], ['4', 'Quarterly'], ['12', 'Monthly']] },
        { id: 'ytm', label: 'Yield to maturity', unit: '%', value: 7, showIf: v => v.solve === 'price' },
        { id: 'price', label: 'Market price', unit: 'cur', value: 930, showIf: v => v.solve === 'ytm' }
      ],
      compute(v) {
        const k = Number(v.freq), n = Math.round(v.years * k), c = v.face * pct(v.coupon) / k;
        need(n >= 1, 'Maturity must be at least one coupon period.');
        const priceAt = y => { const i = y / k; let p = 0; for (let t = 1; t <= n; t++) p += c / Math.pow(1 + i, t); return p + v.face / Math.pow(1 + i, n); };
        let y = pct(v.ytm), price;
        if (v.solve === 'ytm') {
          price = v.price;
          y = M.bisect(x => priceAt(x) - price, -0.5 * k + 1e-6, 5);
          need(Number.isFinite(y), 'No yield matches that price.');
        } else price = priceAt(y);
        const i = y / k;
        let mac = 0, conv = 0;
        for (let t = 1; t <= n; t++) {
          const cf = c + (t === n ? v.face : 0), pv = cf / Math.pow(1 + i, t);
          mac += t * pv; conv += t * (t + 1) * pv;
        }
        mac = mac / price / k;
        const mod = mac / (1 + i);
        conv = conv / (price * Math.pow(1 + i, 2) * k * k);
        const pts = M.range(Math.max(0.001, y - 0.05), y + 0.05, 40).map(x => [x, priceAt(x)]);
        return {
          results: [
            r(v.solve === 'price' ? 'Bond price' : 'Yield to maturity', v.solve === 'price' ? price : y, v.solve === 'price' ? 'money' : 'pct', true),
            v.solve === 'price' ? r('Yield to maturity', y, 'pct') : r('Price', price, 'money'),
            r('Price as % of face', price / v.face, 'pct'),
            r('Current yield', c * k / price, 'pct'),
            r('Macaulay duration', mac, 'd4', false, 'years'),
            r('Modified duration', mod, 'd4', false, 'years'),
            r('Convexity', conv, 'd4'),
            r('Trades at', Math.abs(price - v.face) < 0.005 ? 'Par' : price > v.face ? 'Premium' : 'Discount', 'text'),
            r('Est. price change for +1% yield', price * (-mod * 0.01 + 0.5 * conv * 0.0001), 'money', false, 'duration + convexity')
          ],
          charts: [{ type: 'line', title: 'Price–yield curve', xLabel: 'Yield to maturity', yLabel: 'Price', xPct: true, yZero: false,
            series: [{ name: 'Price', points: pts }, { name: 'This bond', points: [[y, price]], dots: true }] }],
          notes: ['Assumes valuation on a coupon date (no accrued interest).']
        };
      },
      formula: ['Price = Σ C/(1+y/k)ᵗ + F/(1+y/k)ⁿ', 'Modified duration = Macaulay / (1 + y/k)', 'ΔP/P ≈ −D_mod·Δy + ½·Convexity·Δy²']
    },
    {
      id: 'options', name: 'Black–Scholes options', desc: 'European call and put values and Greeks.',
      keywords: 'option pricing black scholes merton greeks delta gamma vega theta rho call put derivatives',
      inputs: [
        { id: 's', label: 'Stock price', unit: 'cur', value: 100 },
        { id: 'k', label: 'Strike price', unit: 'cur', value: 100 },
        { id: 't', label: 'Time to expiry', unit: 'years', value: 0.5 },
        { id: 'r', label: 'Risk-free rate (continuous)', unit: '%', value: 5 },
        { id: 'sigma', label: 'Volatility', unit: '%', value: 25 },
        { id: 'q', label: 'Dividend yield', unit: '%', value: 0 }
      ],
      compute(v) {
        const { s, k, t } = v, rr = pct(v.r), sg = pct(v.sigma), q = pct(v.q);
        need(s > 0 && k > 0 && t > 0 && sg > 0, 'Price, strike, time and volatility must be positive.');
        const N = M.normCdf, n = M.normPdf;
        const bs = S => {
          const d1 = (Math.log(S / k) + (rr - q + sg * sg / 2) * t) / (sg * Math.sqrt(t)), d2 = d1 - sg * Math.sqrt(t);
          return { d1, d2, call: S * Math.exp(-q * t) * N(d1) - k * Math.exp(-rr * t) * N(d2), put: k * Math.exp(-rr * t) * N(-d2) - S * Math.exp(-q * t) * N(-d1) };
        };
        const b = bs(s), { d1, d2 } = b, eq = Math.exp(-q * t), er = Math.exp(-rr * t);
        const gamma = eq * n(d1) / (s * sg * Math.sqrt(t)), vega = s * eq * n(d1) * Math.sqrt(t) / 100;
        const thC = (-s * eq * n(d1) * sg / (2 * Math.sqrt(t)) - rr * k * er * N(d2) + q * s * eq * N(d1)) / 365;
        const thP = (-s * eq * n(d1) * sg / (2 * Math.sqrt(t)) + rr * k * er * N(-d2) - q * s * eq * N(-d1)) / 365;
        const pts = M.range(s * 0.5, s * 1.5, 50);
        return {
          results: [r('Call value', b.call, 'money', true), r('Put value', b.put, 'money', true), r('d₁', d1, 'd4'), r('d₂', d2, 'd4')],
          tables: [{ title: 'Greeks', head: ['Greek', 'Call', 'Put', 'Meaning'], fmts: ['text', 'd4', 'd4', 'text'], rows: [
            ['Delta', eq * N(d1), eq * (N(d1) - 1), 'Change in value per 1 change in stock price'],
            ['Gamma', gamma, gamma, 'Change in delta per 1 change in stock price'],
            ['Vega', vega, vega, 'Change in value per 1 point change in volatility'],
            ['Theta', thC, thP, 'Change in value per calendar day'],
            ['Rho', k * t * er * N(d2) / 100, -k * t * er * N(-d2) / 100, 'Change in value per 1 point change in rate']
          ] }],
          charts: [{ type: 'line', title: 'Option value vs stock price', xLabel: 'Stock price', yLabel: 'Value',
            series: [{ name: 'Call', points: pts.map(S => [S, bs(S).call]) }, { name: 'Put', points: pts.map(S => [S, bs(S).put]), dashed: true }],
            vlines: [{ x: k, label: 'Strike' }] }]
        };
      },
      formula: ['C = S·e^(−qT)·N(d₁) − K·e^(−rT)·N(d₂)', 'P = K·e^(−rT)·N(−d₂) − S·e^(−qT)·N(−d₁)', 'd₁ = [ln(S/K) + (r − q + σ²/2)T] / (σ√T),  d₂ = d₁ − σ√T']
    },
    {
      id: 'portfolio', name: 'Two-asset portfolio', desc: 'Expected return, risk, minimum-variance and optimal risky portfolio for two assets.',
      keywords: 'diversification efficient frontier markowitz correlation sharpe tangency minimum variance',
      inputs: [
        { id: 'w', label: 'Weight in asset A', unit: '%', value: 60 },
        { id: 'ra', label: 'Expected return A', unit: '%', value: 12 },
        { id: 'sa', label: 'Standard deviation A', unit: '%', value: 20 },
        { id: 'rb', label: 'Expected return B', unit: '%', value: 6 },
        { id: 'sb', label: 'Standard deviation B', unit: '%', value: 10 },
        { id: 'rho', label: 'Correlation A, B', value: 0.2, help: 'Between −1 and 1.' },
        { id: 'rf', label: 'Risk-free rate', unit: '%', value: 3 }
      ],
      compute(v) {
        need(v.rho >= -1 && v.rho <= 1, 'Correlation must be between −1 and 1.');
        const ra = pct(v.ra), rb = pct(v.rb), sa = pct(v.sa), sb = pct(v.sb), rf = pct(v.rf), rho = v.rho;
        const cov = rho * sa * sb;
        const stat = w => { const er = w * ra + (1 - w) * rb, s = Math.sqrt(w * w * sa * sa + (1 - w) ** 2 * sb * sb + 2 * w * (1 - w) * cov); return [er, s]; };
        const w = pct(v.w), [er, s] = stat(w);
        const denom = sa * sa + sb * sb - 2 * cov;
        const wmv = denom > 0 ? (sb * sb - cov) / denom : NaN;
        const ea = ra - rf, eb = rb - rf;
        const wt = (ea * sb * sb - eb * cov) / (ea * sb * sb + eb * sa * sa - (ea + eb) * cov);
        const [emv, smv] = stat(wmv), [et, st] = stat(wt);
        const frontier = M.range(-0.25, 1.25, 60).map(x => { const p = stat(x); return [p[1], p[0]]; });
        return {
          results: [
            r('Portfolio expected return', er, 'pct', true),
            r('Portfolio standard deviation', s, 'pct', true),
            r('Sharpe ratio', (er - rf) / s, 'd4'),
            r('Covariance', cov, 'd4'),
            r('Minimum-variance weight in A', wmv, 'pct'),
            r('Minimum-variance return / risk', fmt(emv, 'pct') + ' / ' + fmt(smv, 'pct'), 'text'),
            r('Tangency (max Sharpe) weight in A', wt, 'pct'),
            r('Tangency return / risk', fmt(et, 'pct') + ' / ' + fmt(st, 'pct'), 'text'),
            r('Tangency Sharpe ratio', (et - rf) / st, 'd4')
          ],
          charts: [{ type: 'line', title: 'Portfolio frontier (weights −25% to 125% in A)', xLabel: 'Standard deviation', yLabel: 'Expected return', xPct: true, yPct: true, yZero: false,
            series: [{ name: 'Frontier', points: frontier }, { name: 'Your portfolio', points: [[s, er]], dots: true }, { name: 'Capital allocation line', points: [[0, rf], [st * 1.3, rf + (et - rf) / st * st * 1.3]], dashed: true }] }]
        };
      },
      formula: ['E(Rₚ) = w·E(R_A) + (1 − w)·E(R_B)', 'σₚ² = w²σ_A² + (1 − w)²σ_B² + 2w(1 − w)ρσ_Aσ_B', 'w_minvar = (σ_B² − Cov) / (σ_A² + σ_B² − 2Cov)']
    },
    {
      id: 'performance', name: 'Portfolio performance', desc: 'Sharpe, Treynor, Jensen\'s alpha and M² for a portfolio.',
      keywords: 'sharpe ratio treynor jensen alpha m squared risk adjusted return',
      inputs: [
        { id: 'rp', label: 'Portfolio return', unit: '%', value: 14 },
        { id: 'sp', label: 'Portfolio standard deviation', unit: '%', value: 18 },
        { id: 'bp', label: 'Portfolio beta', value: 1.1 },
        { id: 'rm', label: 'Market return', unit: '%', value: 11 },
        { id: 'sm', label: 'Market standard deviation', unit: '%', value: 15 },
        { id: 'rf', label: 'Risk-free rate', unit: '%', value: 4 }
      ],
      compute(v) {
        const rp = pct(v.rp), sp = pct(v.sp), rm = pct(v.rm), sm = pct(v.sm), rf = pct(v.rf);
        const sharpe = (rp - rf) / sp, sharpeM = (rm - rf) / sm;
        return {
          results: [
            r('Sharpe ratio', sharpe, 'd4', true), r('Market Sharpe ratio', sharpeM, 'd4'),
            r('Treynor ratio', (rp - rf) / v.bp, 'd4'),
            r('Jensen\'s alpha', rp - (rf + v.bp * (rm - rf)), 'pct', true),
            r('M² (Modigliani)', rf + sharpe * sm, 'pct'), r('M² excess over market', rf + sharpe * sm - rm, 'pct')
          ]
        };
      },
      formula: ['Sharpe = (Rₚ − R_f)/σₚ', 'Treynor = (Rₚ − R_f)/βₚ', 'α = Rₚ − [R_f + βₚ(R_m − R_f)]', 'M² = R_f + Sharpe·σ_m']
    },
    {
      id: 'sgr', name: 'Sustainable growth rate', desc: 'Internal and sustainable growth rates from retention and returns.',
      keywords: 'internal growth retention ratio plowback payout',
      inputs: [
        { id: 'ni', label: 'Net income', unit: 'cur', value: 120000 },
        { id: 'div', label: 'Dividends paid', unit: 'cur', value: 40000 },
        { id: 'eq', label: 'Shareholders\' equity', unit: 'cur', value: 800000 },
        { id: 'assets', label: 'Total assets', unit: 'cur', value: 1500000 }
      ],
      compute(v) {
        const b = 1 - v.div / v.ni, roe = v.ni / v.eq, roa = v.ni / v.assets;
        return {
          results: [
            r('Sustainable growth rate', roe * b / (1 - roe * b), 'pct', true),
            r('Internal growth rate', roa * b / (1 - roa * b), 'pct', true),
            r('Retention ratio (b)', b, 'pct'), r('ROE', roe, 'pct'), r('ROA', roa, 'pct')
          ]
        };
      },
      formula: ['SGR = ROE·b / (1 − ROE·b)', 'IGR = ROA·b / (1 − ROA·b)', 'b = 1 − dividends / net income']
    }
  ]);
})();
