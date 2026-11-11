(function () {
  'use strict';
  const M = window.MC;
  const { need } = M;
  const r = (label, value, f, key, hint) => ({ label, value, fmt: f, key, hint });
  const sec = section => ({ section });
  const pct = v => v / 100;

  M.register('accounting', [
    {
      id: 'breakeven', name: 'Break-even & CVP', desc: 'Break-even point, target profit volume, margin of safety and operating leverage.',
      keywords: 'cost volume profit contribution margin break even point margin of safety',
      inputs: [
        { id: 'fixed', label: 'Fixed costs', unit: 'cur', value: 50000 },
        { id: 'price', label: 'Price per unit', unit: 'cur', value: 100 },
        { id: 'vc', label: 'Variable cost per unit', unit: 'cur', value: 60 },
        { id: 'target', label: 'Target profit', unit: 'cur', value: 20000 },
        { id: 'sales', label: 'Expected sales', unit: 'units', value: 2000 }
      ],
      compute(v) {
        const cm = v.price - v.vc;
        need(cm > 0, 'Price must be greater than variable cost per unit.');
        const be = v.fixed / cm, cmr = cm / v.price;
        const profit = v.sales * cm - v.fixed;
        const xmax = Math.max(be * 2, v.sales * 1.2);
        const xs = M.range(0, xmax, 2);
        return {
          results: [
            r('Break-even volume', be, 'd2', true, 'units'),
            r('Break-even revenue', be * v.price, 'money', true),
            r('Contribution margin per unit', cm, 'money'),
            r('Contribution margin ratio', cmr, 'pct'),
            r('Units for target profit', (v.fixed + v.target) / cm, 'd2', false, 'units'),
            r('Revenue for target profit', (v.fixed + v.target) / cmr, 'money'),
            sec('At expected sales'),
            r('Operating profit', profit, 'money'),
            r('Margin of safety', v.sales - be, 'd2', false, 'units'),
            r('Margin of safety ratio', (v.sales - be) / v.sales, 'pct'),
            r('Degree of operating leverage', profit !== 0 ? v.sales * cm / profit : NaN, 'd2')
          ],
          charts: [{ type: 'line', title: 'Cost–volume–profit', xLabel: 'Units', yLabel: 'Amount',
            series: [{ name: 'Revenue', points: xs.map(x => [x, x * v.price]) }, { name: 'Total cost', points: xs.map(x => [x, v.fixed + x * v.vc]), dashed: true }, { name: 'Fixed cost', points: xs.map(x => [x, v.fixed]) }],
            vlines: [{ x: be, label: 'Break-even' }] }]
        };
      },
      formula: ['Break-even units = Fixed costs / (Price − Variable cost)', 'Units for target = (Fixed + Target profit) / CM per unit', 'DOL = Contribution margin / Operating profit']
    },
    {
      id: 'markup', name: 'Margin & markup', desc: 'Convert between cost, price, gross margin and markup.',
      keywords: 'gross margin markup pricing cost plus',
      inputs: [
        { id: 'cost', label: 'Unit cost', unit: 'cur', value: 60 },
        { id: 'price', label: 'Selling price', unit: 'cur', value: 100 },
        { id: 'tm', label: 'Target gross margin', unit: '%', value: 45 },
        { id: 'tk', label: 'Target markup', unit: '%', value: 50 }
      ],
      compute(v) {
        need(v.cost > 0 && v.price > 0, 'Cost and price must be positive.');
        need(v.tm < 100, 'Target margin must be below 100%.');
        const gp = v.price - v.cost;
        return {
          results: [
            r('Gross profit per unit', gp, 'money', true),
            r('Gross margin', gp / v.price, 'pct', true),
            r('Markup on cost', gp / v.cost, 'pct', true),
            sec('Pricing'),
            r('Price for target margin', v.cost / (1 - pct(v.tm)), 'money'),
            r('Price for target markup', v.cost * (1 + pct(v.tk)), 'money'),
            r('Markup equivalent to target margin', pct(v.tm) / (1 - pct(v.tm)), 'pct'),
            r('Margin equivalent to target markup', pct(v.tk) / (1 + pct(v.tk)), 'pct')
          ]
        };
      },
      formula: ['Margin = (Price − Cost) / Price', 'Markup = (Price − Cost) / Cost', 'Price = Cost / (1 − Margin) = Cost × (1 + Markup)']
    },
    {
      id: 'depreciation', name: 'Depreciation schedule', desc: 'Straight-line, double-declining balance and sum-of-years\'-digits schedules side by side.',
      keywords: 'straight line declining balance sum of years digits ddb syd book value',
      inputs: [
        { id: 'cost', label: 'Asset cost', unit: 'cur', value: 100000 },
        { id: 'salvage', label: 'Salvage value', unit: 'cur', value: 10000 },
        { id: 'life', label: 'Useful life', unit: 'years', value: 5 }
      ],
      compute(v) {
        const n = Math.round(v.life);
        need(n >= 1 && n <= 100, 'Life must be between 1 and 100 years.');
        need(v.salvage < v.cost, 'Salvage must be less than cost.');
        const base = v.cost - v.salvage, syd = n * (n + 1) / 2;
        let bvS = v.cost, bvD = v.cost, bvY = v.cost;
        const rows = [], pts = [[[0, v.cost]], [[0, v.cost]], [[0, v.cost]]];
        for (let t = 1; t <= n; t++) {
          const sl = base / n;
          let ddb = t === n ? bvD - v.salvage : Math.min(bvD * 2 / n, bvD - v.salvage);
          ddb = Math.max(0, ddb);
          const sy = base * (n - t + 1) / syd;
          bvS -= sl; bvD -= ddb; bvY -= sy;
          rows.push([t, sl, bvS, ddb, bvD, sy, bvY]);
          pts[0].push([t, bvS]); pts[1].push([t, bvD]); pts[2].push([t, bvY]);
        }
        return {
          results: [
            r('Straight-line annual depreciation', base / n, 'money', true),
            r('DDB first-year depreciation', rows[0][3], 'money'),
            r('SYD first-year depreciation', rows[0][5], 'money'),
            r('Depreciable base', base, 'money')
          ],
          tables: [{ head: ['Year', 'SL dep.', 'SL book value', 'DDB dep.', 'DDB book value', 'SYD dep.', 'SYD book value'], fmts: ['int', 'money', 'money', 'money', 'money', 'money', 'money'], rows }],
          charts: [{ type: 'line', title: 'Book value', xLabel: 'Year', yLabel: 'Book value',
            series: [{ name: 'Straight-line', points: pts[0], markers: true }, { name: 'Double-declining', points: pts[1], markers: true, dashed: true }, { name: 'Sum-of-years\'-digits', points: pts[2], markers: true }] }],
          notes: ['DDB stops at salvage value; the final year is set so book value ends at salvage.']
        };
      },
      formula: ['SL = (Cost − Salvage) / n', 'DDB = Opening book value × 2/n', 'SYD = (Cost − Salvage) × remaining life / (n(n+1)/2)']
    },
    {
      id: 'ratios', name: 'Financial ratio analysis', desc: 'Liquidity, profitability, leverage and efficiency ratios from statement figures.',
      keywords: 'current ratio quick ratio acid test debt to equity roe roa margin interest coverage asset turnover',
      inputs: [
        { id: 'rev', label: 'Revenue', unit: 'cur', value: 1000000 },
        { id: 'cogs', label: 'Cost of goods sold', unit: 'cur', value: 600000 },
        { id: 'ebit', label: 'Operating income (EBIT)', unit: 'cur', value: 150000 },
        { id: 'int', label: 'Interest expense', unit: 'cur', value: 20000 },
        { id: 'ni', label: 'Net income', unit: 'cur', value: 97500 },
        { id: 'cash', label: 'Cash & equivalents', unit: 'cur', value: 80000 },
        { id: 'ar', label: 'Accounts receivable', unit: 'cur', value: 120000 },
        { id: 'inv', label: 'Inventory', unit: 'cur', value: 150000 },
        { id: 'ca', label: 'Total current assets', unit: 'cur', value: 380000 },
        { id: 'ta', label: 'Total assets', unit: 'cur', value: 900000 },
        { id: 'cl', label: 'Total current liabilities', unit: 'cur', value: 200000 },
        { id: 'tl', label: 'Total liabilities', unit: 'cur', value: 450000 },
        { id: 'eq', label: 'Shareholders\' equity', unit: 'cur', value: 450000 }
      ],
      compute(v) {
        const d = (a, b) => b ? a / b : NaN;
        return {
          results: [
            sec('Liquidity'),
            r('Current ratio', d(v.ca, v.cl), 'd2'),
            r('Quick ratio', d(v.ca - v.inv, v.cl), 'd2'),
            r('Cash ratio', d(v.cash, v.cl), 'd2'),
            r('Net working capital', v.ca - v.cl, 'money'),
            sec('Profitability'),
            r('Gross margin', d(v.rev - v.cogs, v.rev), 'pct'),
            r('Operating margin', d(v.ebit, v.rev), 'pct'),
            r('Net margin', d(v.ni, v.rev), 'pct'),
            r('Return on assets', d(v.ni, v.ta), 'pct'),
            r('Return on equity', d(v.ni, v.eq), 'pct'),
            sec('Leverage'),
            r('Debt to equity', d(v.tl, v.eq), 'd2'),
            r('Debt ratio', d(v.tl, v.ta), 'pct'),
            r('Equity multiplier', d(v.ta, v.eq), 'd2'),
            r('Interest coverage', d(v.ebit, v.int), 'x'),
            sec('Efficiency'),
            r('Asset turnover', d(v.rev, v.ta), 'x'),
            r('Inventory turnover', d(v.cogs, v.inv), 'x'),
            r('Receivables turnover', d(v.rev, v.ar), 'x'),
            r('Days sales outstanding', d(v.ar * 365, v.rev), 'd2', false, 'days'),
            r('Days inventory outstanding', d(v.inv * 365, v.cogs), 'd2', false, 'days')
          ],
          notes: ['Balance sheet figures are period-end values. Use averages for more accurate turnover ratios.']
        };
      },
      formula: ['Current = CA / CL;  Quick = (CA − Inventory) / CL', 'ROE = Net income / Equity;  ROA = Net income / Total assets', 'Interest coverage = EBIT / Interest']
    },
    {
      id: 'dupont', name: 'DuPont analysis', desc: 'Break ROE into margin, turnover and leverage (3-step and 5-step).',
      keywords: 'return on equity decomposition dupont tax burden interest burden',
      inputs: [
        { id: 'ni', label: 'Net income', unit: 'cur', value: 97500 },
        { id: 'ebt', label: 'Pre-tax income (EBT)', unit: 'cur', value: 130000 },
        { id: 'ebit', label: 'EBIT', unit: 'cur', value: 150000 },
        { id: 'rev', label: 'Revenue', unit: 'cur', value: 1000000 },
        { id: 'ta', label: 'Average total assets', unit: 'cur', value: 900000 },
        { id: 'eq', label: 'Average equity', unit: 'cur', value: 450000 }
      ],
      compute(v) {
        const nm = v.ni / v.rev, at = v.rev / v.ta, em = v.ta / v.eq;
        return {
          results: [
            r('Return on equity', nm * at * em, 'pct', true),
            sec('3-step'),
            r('Net profit margin', nm, 'pct'), r('Asset turnover', at, 'x'), r('Equity multiplier', em, 'x'),
            sec('5-step'),
            r('Tax burden (NI / EBT)', v.ni / v.ebt, 'd4'),
            r('Interest burden (EBT / EBIT)', v.ebt / v.ebit, 'd4'),
            r('Operating margin (EBIT / Revenue)', v.ebit / v.rev, 'pct'),
            r('Asset turnover', at, 'x'), r('Equity multiplier', em, 'x')
          ]
        };
      },
      formula: ['ROE = (NI/Revenue) × (Revenue/Assets) × (Assets/Equity)', 'ROE = (NI/EBT) × (EBT/EBIT) × (EBIT/Revenue) × (Revenue/Assets) × (Assets/Equity)']
    },
    {
      id: 'ccc', name: 'Cash conversion cycle', desc: 'Days sales, inventory and payables outstanding and the operating cycle.',
      keywords: 'working capital dso dio dpo operating cycle cash cycle',
      inputs: [
        { id: 'rev', label: 'Annual revenue', unit: 'cur', value: 1000000 },
        { id: 'cogs', label: 'Annual COGS', unit: 'cur', value: 600000 },
        { id: 'ar', label: 'Accounts receivable', unit: 'cur', value: 120000 },
        { id: 'inv', label: 'Inventory', unit: 'cur', value: 150000 },
        { id: 'ap', label: 'Accounts payable', unit: 'cur', value: 70000 },
        { id: 'days', label: 'Days in period', value: 365 }
      ],
      compute(v) {
        const dso = v.ar / v.rev * v.days, dio = v.inv / v.cogs * v.days, dpo = v.ap / v.cogs * v.days;
        return {
          results: [
            r('Cash conversion cycle', dso + dio - dpo, 'd2', true, 'days'),
            r('Operating cycle', dso + dio, 'd2', false, 'days'),
            r('Days sales outstanding', dso, 'd2', false, 'days'),
            r('Days inventory outstanding', dio, 'd2', false, 'days'),
            r('Days payables outstanding', dpo, 'd2', false, 'days')
          ]
        };
      },
      formula: ['CCC = DSO + DIO − DPO', 'DSO = AR/Revenue × days;  DIO = Inventory/COGS × days;  DPO = AP/COGS × days']
    },
    {
      id: 'leverage', name: 'Operating & financial leverage', desc: 'DOL, DFL and DTL and their effect on EBIT and EPS.',
      keywords: 'degree of operating leverage financial leverage combined total leverage eps',
      inputs: [
        { id: 'q', label: 'Units sold', value: 10000 },
        { id: 'p', label: 'Price per unit', unit: 'cur', value: 50 },
        { id: 'vc', label: 'Variable cost per unit', unit: 'cur', value: 30 },
        { id: 'fc', label: 'Fixed operating costs', unit: 'cur', value: 100000 },
        { id: 'int', label: 'Interest expense', unit: 'cur', value: 40000 },
        { id: 'chg', label: 'Change in sales to test', unit: '%', value: 10 }
      ],
      compute(v) {
        const cm = v.q * (v.p - v.vc), ebit = cm - v.fc, ebt = ebit - v.int;
        need(ebit !== 0 && ebt !== 0, 'EBIT and pre-tax income must not be zero.');
        const dol = cm / ebit, dfl = ebit / ebt, dtl = dol * dfl;
        return {
          results: [
            r('Degree of operating leverage', dol, 'd2', true),
            r('Degree of financial leverage', dfl, 'd2', true),
            r('Degree of total leverage', dtl, 'd2', true),
            r('Contribution margin', cm, 'money'), r('EBIT', ebit, 'money'), r('EBT', ebt, 'money'),
            sec('If sales change by ' + M.fmtNum(v.chg) + '%'),
            r('EBIT changes by', dol * pct(v.chg), 'pct'),
            r('EPS changes by', dtl * pct(v.chg), 'pct')
          ]
        };
      },
      formula: ['DOL = Contribution margin / EBIT', 'DFL = EBIT / (EBIT − Interest)', 'DTL = DOL × DFL']
    }
  ]);
})();
