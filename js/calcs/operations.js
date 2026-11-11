(function () {
  'use strict';
  const M = window.MC;
  const { need, fmt, sum, mean } = M;
  const r = (label, value, f, key, hint) => ({ label, value, fmt: f, key, hint });
  const sec = section => ({ section });
  const pct = v => v / 100;

  // Erlang C queue metrics for M/M/c.
  function mmc(lambda, mu, c) {
    const a = lambda / mu, rho = a / c;
    if (rho >= 1) return null;
    let term = 1, s = 1;
    for (let n = 1; n < c; n++) { term *= a / n; s += term; }
    const last = term * a / c / (1 - rho);
    const p0 = 1 / (s + last);
    const pw = last * p0;
    const lq = pw * rho / (1 - rho);
    const wq = lq / lambda, w = wq + 1 / mu;
    return { a, rho, p0, pw, lq, wq, w, l: lambda * w };
  }
  const SPC = { 2: [1.880, 0, 3.267, 1.128], 3: [1.023, 0, 2.574, 1.693], 4: [0.729, 0, 2.282, 2.059], 5: [0.577, 0, 2.114, 2.326], 6: [0.483, 0, 2.004, 2.534], 7: [0.419, 0.076, 1.924, 2.704], 8: [0.373, 0.136, 1.864, 2.847], 9: [0.337, 0.184, 1.816, 2.970], 10: [0.308, 0.223, 1.777, 3.078] };

  M.register('operations', [
    {
      id: 'eoq', name: 'Economic order quantity', desc: 'Optimal order size, ordering frequency, total inventory cost and reorder point.',
      keywords: 'eoq inventory order quantity wilson holding cost ordering cost reorder point',
      inputs: [
        { id: 'd', label: 'Annual demand', unit: 'units', value: 12000 },
        { id: 's', label: 'Cost per order', unit: 'cur', value: 100 },
        { id: 'h', label: 'Holding cost per unit per year', unit: 'cur', value: 2.4 },
        { id: 'days', label: 'Working days per year', value: 300 },
        { id: 'lt', label: 'Lead time', unit: 'days', value: 5 }
      ],
      compute(v) {
        need(v.d > 0 && v.s > 0 && v.h > 0, 'Demand, order cost and holding cost must be positive.');
        const q = Math.sqrt(2 * v.d * v.s / v.h), orders = v.d / q;
        const tc = Q => v.d / Q * v.s + Q / 2 * v.h;
        const xs = M.range(q * 0.2, q * 3, 60);
        return {
          results: [
            r('Economic order quantity', q, 'd2', true, 'units'),
            r('Orders per year', orders, 'd2'),
            r('Days between orders', v.days / orders, 'd2', false, 'days'),
            r('Annual ordering cost', orders * v.s, 'money'),
            r('Annual holding cost', q / 2 * v.h, 'money'),
            r('Total annual inventory cost', tc(q), 'money', true),
            r('Reorder point', v.d / v.days * v.lt, 'd2', false, 'units')
          ],
          charts: [{ type: 'line', title: 'Annual cost vs order quantity', xLabel: 'Order quantity', yLabel: 'Annual cost',
            series: [{ name: 'Total cost', points: xs.map(x => [x, tc(x)]) }, { name: 'Holding', points: xs.map(x => [x, x / 2 * v.h]), dashed: true }, { name: 'Ordering', points: xs.map(x => [x, v.d / x * v.s]), dashed: true }],
            vlines: [{ x: q, label: 'EOQ' }] }]
        };
      },
      formula: ['EOQ = √(2DS / H)', 'Total cost = (D/Q)·S + (Q/2)·H', 'Reorder point = daily demand × lead time']
    },
    {
      id: 'epq', name: 'Production order quantity', desc: 'Economic production quantity when inventory builds up gradually during production.',
      keywords: 'epq economic production quantity production run size gradual replenishment',
      inputs: [
        { id: 'd', label: 'Annual demand', unit: 'units', value: 12000 },
        { id: 's', label: 'Setup cost per run', unit: 'cur', value: 100 },
        { id: 'h', label: 'Holding cost per unit per year', unit: 'cur', value: 2.4 },
        { id: 'p', label: 'Daily production rate', unit: 'units/day', value: 100 },
        { id: 'dd', label: 'Daily demand rate', unit: 'units/day', value: 40 }
      ],
      compute(v) {
        need(v.p > v.dd, 'Production rate must exceed demand rate.');
        const f = 1 - v.dd / v.p, q = Math.sqrt(2 * v.d * v.s / (v.h * f)), imax = q * f;
        return {
          results: [
            r('Optimal production quantity', q, 'd2', true, 'units'),
            r('Maximum inventory', imax, 'd2', false, 'units'),
            r('Production runs per year', v.d / q, 'd2'),
            r('Length of production run', q / v.p, 'd2', false, 'days'),
            r('Annual setup cost', v.d / q * v.s, 'money'),
            r('Annual holding cost', imax / 2 * v.h, 'money'),
            r('Total annual cost', v.d / q * v.s + imax / 2 * v.h, 'money', true)
          ]
        };
      },
      formula: ['Q* = √(2DS / [H(1 − d/p)])', 'Max inventory = Q(1 − d/p)']
    },
    {
      id: 'qdiscount', name: 'Quantity discount EOQ', desc: 'Best order quantity when the supplier offers price breaks.',
      keywords: 'quantity discount price break all units eoq',
      inputs: [
        { id: 'd', label: 'Annual demand', unit: 'units', value: 5000 },
        { id: 's', label: 'Cost per order', unit: 'cur', value: 49 },
        { id: 'i', label: 'Holding cost, % of unit price per year', unit: '%', value: 20 },
        { id: 'breaks', label: 'Price breaks: minimum quantity, unit price', type: 'text', rows: 4, value: '0, 5.00\n1000, 4.80\n2000, 4.75', help: 'One tier per line. All-units discount.' }
      ],
      compute(v) {
        const tiers = M.parseMatrix(v.breaks).m.map(x => ({ min: x[0], price: x[1] })).sort((a, b) => a.min - b.min);
        need(tiers.every(t => t.price > 0), 'Prices must be positive.');
        const ic = pct(v.i);
        const rows = tiers.map((t, k) => {
          const max = k + 1 < tiers.length ? tiers[k + 1].min - 1 : Infinity;
          const eoq = Math.sqrt(2 * v.d * v.s / (ic * t.price));
          let q = eoq, note = 'EOQ feasible';
          if (eoq < t.min) { q = t.min; note = 'Raised to tier minimum'; }
          else if (eoq > max) { q = NaN; note = 'EOQ above tier; skip'; }
          const q0 = Math.max(q, 1);
          const tc = Number.isFinite(q) ? v.d * t.price + v.d / q0 * v.s + q0 / 2 * ic * t.price : NaN;
          return [t.min + (max === Infinity ? '+' : '–' + max), t.price, eoq, q, tc, note];
        });
        const best = rows.filter(x => Number.isFinite(x[4])).sort((a, b) => a[4] - b[4])[0];
        need(best, 'No feasible tier.');
        return {
          results: [r('Best order quantity', best[3], 'd2', true, 'units'), r('Unit price', best[1], 'money'), r('Total annual cost', best[4], 'money', true)],
          tables: [{ head: ['Tier (units)', 'Price', 'EOQ at price', 'Order qty', 'Total annual cost', 'Note'], fmts: ['text', 'money', 'd2', 'd2', 'money', 'text'], rows }]
        };
      },
      formula: ['For each tier: Q = √(2DS / (I·P)), raised to the tier minimum if below it', 'Total cost = D·P + (D/Q)·S + (Q/2)·I·P; choose the lowest']
    },
    {
      id: 'safetystock', name: 'Safety stock & reorder point', desc: 'Safety stock for a target service level with variable demand and lead time.',
      keywords: 'safety stock reorder point service level cycle service lead time variability',
      inputs: [
        { id: 'd', label: 'Average daily demand', unit: 'units', value: 50 },
        { id: 'sd', label: 'Std. deviation of daily demand', unit: 'units', value: 12 },
        { id: 'lt', label: 'Average lead time', unit: 'days', value: 7 },
        { id: 'slt', label: 'Std. deviation of lead time', unit: 'days', value: 1 },
        { id: 'sl', label: 'Cycle service level', unit: '%', value: 95 }
      ],
      compute(v) {
        need(v.sl > 0 && v.sl < 100, 'Service level must be between 0 and 100%.');
        const sig = Math.sqrt(v.lt * v.sd * v.sd + v.d * v.d * v.slt * v.slt);
        const z = M.normInv(pct(v.sl)), ss = z * sig;
        return {
          results: [
            r('Safety stock', ss, 'd2', true, 'units'),
            r('Reorder point', v.d * v.lt + ss, 'd2', true, 'units'),
            r('z-value', z, 'd4'),
            r('Lead time demand', v.d * v.lt, 'd2', false, 'units'),
            r('Std. dev. of lead time demand', sig, 'd2', false, 'units')
          ],
          tables: [{ title: 'Other service levels', head: ['Service level', 'z', 'Safety stock', 'Reorder point'], fmts: ['pct', 'd4', 'd2', 'd2'],
            rows: [0.8, 0.85, 0.9, 0.95, 0.975, 0.99, 0.995, 0.999].map(p => { const zz = M.normInv(p); return [p, zz, zz * sig, v.d * v.lt + zz * sig]; }) }]
        };
      },
      formula: ['σ_LT = √(L·σ_d² + d²·σ_L²)', 'Safety stock = z × σ_LT', 'ROP = d × L + safety stock']
    },
    {
      id: 'newsvendor', name: 'Newsvendor model', desc: 'Optimal single-period order quantity under uncertain, normally distributed demand.',
      keywords: 'single period critical ratio perishable overage underage cost',
      inputs: [
        { id: 'p', label: 'Selling price', unit: 'cur', value: 10 },
        { id: 'c', label: 'Unit cost', unit: 'cur', value: 4 },
        { id: 's', label: 'Salvage value', unit: 'cur', value: 1 },
        { id: 'g', label: 'Goodwill cost per unit short', unit: 'cur', value: 0 },
        { id: 'mu', label: 'Mean demand', unit: 'units', value: 1000 },
        { id: 'sigma', label: 'Std. deviation of demand', unit: 'units', value: 250 }
      ],
      compute(v) {
        const cu = v.p - v.c + v.g, co = v.c - v.s;
        need(cu > 0 && co > 0, 'Need price > cost > salvage.');
        const cr = cu / (cu + co), z = M.normInv(cr), q = v.mu + z * v.sigma;
        const L = z => M.normPdf(z) - z * (1 - M.normCdf(z));
        const es = v.mu - v.sigma * L(z), left = q - es, short = v.mu - es;
        const profit = v.p * es + v.s * left - v.c * q - v.g * short;
        return {
          results: [
            r('Optimal order quantity', q, 'd2', true, 'units'),
            r('Critical ratio', cr, 'pct'),
            r('z-value', z, 'd4'),
            r('Expected profit', profit, 'money', true),
            r('Expected units sold', es, 'd2'),
            r('Expected leftover', left, 'd2'),
            r('Expected shortage', short, 'd2'),
            r('Fill rate', es / v.mu, 'pct')
          ]
        };
      },
      formula: ['Cu = price − cost + goodwill;  Co = cost − salvage', 'Critical ratio = Cu / (Cu + Co)', 'Q* = μ + z·σ, where Φ(z) = critical ratio']
    },
    {
      id: 'turnover', name: 'Inventory turnover', desc: 'Turnover ratio and days of inventory on hand.',
      keywords: 'inventory turns days on hand stock turnover',
      inputs: [
        { id: 'cogs', label: 'Cost of goods sold', unit: 'cur', value: 600000 },
        { id: 'b', label: 'Beginning inventory', unit: 'cur', value: 140000 },
        { id: 'e', label: 'Ending inventory', unit: 'cur', value: 160000 },
        { id: 'days', label: 'Days in period', value: 365 }
      ],
      compute(v) {
        const avg = (v.b + v.e) / 2, t = v.cogs / avg;
        return { results: [r('Inventory turnover', t, 'x', true), r('Days of inventory', v.days / t, 'd2', true, 'days'), r('Average inventory', avg, 'money')] };
      },
      formula: ['Turnover = COGS / Average inventory', 'Days = Days in period / Turnover']
    },
    {
      id: 'littles', name: 'Little\'s law', desc: 'Relate work-in-process, throughput and flow time.',
      keywords: 'littles law wip throughput flow time cycle time',
      inputs: [
        { id: 'solve', label: 'Solve for', type: 'select', value: 'l', options: [['l', 'Inventory / WIP (L)'], ['lambda', 'Throughput (λ)'], ['w', 'Flow time (W)']] },
        { id: 'l', label: 'Average inventory (L)', unit: 'units', value: 120, showIf: v => v.solve !== 'l' },
        { id: 'lambda', label: 'Throughput rate (λ)', unit: 'units per time', value: 40, showIf: v => v.solve !== 'lambda' },
        { id: 'w', label: 'Flow time (W)', unit: 'time', value: 3, showIf: v => v.solve !== 'w' }
      ],
      compute(v) {
        let { l, lambda, w } = v;
        if (v.solve === 'l') l = lambda * w; else if (v.solve === 'lambda') lambda = l / w; else w = l / lambda;
        return { results: [r('Inventory (L)', l, 'd4', v.solve === 'l'), r('Throughput (λ)', lambda, 'd4', v.solve === 'lambda'), r('Flow time (W)', w, 'd4', v.solve === 'w')], notes: ['Throughput and flow time must use the same time unit.'] };
      },
      formula: ['L = λ × W']
    },
    {
      id: 'queue', name: 'Queueing (M/M/c)', desc: 'Waiting times, queue length and staffing cost for single or multiple servers.',
      keywords: 'queue waiting line mm1 mmc erlang c servers utilization service rate arrival rate',
      inputs: [
        { id: 'lambda', label: 'Arrival rate (λ)', unit: 'per hour', value: 18 },
        { id: 'mu', label: 'Service rate per server (μ)', unit: 'per hour', value: 10 },
        { id: 'c', label: 'Number of servers (c)', value: 2 },
        { id: 'cw', label: 'Waiting cost per customer-hour', unit: 'cur', value: 30 },
        { id: 'cs', label: 'Cost per server-hour', unit: 'cur', value: 20 }
      ],
      compute(v) {
        const c = Math.round(v.c);
        need(c >= 1 && v.lambda > 0 && v.mu > 0, 'Rates and servers must be positive.');
        const q = mmc(v.lambda, v.mu, c);
        need(q, 'Unstable: arrival rate must be less than c × μ (' + fmt(c * v.mu, 'd2') + ').');
        const cmin = Math.floor(v.lambda / v.mu) + 1;
        const rows = [];
        for (let k = cmin; k <= Math.max(cmin + 4, c); k++) {
          const x = mmc(v.lambda, v.mu, k);
          rows.push([k, x.rho, x.lq, x.wq * 60, x.pw, k * v.cs + x.l * v.cw]);
        }
        const best = rows.reduce((a, b) => b[5] < a[5] ? b : a);
        return {
          results: [
            r('Utilization (ρ)', q.rho, 'pct', true),
            r('Avg. number in queue (Lq)', q.lq, 'd4'),
            r('Avg. number in system (L)', q.l, 'd4'),
            r('Avg. wait in queue (Wq)', q.wq * 60, 'd2', true, 'minutes'),
            r('Avg. time in system (W)', q.w * 60, 'd2', false, 'minutes'),
            r('Probability of waiting', q.pw, 'pct'),
            r('Probability system is empty (P₀)', q.p0, 'pct'),
            r('Total cost per hour', c * v.cs + q.l * v.cw, 'money'),
            r('Lowest-cost number of servers', best[0], 'int')
          ],
          tables: [{ title: 'Staffing comparison', head: ['Servers', 'Utilization', 'Lq', 'Wq (min)', 'P(wait)', 'Cost per hour'], fmts: ['int', 'pct', 'd4', 'd2', 'pct', 'money'], rows }],
          notes: ['Assumes Poisson arrivals, exponential service times and first-come first-served. Waiting cost applies to time in the system.']
        };
      },
      formula: ['ρ = λ / (cμ)', 'P₀ = [Σₙ₌₀^{c−1} aⁿ/n! + aᶜ/(c!(1 − ρ))]⁻¹, a = λ/μ', 'Lq = P₀·aᶜ·ρ / (c!(1 − ρ)²);  Wq = Lq/λ;  W = Wq + 1/μ']
    },
    {
      id: 'linebalance', name: 'Takt time & line balancing', desc: 'Takt time, minimum stations and a station assignment using the longest-task-time rule.',
      keywords: 'assembly line balancing takt time cycle time workstations precedence efficiency balance delay',
      inputs: [
        { id: 'avail', label: 'Available production time per day', unit: 'minutes', value: 480 },
        { id: 'demand', label: 'Required output per day', unit: 'units', value: 40 },
        { id: 'tasks', label: 'Tasks: name, time (minutes), predecessors', type: 'text', rows: 8, value: 'A, 10, -\nB, 11, A\nC, 5, B\nD, 4, B\nE, 12, A\nF, 3, C D\nG, 7, F\nH, 11, E\nI, 3, G H', help: 'Separate multiple predecessors with spaces. Use - for none.' }
      ],
      compute(v) {
        need(v.demand > 0, 'Demand must be positive.');
        const takt = v.avail / v.demand;
        const tasks = String(v.tasks).split('\n').map(l => l.trim()).filter(Boolean).map((l, i) => {
          const p = l.split(',').map(s => s.trim());
          need(p.length >= 2, 'Line ' + (i + 1) + ': expected "name, time, predecessors".');
          const t = Number(p[1]);
          need(Number.isFinite(t) && t >= 0, 'Line ' + (i + 1) + ': time must be a number.');
          const pre = (p[2] || '').split(/\s+/).filter(x => x && x !== '-');
          return { name: p[0], t, pre };
        });
        const names = new Set(tasks.map(t => t.name));
        tasks.forEach(t => t.pre.forEach(p => need(names.has(p), 'Unknown predecessor "' + p + '" for task ' + t.name + '.')));
        const total = sum(tasks.map(t => t.t)), maxT = Math.max(...tasks.map(t => t.t));
        need(maxT <= takt + 1e-9, 'Task time ' + maxT + ' exceeds takt time ' + fmt(takt, 'd2') + '. Increase available time or reduce demand.');
        const followers = name => { const seen = new Set(), st = [name]; while (st.length) { const x = st.pop(); tasks.forEach(t => { if (t.pre.includes(x) && !seen.has(t.name)) { seen.add(t.name); st.push(t.name); } }); } return seen.size; };
        const done = new Set(), stations = [];
        let guard = 0;
        while (done.size < tasks.length && guard++ < 1000) {
          let left = takt; const st = [];
          for (;;) {
            const cand = tasks.filter(t => !done.has(t.name) && t.pre.every(p => done.has(p)) && t.t <= left + 1e-9);
            if (!cand.length) break;
            cand.sort((a, b) => b.t - a.t || followers(b.name) - followers(a.name));
            const pick = cand[0]; st.push(pick); done.add(pick.name); left -= pick.t;
          }
          need(st.length, 'Precedence relationships contain a cycle.');
          stations.push({ st, idle: left });
        }
        const n = stations.length;
        return {
          results: [
            r('Takt time', takt, 'd2', true, 'minutes per unit'),
            r('Total work content', total, 'd2', false, 'minutes'),
            r('Theoretical minimum stations', Math.ceil(total / takt - 1e-9), 'int', true),
            r('Stations used (heuristic)', n, 'int', true),
            r('Efficiency', total / (n * takt), 'pct'),
            r('Balance delay', 1 - total / (n * takt), 'pct')
          ],
          tables: [{ title: 'Station assignment', head: ['Station', 'Tasks', 'Station time', 'Idle time'], fmts: ['int', 'text', 'd2', 'd2'],
            rows: stations.map((s, i) => [i + 1, s.st.map(t => t.name).join(', '), takt - s.idle, s.idle]) }],
          notes: ['Heuristic: among tasks whose predecessors are done and that fit, assign the longest; ties go to the task with more followers.']
        };
      },
      formula: ['Takt time = Available time / Demand', 'Minimum stations = ⌈Σ task times / takt⌉', 'Efficiency = Σ task times / (stations × takt)']
    },
    {
      id: 'bottleneck', name: 'Process capacity & bottleneck', desc: 'Capacity of each step in a serial process, the bottleneck and utilization.',
      keywords: 'bottleneck process analysis capacity throughput utilization flow rate',
      inputs: [
        { id: 'steps', label: 'Steps: name, minutes per unit, resources', type: 'text', rows: 6, value: 'Cutting, 4, 1\nSewing, 9, 2\nFinishing, 3, 1\nPacking, 2, 1' },
        { id: 'demand', label: 'Demand rate', unit: 'units per hour', value: 12 }
      ],
      compute(v) {
        const rows = M.parseRows(v.steps).map((x, i) => {
          const n = M.rowNums(x, i + 1);
          need(n.length >= 1 && n[0] > 0, 'Line ' + (i + 1) + ': enter minutes per unit.');
          const res = n[1] || 1, cap = res * 60 / n[0];
          return { name: x.label || 'Step ' + (i + 1), t: n[0], res, cap };
        });
        const bn = rows.reduce((a, b) => b.cap < a.cap ? b : a);
        const flow = Math.min(bn.cap, v.demand);
        return {
          results: [
            r('Bottleneck', bn.name, 'text', true),
            r('Process capacity', bn.cap, 'd2', true, 'units per hour'),
            r('Flow rate', flow, 'd2', false, 'units per hour'),
            r('Process is', v.demand > bn.cap ? 'Capacity-constrained' : 'Demand-constrained', 'text'),
            r('Cycle time of process', 60 / bn.cap, 'd2', false, 'minutes per unit'),
            r('Throughput time (one unit, no waiting)', sum(rows.map(x => x.t)), 'd2', false, 'minutes')
          ],
          tables: [{ head: ['Step', 'Minutes/unit', 'Resources', 'Capacity/hour', 'Utilization'], fmts: ['text', 'd2', 'int', 'd2', 'pct'], rows: rows.map(x => [x.name, x.t, x.res, x.cap, flow / x.cap]) }],
          charts: [{ type: 'bar', title: 'Capacity by step (units/hour)', labels: rows.map(x => x.name), series: [{ name: 'Capacity', values: rows.map(x => x.cap) }] }]
        };
      },
      formula: ['Capacity of a step = resources × 60 / minutes per unit', 'Process capacity = capacity of the bottleneck', 'Utilization = flow rate / capacity']
    },
    {
      id: 'oee', name: 'OEE', desc: 'Overall equipment effectiveness from availability, performance and quality.',
      keywords: 'overall equipment effectiveness availability performance quality tpm lean',
      inputs: [
        { id: 'planned', label: 'Planned production time', unit: 'minutes', value: 420 },
        { id: 'down', label: 'Downtime', unit: 'minutes', value: 47 },
        { id: 'ict', label: 'Ideal cycle time', unit: 'seconds per unit', value: 1 },
        { id: 'total', label: 'Total units produced', value: 19271 },
        { id: 'good', label: 'Good units', value: 18848 }
      ],
      compute(v) {
        const run = v.planned - v.down;
        need(run > 0 && v.total > 0, 'Run time and total count must be positive.');
        const a = run / v.planned, p = v.ict * v.total / (run * 60), q = v.good / v.total;
        return {
          results: [r('OEE', a * p * q, 'pct', true), r('Availability', a, 'pct'), r('Performance', p, 'pct'), r('Quality', q, 'pct'), r('Run time', run, 'd2', false, 'minutes')],
          notes: ['85% OEE is often cited as world-class for discrete manufacturing.']
        };
      },
      formula: ['OEE = Availability × Performance × Quality', 'Availability = Run time / Planned time', 'Performance = Ideal cycle time × Total count / Run time', 'Quality = Good / Total']
    },
    {
      id: 'capability', name: 'Process capability', desc: 'Cp, Cpk, expected defects and sigma level for a normally distributed process.',
      keywords: 'cp cpk process capability six sigma specification limits usl lsl ppm',
      inputs: [
        { id: 'lsl', label: 'Lower specification limit', value: 9.5 },
        { id: 'usl', label: 'Upper specification limit', value: 10.5 },
        { id: 'mean', label: 'Process mean', value: 10.1 },
        { id: 'sd', label: 'Process standard deviation', value: 0.12 }
      ],
      compute(v) {
        need(v.usl > v.lsl && v.sd > 0, 'Need USL > LSL and a positive standard deviation.');
        const cp = (v.usl - v.lsl) / (6 * v.sd), cpu = (v.usl - v.mean) / (3 * v.sd), cpl = (v.mean - v.lsl) / (3 * v.sd), cpk = Math.min(cpu, cpl);
        const pOut = M.normCdf((v.lsl - v.mean) / v.sd) + 1 - M.normCdf((v.usl - v.mean) / v.sd);
        const xs = M.range(v.mean - 4.5 * v.sd, v.mean + 4.5 * v.sd, 80);
        return {
          results: [
            r('Cp', cp, 'd4', true), r('Cpk', cpk, 'd4', true), r('Cpu', cpu, 'd4'), r('Cpl', cpl, 'd4'),
            r('Expected defects', pOut * 1e6, 'd2', false, 'ppm'),
            r('Yield', 1 - pOut, 'pct'),
            r('Capable (Cpk ≥ 1.33)?', cpk >= 1.33 ? 'Yes' : 'No', 'text')
          ],
          charts: [{ type: 'line', title: 'Process distribution and specification limits', xLabel: 'Measurement', yLabel: 'Density', yZero: true,
            series: [{ name: 'Distribution', points: xs.map(x => [x, M.normPdf((x - v.mean) / v.sd) / v.sd]) }],
            vlines: [{ x: v.lsl, label: 'LSL' }, { x: v.usl, label: 'USL' }] }]
        };
      },
      formula: ['Cp = (USL − LSL) / 6σ', 'Cpk = min[(USL − μ)/3σ, (μ − LSL)/3σ]']
    },
    {
      id: 'sixsigma', name: 'Six Sigma (DPMO)', desc: 'Defects per million opportunities, yield and sigma level.',
      keywords: 'dpmo dpu sigma level yield defects six sigma',
      inputs: [
        { id: 'def', label: 'Defects found', value: 34 },
        { id: 'units', label: 'Units inspected', value: 1500 },
        { id: 'opp', label: 'Defect opportunities per unit', value: 8 }
      ],
      compute(v) {
        const dpo = v.def / (v.units * v.opp), dpmo = dpo * 1e6;
        return {
          results: [
            r('DPMO', dpmo, 'd2', true), r('Sigma level (with 1.5σ shift)', M.normInv(1 - dpo) + 1.5, 'd2', true),
            r('Defects per unit (DPU)', v.def / v.units, 'd4'), r('Yield', 1 - dpo, 'pct'),
            r('Rolled throughput yield (≈ e^−DPU)', Math.exp(-v.def / v.units), 'pct')
          ]
        };
      },
      formula: ['DPMO = Defects / (Units × Opportunities) × 10⁶', 'Sigma level = Φ⁻¹(1 − DPMO/10⁶) + 1.5']
    },
    {
      id: 'xbar', name: 'X̄–R control chart', desc: 'Control limits for subgroup means and ranges.',
      keywords: 'spc statistical process control xbar r chart control limits ucl lcl',
      inputs: [
        { id: 'data', label: 'Subgroups, one per line', type: 'text', rows: 8, value: '10.2, 9.9, 10.1, 10.0, 10.3\n10.1, 10.0, 9.8, 10.2, 10.1\n9.9, 10.2, 10.0, 10.1, 9.9\n10.0, 10.4, 10.2, 10.1, 10.0\n10.1, 9.8, 10.0, 9.9, 10.2\n10.3, 10.1, 10.2, 10.4, 10.0', help: 'Each line is one sample; all lines need 2–10 values.' }
      ],
      compute(v) {
        const { m } = M.parseMatrix(v.data), n = m[0].length;
        need(SPC[n], 'Subgroup size must be between 2 and 10.');
        const [A2, D3, D4, d2] = SPC[n];
        const xb = m.map(mean), rg = m.map(s => Math.max(...s) - Math.min(...s));
        const X = mean(xb), R = mean(rg);
        const ux = X + A2 * R, lx = X - A2 * R, ur = D4 * R, lr = D3 * R;
        const outX = xb.map((x, i) => x > ux || x < lx ? i + 1 : 0).filter(Boolean), outR = rg.map((x, i) => x > ur || x < lr ? i + 1 : 0).filter(Boolean);
        return {
          results: [
            r('Grand mean (X̿)', X, 'd4', true), r('X̄ chart UCL', ux, 'd4'), r('X̄ chart LCL', lx, 'd4'),
            r('Average range (R̄)', R, 'd4', true), r('R chart UCL', ur, 'd4'), r('R chart LCL', lr, 'd4'),
            r('Estimated σ (R̄/d₂)', R / d2, 'd4'),
            r('Out-of-control samples', outX.length || outR.length ? [...new Set(outX.concat(outR))].join(', ') : 'None', 'text')
          ],
          tables: [{ head: ['Sample', 'Mean', 'Range'], fmts: ['int', 'd4', 'd4'], rows: xb.map((x, i) => [i + 1, x, rg[i]]) }],
          charts: [
            { type: 'line', title: 'X̄ chart', xLabel: 'Sample', yLabel: 'Mean', yZero: false, series: [{ name: 'Mean', points: xb.map((x, i) => [i + 1, x]), markers: true }], hlines: [{ y: ux, label: 'UCL' }, { y: X, label: 'CL' }, { y: lx, label: 'LCL' }] },
            { type: 'line', title: 'R chart', xLabel: 'Sample', yLabel: 'Range', series: [{ name: 'Range', points: rg.map((x, i) => [i + 1, x]), markers: true }], hlines: [{ y: ur, label: 'UCL' }, { y: R, label: 'CL' }, { y: lr, label: 'LCL' }] }
          ]
        };
      },
      formula: ['X̄ chart: X̿ ± A₂R̄', 'R chart: UCL = D₄R̄, LCL = D₃R̄', 'Constants for n = ' + '2–10 from standard SPC tables']
    },
    {
      id: 'pchart', name: 'p-chart & c-chart', desc: 'Control limits for proportion defective or count of defects.',
      keywords: 'attribute control chart p chart c chart proportion defective count spc',
      inputs: [
        { id: 'type', label: 'Chart type', type: 'select', value: 'p', options: [['p', 'p-chart (proportion defective)'], ['c', 'c-chart (defects per unit)']] },
        { id: 'data', label: 'Defectives (p) or defects (c) per sample', type: 'list', value: '6, 4, 9, 3, 5, 7, 12, 4, 5, 6, 3, 8' },
        { id: 'n', label: 'Sample size', value: 100, showIf: v => v.type === 'p' },
        { id: 'z', label: 'Sigma multiple', value: 3 }
      ],
      compute(v) {
        const d = v.data;
        let cl, s, pts;
        if (v.type === 'p') {
          need(v.n > 0, 'Sample size must be positive.');
          need(d.every(x => x <= v.n), 'Defectives cannot exceed sample size.');
          cl = sum(d) / (d.length * v.n); s = Math.sqrt(cl * (1 - cl) / v.n); pts = d.map(x => x / v.n);
        } else { cl = mean(d); s = Math.sqrt(cl); pts = d; }
        const ucl = cl + v.z * s, lcl = Math.max(0, cl - v.z * s);
        const out = pts.map((x, i) => x > ucl || x < lcl ? i + 1 : 0).filter(Boolean);
        const f = v.type === 'p' ? 'pct' : 'd4';
        return {
          results: [r('Center line', cl, f, true), r('UCL', ucl, f, true), r('LCL', lcl, f, true), r('Out-of-control samples', out.length ? out.join(', ') : 'None', 'text')],
          charts: [{ type: 'line', title: v.type === 'p' ? 'p-chart' : 'c-chart', xLabel: 'Sample', yLabel: v.type === 'p' ? 'Proportion' : 'Defects', yPct: v.type === 'p',
            series: [{ name: 'Value', points: pts.map((x, i) => [i + 1, x]), markers: true }], hlines: [{ y: ucl, label: 'UCL' }, { y: cl, label: 'CL' }, { y: lcl, label: 'LCL' }] }]
        };
      },
      formula: ['p-chart: p̄ ± z√(p̄(1 − p̄)/n)', 'c-chart: c̄ ± z√c̄', 'Negative LCL is set to 0']
    },
    {
      id: 'learning', name: 'Learning curve', desc: 'Time for the Nth unit, cumulative time and average time under a learning rate.',
      keywords: 'learning curve experience curve wright cumulative average unit time',
      inputs: [
        { id: 't1', label: 'Time (or cost) for first unit', value: 100 },
        { id: 'rate', label: 'Learning rate', unit: '%', value: 80, help: 'Each doubling of output takes this % of the previous time.' },
        { id: 'n', label: 'Unit number N', value: 50 }
      ],
      compute(v) {
        const n = Math.round(v.n);
        need(n >= 1 && n <= 1e6, 'N must be between 1 and 1,000,000.');
        need(v.rate > 0 && v.rate <= 100, 'Learning rate must be between 0 and 100%.');
        const b = Math.log(pct(v.rate)) / Math.log(2), unit = k => v.t1 * Math.pow(k, b);
        let tot = 0; for (let k = 1; k <= n; k++) tot += unit(k);
        const step = Math.max(1, Math.floor(n / 80)), pts = [];
        for (let k = 1; k <= n; k += step) pts.push([k, unit(k)]);
        return {
          results: [r('Time for unit N', unit(n), 'd4', true), r('Cumulative time, units 1 to N', tot, 'd2', true), r('Average time per unit', tot / n, 'd4'), r('Learning exponent b', b, 'd4')],
          charts: [{ type: 'line', title: 'Unit time', xLabel: 'Unit number', yLabel: 'Time per unit', series: [{ name: 'Unit time', points: pts }] }]
        };
      },
      formula: ['Tₙ = T₁ × Nᵇ,  b = log(learning rate) / log 2']
    },
    {
      id: 'capacity', name: 'Capacity utilization', desc: 'Utilization and efficiency from design, effective and actual capacity.',
      keywords: 'design capacity effective capacity utilization efficiency',
      inputs: [
        { id: 'design', label: 'Design capacity', unit: 'units', value: 1000 },
        { id: 'eff', label: 'Effective capacity', unit: 'units', value: 850 },
        { id: 'actual', label: 'Actual output', unit: 'units', value: 720 }
      ],
      compute(v) {
        return { results: [r('Utilization', v.actual / v.design, 'pct', true), r('Efficiency', v.actual / v.eff, 'pct', true), r('Capacity cushion', 1 - v.actual / v.design, 'pct')] };
      },
      formula: ['Utilization = Actual / Design capacity', 'Efficiency = Actual / Effective capacity']
    },
    {
      id: 'forecast', name: 'Demand forecasting', desc: 'Moving average, weighted moving average, exponential smoothing, Holt\'s trend and linear trend, with error measures.',
      keywords: 'forecast moving average exponential smoothing holt trend projection mad mse mape time series',
      inputs: [
        { id: 'data', label: 'Historical demand, oldest first', type: 'list', value: '120, 132, 128, 141, 150, 147, 158, 165, 162, 175, 181, 178' },
        { id: 'method', label: 'Method', type: 'select', value: 'ses', options: [['ma', 'Moving average'], ['wma', 'Weighted moving average'], ['ses', 'Exponential smoothing'], ['holt', 'Holt\'s (trend-adjusted) smoothing'], ['trend', 'Linear trend projection']] },
        { id: 'k', label: 'Periods in average', value: 3, showIf: v => v.method === 'ma' },
        { id: 'w', label: 'Weights, oldest to newest', type: 'list', value: '1, 2, 3', showIf: v => v.method === 'wma' },
        { id: 'alpha', label: 'Smoothing constant α', value: 0.3, showIf: v => v.method === 'ses' || v.method === 'holt' },
        { id: 'beta', label: 'Trend constant β', value: 0.2, showIf: v => v.method === 'holt' }
      ],
      compute(v) {
        const y = v.data, n = y.length;
        need(n >= 3, 'Enter at least three data points.');
        const f = new Array(n + 1).fill(NaN);
        if (v.method === 'ma' || v.method === 'wma') {
          const w = v.method === 'ma' ? new Array(Math.round(v.k)).fill(1) : v.w;
          const k = w.length, ws = sum(w);
          need(k >= 1 && k < n, 'Number of periods must be between 1 and ' + (n - 1) + '.');
          for (let t = k; t <= n; t++) f[t] = sum(w.map((wi, j) => wi * y[t - k + j])) / ws;
        } else if (v.method === 'ses') {
          need(v.alpha > 0 && v.alpha <= 1, 'α must be between 0 and 1.');
          f[1] = y[0];
          for (let t = 1; t < n; t++) f[t + 1] = f[t] + v.alpha * (y[t] - f[t]);
        } else if (v.method === 'holt') {
          need(v.alpha > 0 && v.alpha <= 1 && v.beta > 0 && v.beta <= 1, 'α and β must be between 0 and 1.');
          let L = y[0], T = y[1] - y[0];
          for (let t = 1; t < n; t++) { f[t] = L + T; const Ln = v.alpha * y[t] + (1 - v.alpha) * (L + T); T = v.beta * (Ln - L) + (1 - v.beta) * T; L = Ln; }
          f[n] = L + T;
        } else {
          const xs = y.map((_, i) => i + 1), mx = mean(xs), my = mean(y);
          const b = sum(xs.map((x, i) => (x - mx) * (y[i] - my))) / sum(xs.map(x => (x - mx) ** 2)), a = my - b * mx;
          for (let t = 0; t <= n; t++) f[t] = a + b * (t + 1);
        }
        const err = [];
        for (let t = 0; t < n; t++) if (Number.isFinite(f[t])) err.push([y[t], f[t]]);
        const mad = mean(err.map(e => Math.abs(e[0] - e[1]))), mse = mean(err.map(e => (e[0] - e[1]) ** 2));
        const mape = mean(err.map(e => Math.abs((e[0] - e[1]) / e[0])));
        const bias = sum(err.map(e => e[0] - e[1]));
        return {
          results: [
            r('Forecast for next period', f[n], 'd2', true),
            r('MAD', mad, 'd4'), r('MSE', mse, 'd4'), r('MAPE', mape, 'pct'),
            r('Tracking signal', mad ? bias / mad : NaN, 'd2', false, 'Σ errors / MAD; |TS| > 4 suggests bias')
          ],
          tables: [{ head: ['Period', 'Actual', 'Forecast', 'Error'], fmts: ['int', 'd2', 'd2', 'd2'], rows: y.map((a, t) => [t + 1, a, f[t], Number.isFinite(f[t]) ? a - f[t] : NaN]).concat([[n + 1, NaN, f[n], NaN]]) }],
          charts: [{ type: 'line', title: 'Actual vs forecast', xLabel: 'Period', yLabel: 'Demand', yZero: false,
            series: [{ name: 'Actual', points: y.map((a, t) => [t + 1, a]), markers: true }, { name: 'Forecast', points: f.map((x, t) => [t + 1, x]), dashed: true, markers: true }] }]
        };
      },
      formula: ['Moving average: Fₜ₊₁ = average of last k actuals', 'Exponential smoothing: Fₜ₊₁ = Fₜ + α(Aₜ − Fₜ)', 'Holt: Lₜ = αAₜ + (1−α)(Lₜ₋₁+Tₜ₋₁);  Tₜ = β(Lₜ − Lₜ₋₁) + (1−β)Tₜ₋₁', 'MAD = mean |error|;  MAPE = mean |error / actual|']
    }
  ]);
})();
