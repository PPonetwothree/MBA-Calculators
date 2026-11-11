(function () {
  'use strict';
  const M = window.MC;
  const { need, sum } = M;
  const r = (label, value, f, key, hint) => ({ label, value, fmt: f, key, hint });
  const pct = v => v / 100;

  M.register('marketing', [
    {
      id: 'clv', name: 'Customer lifetime value', desc: 'Present value of the margin a customer generates, given retention and a discount rate.',
      keywords: 'clv ltv customer lifetime value retention rate customer equity',
      inputs: [
        { id: 'aov', label: 'Average order value', unit: 'cur', value: 80 },
        { id: 'freq', label: 'Purchases per year', value: 4 },
        { id: 'gm', label: 'Gross margin', unit: '%', value: 40 },
        { id: 'ret', label: 'Annual retention rate', unit: '%', value: 75 },
        { id: 'd', label: 'Discount rate', unit: '%', value: 10 },
        { id: 'cac', label: 'Acquisition cost per customer', unit: 'cur', value: 150 }
      ],
      compute(v) {
        const m = v.aov * v.freq * pct(v.gm), rr = pct(v.ret), d = pct(v.d);
        need(rr >= 0 && rr < 1, 'Retention must be at least 0% and below 100%.');
        const clv = m / (1 + d - rr);
        const rows = [];
        let cum = 0;
        for (let t = 1; t <= 10; t++) { const alive = Math.pow(rr, t - 1), pv = m * alive / Math.pow(1 + d, t); cum += pv; rows.push([t, alive, m * alive, pv, cum]); }
        return {
          results: [
            r('Customer lifetime value', clv, 'money', true),
            r('CLV net of acquisition cost', clv - v.cac, 'money', true),
            r('Annual margin per active customer', m, 'money'),
            r('Expected customer lifetime', 1 / (1 - rr), 'd2', false, 'years'),
            r('CLV : CAC', v.cac > 0 ? clv / v.cac : NaN, 'x')
          ],
          tables: [{ title: 'First 10 years', head: ['Year', 'Survival probability', 'Expected margin', 'PV', 'Cumulative PV'], fmts: ['int', 'pct', 'money', 'money', 'money'], rows }],
          notes: ['Assumes margin is received at the end of each year the customer is active, starting in year 1.']
        };
      },
      formula: ['CLV = m / (1 + d − r)', 'm = order value × frequency × gross margin;  r = retention;  d = discount rate']
    },
    {
      id: 'saas', name: 'CAC, LTV & payback', desc: 'Subscription unit economics: acquisition cost, lifetime value, LTV:CAC and payback months.',
      keywords: 'customer acquisition cost cac ltv cac ratio payback saas subscription churn arpu unit economics',
      inputs: [
        { id: 'spend', label: 'Sales & marketing spend', unit: 'cur', value: 120000 },
        { id: 'new', label: 'New customers acquired', value: 400 },
        { id: 'arpa', label: 'Monthly revenue per customer', unit: 'cur', value: 50 },
        { id: 'gm', label: 'Gross margin', unit: '%', value: 75 },
        { id: 'churn', label: 'Monthly churn', unit: '%', value: 3 }
      ],
      compute(v) {
        need(v.new > 0 && v.churn > 0, 'Customers and churn must be positive.');
        const cac = v.spend / v.new, mm = v.arpa * pct(v.gm), ltv = mm / pct(v.churn);
        return {
          results: [
            r('CAC', cac, 'money', true), r('LTV', ltv, 'money', true), r('LTV : CAC', ltv / cac, 'x', true),
            r('CAC payback', cac / mm, 'd2', false, 'months'),
            r('Average customer lifetime', 1 / pct(v.churn), 'd2', false, 'months'),
            r('Annual churn equivalent', 1 - Math.pow(1 - pct(v.churn), 12), 'pct')
          ],
          notes: ['A common rule of thumb is LTV:CAC of at least 3 and CAC payback under 12 months.']
        };
      },
      formula: ['CAC = Spend / New customers', 'LTV = Monthly revenue × Gross margin / Monthly churn', 'Payback = CAC / Monthly gross margin per customer']
    },
    {
      id: 'roas', name: 'Marketing ROI & ROAS', desc: 'Return on ad spend, marketing ROI and break-even ROAS.',
      keywords: 'roas return on ad spend marketing roi romi campaign advertising',
      inputs: [
        { id: 'spend', label: 'Campaign spend', unit: 'cur', value: 20000 },
        { id: 'rev', label: 'Attributed revenue', unit: 'cur', value: 90000 },
        { id: 'gm', label: 'Gross margin', unit: '%', value: 35 }
      ],
      compute(v) {
        const gp = v.rev * pct(v.gm);
        return {
          results: [r('ROAS', v.rev / v.spend, 'x', true), r('Marketing ROI (on gross profit)', (gp - v.spend) / v.spend, 'pct', true), r('Gross profit generated', gp, 'money'), r('Profit after spend', gp - v.spend, 'money'), r('Break-even ROAS', 1 / pct(v.gm), 'x')]
        };
      },
      formula: ['ROAS = Revenue / Spend', 'ROI = (Revenue × Margin − Spend) / Spend', 'Break-even ROAS = 1 / Margin']
    },
    {
      id: 'optprice', name: 'Optimal price from elasticity', desc: 'Profit-maximizing price and markup using the inverse elasticity (Lerner) rule.',
      keywords: 'pricing optimal markup price elasticity lerner rule marginal cost',
      inputs: [
        { id: 'mc', label: 'Marginal cost per unit', unit: 'cur', value: 30 },
        { id: 'e', label: 'Price elasticity of demand', value: -2.5, help: 'Negative number with |E| > 1.' }
      ],
      compute(v) {
        const e = -Math.abs(v.e);
        need(Math.abs(e) > 1, 'Elasticity must be greater than 1 in absolute value.');
        const p = v.mc * e / (1 + e);
        return { results: [r('Optimal price', p, 'money', true), r('Markup on cost', p / v.mc - 1, 'pct'), r('Margin (Lerner index)', (p - v.mc) / p, 'pct')] };
      },
      formula: ['P = MC × E / (1 + E)', '(P − MC) / P = −1/E']
    },
    {
      id: 'marketsize', name: 'Market sizing (TAM / SAM / SOM)', desc: 'Top-down market size in units and revenue.',
      keywords: 'tam sam som total addressable market serviceable obtainable market size',
      inputs: [
        { id: 'pop', label: 'Total potential customers', value: 50000000 },
        { id: 'sam', label: 'Share you can serve (SAM)', unit: '%', value: 20 },
        { id: 'som', label: 'Share of SAM you can win (SOM)', unit: '%', value: 5 },
        { id: 'freq', label: 'Purchases per customer per year', value: 2 },
        { id: 'price', label: 'Price per purchase', unit: 'cur', value: 25 }
      ],
      compute(v) {
        const per = v.freq * v.price, tam = v.pop * per, sam = tam * pct(v.sam), som = sam * pct(v.som);
        return {
          results: [r('TAM', tam, 'money', true), r('SAM', sam, 'money', true), r('SOM', som, 'money', true), r('Customers in SOM', v.pop * pct(v.sam) * pct(v.som), 'int')],
          charts: [{ type: 'bar', title: 'Annual revenue', labels: ['TAM', 'SAM', 'SOM'], series: [{ name: 'Revenue', values: [tam, sam, som] }] }]
        };
      },
      formula: ['TAM = Customers × Frequency × Price', 'SAM = TAM × serviceable share;  SOM = SAM × obtainable share']
    },
    {
      id: 'funnel', name: 'Conversion funnel', desc: 'Stage-to-stage and overall conversion rates.',
      keywords: 'conversion funnel rate drop off pipeline aida',
      inputs: [{ id: 'stages', label: 'Stages: name, count', type: 'text', rows: 6, value: 'Visitors, 50000\nSign-ups, 4000\nActivated, 2200\nTrial, 900\nPaid, 310' }],
      compute(v) {
        const rows = M.parseRows(v.stages).map((x, i) => { const n = M.rowNums(x, i + 1); need(n.length === 1, 'Line ' + (i + 1) + ': expected "name, count".'); return [x.label || 'Stage ' + (i + 1), n[0]]; });
        need(rows.length >= 2, 'Enter at least two stages.');
        const top = rows[0][1];
        return {
          results: [r('Overall conversion', rows[rows.length - 1][1] / top, 'pct', true)],
          tables: [{ head: ['Stage', 'Count', 'From previous', 'From top', 'Drop-off'], fmts: ['text', 'int', 'pct', 'pct', 'int'],
            rows: rows.map((x, i) => [x[0], x[1], i ? x[1] / rows[i - 1][1] : NaN, x[1] / top, i ? rows[i - 1][1] - x[1] : NaN]) }],
          charts: [{ type: 'bar', title: 'Funnel', labels: rows.map(x => x[0]), series: [{ name: 'Count', values: rows.map(x => x[1]) }] }]
        };
      },
      formula: ['Stage conversion = Countₙ / Countₙ₋₁', 'Overall = Last stage / First stage']
    },
    {
      id: 'churn', name: 'Churn & retention', desc: 'Customer churn, retention and net growth for a period.',
      keywords: 'churn rate retention rate customer attrition net revenue retention',
      inputs: [
        { id: 'start', label: 'Customers at start', value: 2000 },
        { id: 'new', label: 'New customers during period', value: 350 },
        { id: 'end', label: 'Customers at end', value: 2150 }
      ],
      compute(v) {
        const lost = v.start + v.new - v.end;
        need(lost >= 0, 'End count is higher than start plus new; check the numbers.');
        return { results: [r('Churn rate', lost / v.start, 'pct', true), r('Retention rate', (v.end - v.new) / v.start, 'pct', true), r('Customers lost', lost, 'int'), r('Net growth', v.end / v.start - 1, 'pct')] };
      },
      formula: ['Churn = Lost / Start', 'Retention = (End − New) / Start']
    },
    {
      id: 'nps', name: 'Net Promoter Score', desc: 'NPS from counts of promoters, passives and detractors, with a margin of error.',
      keywords: 'nps net promoter score customer satisfaction survey promoters detractors',
      inputs: [
        { id: 'p', label: 'Promoters (9–10)', value: 420 },
        { id: 'n', label: 'Passives (7–8)', value: 310 },
        { id: 'd', label: 'Detractors (0–6)', value: 170 }
      ],
      compute(v) {
        const t = v.p + v.n + v.d;
        need(t > 0, 'Enter at least one response.');
        const pp = v.p / t, pd = v.d / t, nps = (pp - pd) * 100;
        const se = Math.sqrt((pp + pd - (pp - pd) ** 2) / t) * 100;
        return { results: [r('NPS', nps, 'd2', true), r('95% margin of error', 1.96 * se, 'd2', false, '± points'), r('Promoters', pp, 'pct'), r('Passives', v.n / t, 'pct'), r('Detractors', pd, 'pct'), r('Responses', t, 'int')] };
      },
      formula: ['NPS = %Promoters − %Detractors']
    }
  ]);
})();
