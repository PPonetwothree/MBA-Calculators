(function () {
  'use strict';
  const M = window.MC;
  const { need, fmt, sum } = M;
  const r = (label, value, f, key, hint) => ({ label, value, fmt: f, key, hint });
  const sec = section => ({ section });

  function parseConstraints(text, n) {
    return String(text).split('\n').map(l => l.trim()).filter(l => l && !l.startsWith('#')).map((line, i) => {
      const m = line.replace(/≤/g, '<=').replace(/≥/g, '>=').match(/^(.*?)(<=|>=|=)(.*)$/);
      need(m, 'Constraint ' + (i + 1) + ': use <=, >= or = (e.g. "2, 3 <= 12").');
      const a = M.parseList(m[1]), b = M.parseNumber(m[3]);
      need(a.length === n, 'Constraint ' + (i + 1) + ' has ' + a.length + ' coefficients; the objective has ' + n + '.');
      need(Number.isFinite(b), 'Constraint ' + (i + 1) + ': right-hand side must be a number.');
      return { a, op: m[2], b };
    });
  }
  const statusMsg = s => ({ infeasible: 'The problem is infeasible: no point satisfies all constraints.', unbounded: 'The objective is unbounded.' }[s] || 'Solver stopped: ' + s + '.');

  // Feasible region polygon for two-variable problems (for the graphical method).
  function region2d(rows) {
    const lines = rows.map(r => [r.a[0], r.a[1], r.b]).concat([[1, 0, 0], [0, 1, 0]]);
    const pts = [];
    for (let i = 0; i < lines.length; i++) for (let j = i + 1; j < lines.length; j++) {
      const [a1, b1, c1] = lines[i], [a2, b2, c2] = lines[j], det = a1 * b2 - a2 * b1;
      if (Math.abs(det) > 1e-12) pts.push([(c1 * b2 - c2 * b1) / det, (a1 * c2 - a2 * c1) / det]);
    }
    const big = Math.max(10, ...pts.flatMap(p => p.map(Math.abs)).filter(Number.isFinite)) * 1.5;
    const all = rows.concat([{ a: [1, 0], op: '<=', b: big }, { a: [0, 1], op: '<=', b: big }]);
    const L2 = all.map(r => [r.a[0], r.a[1], r.b]).concat([[1, 0, 0], [0, 1, 0]]);
    const cand = [];
    for (let i = 0; i < L2.length; i++) for (let j = i + 1; j < L2.length; j++) {
      const [a1, b1, c1] = L2[i], [a2, b2, c2] = L2[j], det = a1 * b2 - a2 * b1;
      if (Math.abs(det) > 1e-12) cand.push([(c1 * b2 - c2 * b1) / det, (a1 * c2 - a2 * c1) / det]);
    }
    const ok = p => p[0] >= -1e-7 && p[1] >= -1e-7 && all.every(r => {
      const lhs = r.a[0] * p[0] + r.a[1] * p[1], tol = 1e-7 * Math.max(1, Math.abs(r.b));
      return r.op === '<=' ? lhs <= r.b + tol : r.op === '>=' ? lhs >= r.b - tol : Math.abs(lhs - r.b) <= tol;
    });
    const feas = [];
    cand.filter(ok).forEach(p => { if (!feas.some(q => Math.hypot(q[0] - p[0], q[1] - p[1]) < 1e-7)) feas.push(p); });
    if (feas.length < 1) return null;
    const cx = sum(feas.map(p => p[0])) / feas.length, cy = sum(feas.map(p => p[1])) / feas.length;
    feas.sort((p, q) => Math.atan2(p[1] - cy, p[0] - cx) - Math.atan2(q[1] - cy, q[0] - cx));
    return { poly: feas, big, corners: feas.filter(p => p[0] < big - 1e-6 && p[1] < big - 1e-6) };
  }

  M.register('optimization', [
    {
      id: 'lp', name: 'Linear programming solver', desc: 'Maximize or minimize a linear objective subject to linear constraints. Supports integer variables, shadow prices and a graph for two variables.',
      keywords: 'linear programming lp simplex optimization integer programming shadow price product mix graphical method',
      inputs: [
        { id: 'sense', label: 'Objective', type: 'select', value: 'max', options: [['max', 'Maximize'], ['min', 'Minimize']] },
        { id: 'c', label: 'Objective coefficients (x₁, x₂, …)', type: 'list', value: '3, 5' },
        { id: 'cons', label: 'Constraints, one per line', type: 'text', rows: 6, value: '1, 0 <= 4\n0, 2 <= 12\n3, 2 <= 18', help: 'Coefficients, then <=, >= or =, then the right-hand side. All variables are ≥ 0.' },
        { id: 'int', label: 'Variables', type: 'select', value: 'cont', options: [['cont', 'Continuous'], ['int', 'All integer']] }
      ],
      compute(v) {
        const n = v.c.length;
        need(n >= 1, 'Enter objective coefficients.');
        const rows = parseConstraints(v.cons, n);
        need(rows.length >= 1, 'Enter at least one constraint.');
        const prob = { sense: v.sense, c: v.c, rows };
        const res = v.int === 'int' ? M.solveILP(prob, v.c.map((_, j) => j)) : M.solveLP(prob);
        need(res.status === 'optimal', statusMsg(res.status));
        const results = [r('Optimal objective value', res.z, 'd4', true)];
        res.x.forEach((x, j) => results.push(r('x' + (j + 1), x, 'd4', true)));
        if (res.nodes) results.push(r('Branch-and-bound nodes', res.nodes, 'int'));
        const cons = rows.map((row, i) => {
          const lhs = sum(row.a.map((a, j) => a * res.x[j]));
          return [i + 1, lhs, row.op, row.b, Math.abs(row.b - lhs) < 1e-9 ? 0 : row.b - lhs, Math.abs(lhs - row.b) < 1e-7 ? 'Binding' : 'Not binding'].concat(res.duals ? [res.duals[i]] : []);
        });
        const out = {
          results,
          tables: [{ title: 'Constraints', head: ['#', 'LHS', '', 'RHS', 'Slack/surplus', 'Status'].concat(res.duals ? ['Shadow price'] : []), fmts: ['int', 'd4', 'text', 'd4', 'd4', 'text', 'd4'], rows: cons }],
          notes: [res.duals ? 'Shadow price: change in the optimal objective per one-unit increase in the right-hand side (within the allowable range).' : 'Shadow prices are not defined for integer programs.']
        };
        if (n === 2) {
          const reg = region2d(rows);
          if (reg) {
            const vals = reg.corners.map(p => [p[0], p[1], v.c[0] * p[0] + v.c[1] * p[1]]);
            out.tables.push({ title: 'Corner points of the feasible region', head: ['x₁', 'x₂', 'Objective'], fmts: ['d4', 'd4', 'd4'], rows: vals });
            out.charts = [{ type: 'line', title: 'Feasible region', xLabel: 'x₁', yLabel: 'x₂',
              series: [{ name: 'Feasible region', points: reg.poly.concat([reg.poly[0]]), area: true }, { name: 'Optimal solution', points: [[res.x[0], res.x[1]]], dots: true }] }];
          }
        }
        return out;
      },
      formula: ['max (or min) cᵀx  subject to  Ax (≤, ≥, =) b,  x ≥ 0', 'Solved with the two-phase simplex method; integer problems use branch and bound.']
    },
    {
      id: 'transport', name: 'Transportation problem', desc: 'Minimum-cost shipping plan from sources to destinations.',
      keywords: 'transportation problem shipping distribution supply demand vogel northwest corner least cost',
      inputs: [
        { id: 'cost', label: 'Unit shipping costs (rows = sources)', type: 'text', rows: 4, value: 'Plant 1, 4, 6, 9\nPlant 2, 5, 3, 8\nPlant 3, 7, 4, 5', help: 'Optional label first, then one cost per destination.' },
        { id: 'supply', label: 'Supply at each source', type: 'list', value: '120, 80, 100' },
        { id: 'demand', label: 'Demand at each destination', type: 'list', value: '100, 110, 90' }
      ],
      compute(v) {
        const { labels, m } = M.parseMatrix(v.cost), S = v.supply.slice(), D = v.demand.slice();
        need(S.length === m.length, 'Need one supply value per source row (' + m.length + ').');
        need(D.length === m[0].length, 'Need one demand value per destination column (' + m[0].length + ').');
        const tS = sum(S), tD = sum(D), ns = S.length, nd = D.length;
        const srcNames = labels.map((l, i) => l || 'Source ' + (i + 1)), dstNames = D.map((_, j) => 'Dest ' + (j + 1));
        const c = [], rows = [];
        m.forEach(row => row.forEach(x => c.push(x)));
        const dummy = tD > tS;
        if (dummy) { D.forEach(() => c.push(0)); srcNames.push('Unmet (dummy)'); }
        const nsrc = ns + (dummy ? 1 : 0);
        for (let i = 0; i < nsrc; i++) {
          const a = new Array(nsrc * nd).fill(0);
          for (let j = 0; j < nd; j++) a[i * nd + j] = 1;
          rows.push({ a, op: '<=', b: i < ns ? S[i] : tD - tS });
        }
        for (let j = 0; j < nd; j++) {
          const a = new Array(nsrc * nd).fill(0);
          for (let i = 0; i < nsrc; i++) a[i * nd + j] = 1;
          rows.push({ a, op: '=', b: D[j] });
        }
        const res = M.solveLP({ sense: 'min', c, rows });
        need(res.status === 'optimal', statusMsg(res.status));
        const x = res.x.map(val => Math.abs(val) < 1e-9 ? 0 : val);
        const table = srcNames.map((name, i) => [name].concat(D.map((_, j) => x[i * nd + j])).concat([sum(D.map((_, j) => x[i * nd + j])), i < ns ? S[i] : NaN]));
        return {
          results: [r('Minimum total cost', res.z, 'money', true), r('Total supply', tS, 'd2'), r('Total demand', tD, 'd2'),
            r('Balance', tS === tD ? 'Balanced' : tS > tD ? 'Excess supply of ' + fmt(tS - tD, 'd2') : 'Shortage of ' + fmt(tD - tS, 'd2') + ' (dummy source added)', 'text')],
          tables: [{ title: 'Shipments', head: ['From \\ To'].concat(dstNames).concat(['Shipped', 'Supply']), fmts: ['text'].concat(D.map(() => 'd2')).concat(['d2', 'd2']), rows: table }]
        };
      },
      formula: ['min Σᵢ Σⱼ cᵢⱼxᵢⱼ  s.t.  Σⱼ xᵢⱼ ≤ sᵢ,  Σᵢ xᵢⱼ = dⱼ,  xᵢⱼ ≥ 0']
    },
    {
      id: 'assignment', name: 'Assignment problem', desc: 'Optimal one-to-one assignment of people to jobs (Hungarian-method problems).',
      keywords: 'assignment problem hungarian method job allocation workers tasks',
      inputs: [
        { id: 'sense', label: 'Objective', type: 'select', value: 'min', options: [['min', 'Minimize cost/time'], ['max', 'Maximize profit/score']] },
        { id: 'cost', label: 'Matrix (rows = people, columns = jobs)', type: 'text', rows: 5, value: 'Ana, 9, 2, 7, 8\nBen, 6, 4, 3, 7\nCara, 5, 8, 1, 8\nDev, 7, 6, 9, 4' }
      ],
      compute(v) {
        const { labels, m } = M.parseMatrix(v.cost), n = m.length, k = m[0].length;
        const c = [].concat(...m), rows = [];
        for (let i = 0; i < n; i++) { const a = new Array(n * k).fill(0); for (let j = 0; j < k; j++) a[i * k + j] = 1; rows.push({ a, op: n <= k ? '=' : '<=', b: 1 }); }
        for (let j = 0; j < k; j++) { const a = new Array(n * k).fill(0); for (let i = 0; i < n; i++) a[i * k + j] = 1; rows.push({ a, op: k <= n ? '=' : '<=', b: 1 }); }
        const res = M.solveLP({ sense: v.sense, c, rows });
        need(res.status === 'optimal', statusMsg(res.status));
        const pairs = [];
        for (let i = 0; i < n; i++) for (let j = 0; j < k; j++) if (res.x[i * k + j] > 0.5) pairs.push([labels[i] || 'Row ' + (i + 1), 'Job ' + (j + 1), m[i][j]]);
        return {
          results: [r(v.sense === 'min' ? 'Minimum total' : 'Maximum total', res.z, 'd2', true), r('Assignments', pairs.length, 'int')],
          tables: [{ title: 'Assignment', head: ['Assign', 'To', 'Value'], fmts: ['text', 'text', 'd2'], rows: pairs }],
          notes: [n !== k ? 'Unbalanced matrix: ' + Math.abs(n - k) + (n > k ? ' person(s)' : ' job(s)') + ' left unassigned.' : null]
        };
      },
      formula: ['min Σ cᵢⱼxᵢⱼ  s.t. each row and column assigned once,  xᵢⱼ ∈ {0, 1}', 'The LP relaxation of the assignment problem always has an integer optimum.']
    },
    {
      id: 'cpm', name: 'Critical path (CPM / PERT)', desc: 'Earliest and latest times, slack, critical path and completion probability.',
      keywords: 'critical path method pert project scheduling network slack float activity duration',
      inputs: [
        { id: 'acts', label: 'Activities: name, duration (or a, m, b), predecessors', type: 'text', rows: 8, value: 'A, 2, 3, 4, -\nB, 1, 2, 3, A\nC, 4, 5, 12, A\nD, 1, 3, 5, B\nE, 2, 3, 4, C D\nF, 1, 2, 3, E', help: 'One number = fixed duration (CPM). Three numbers = optimistic, most likely, pessimistic (PERT). Separate predecessors with spaces.' },
        { id: 'target', label: 'Target completion time (PERT)', value: 16, optional: true }
      ],
      compute(v) {
        const acts = String(v.acts).split('\n').map(l => l.trim()).filter(Boolean).map((line, i) => {
          const p = line.split(',').map(s => s.trim()).filter(s => s !== '');
          need(p.length >= 2, 'Line ' + (i + 1) + ': expected "name, duration, predecessors".');
          const name = p[0], nums = [];
          let k = 1;
          while (k < p.length && Number.isFinite(Number(p[k]))) nums.push(Number(p[k++]));
          need(nums.length === 1 || nums.length === 3, 'Line ' + (i + 1) + ': give one duration or three estimates (a, m, b).');
          const pre = p.slice(k).join(' ').split(/\s+/).filter(x => x && x !== '-');
          const [a, mm, b] = nums.length === 3 ? nums : [nums[0], nums[0], nums[0]];
          need(a <= mm && mm <= b, 'Line ' + (i + 1) + ': need a ≤ m ≤ b.');
          return { name, t: (a + 4 * mm + b) / 6, var: ((b - a) / 6) ** 2, pert: nums.length === 3, pre };
        });
        const byName = new Map(acts.map(a => [a.name, a]));
        need(byName.size === acts.length, 'Activity names must be unique.');
        acts.forEach(a => a.pre.forEach(p => need(byName.has(p), 'Unknown predecessor "' + p + '" for ' + a.name + '.')));
        const order = [], seen = new Set();
        let guard = 0;
        while (order.length < acts.length) {
          need(guard++ < acts.length + 1, 'The network contains a cycle.');
          acts.forEach(a => { if (!seen.has(a.name) && a.pre.every(p => seen.has(p))) { order.push(a); seen.add(a.name); } });
        }
        order.forEach(a => { a.es = Math.max(0, ...a.pre.map(p => byName.get(p).ef)); a.ef = a.es + a.t; });
        const T = Math.max(...acts.map(a => a.ef));
        order.slice().reverse().forEach(a => {
          const succ = acts.filter(s => s.pre.includes(a.name));
          a.lf = succ.length ? Math.min(...succ.map(s => s.ls)) : T;
          a.ls = a.lf - a.t; a.slack = a.ls - a.es;
        });
        const crit = a => Math.abs(a.slack) < 1e-9;
        // Enumerate critical paths, pick the one with the largest variance.
        let bestPath = null, bestVar = -1;
        const walk = (a, path, vr) => {
          const nxt = acts.filter(s => crit(s) && s.pre.includes(a.name) && Math.abs(s.es - a.ef) < 1e-9);
          if (!nxt.length) { if (Math.abs(a.ef - T) < 1e-9 && vr > bestVar) { bestVar = vr; bestPath = path; } return; }
          nxt.forEach(s => walk(s, path.concat(s.name), vr + s.var));
        };
        acts.filter(a => crit(a) && a.es === 0).forEach(a => walk(a, [a.name], a.var));
        const isPert = acts.some(a => a.pert);
        const results = [r('Project duration', T, 'd2', true), r('Critical path', bestPath ? bestPath.join(' → ') : '–', 'text', true)];
        if (isPert) {
          const sdv = Math.sqrt(bestVar);
          results.push(r('Variance of critical path', bestVar, 'd4'), r('Std. deviation', sdv, 'd4'));
          if (Number.isFinite(v.target) && sdv > 0) {
            const z = (v.target - T) / sdv;
            results.push(r('P(finish by ' + fmt(v.target) + ')', M.normCdf(z), 'pct', true, 'z = ' + fmt(z, 'd2')));
          }
        }
        return {
          results,
          tables: [{ head: ['Activity', 'Duration', 'ES', 'EF', 'LS', 'LF', 'Slack', 'Critical'].concat(isPert ? ['Variance'] : []), fmts: ['text', 'd2', 'd2', 'd2', 'd2', 'd2', 'd2', 'text', 'd4'],
            rows: order.map(a => [a.name, a.t, a.es, a.ef, a.ls, a.lf, a.slack, crit(a) ? 'Yes' : ''].concat(isPert ? [a.var] : [])) }]
        };
      },
      formula: ['ES = max EF of predecessors; EF = ES + t', 'LF = min LS of successors; LS = LF − t; Slack = LS − ES', 'PERT: t = (a + 4m + b)/6, σ² = ((b − a)/6)²']
    },
    {
      id: 'decision', name: 'Decision analysis (payoff table)', desc: 'Maximax, maximin, Hurwicz, Laplace, minimax regret, expected value and EVPI.',
      keywords: 'decision making under uncertainty risk expected monetary value emv evpi regret hurwicz laplace maximin maximax payoff table',
      inputs: [
        { id: 'kind', label: 'Values are', type: 'select', value: 'profit', options: [['profit', 'Profits (higher is better)'], ['cost', 'Costs (lower is better)']] },
        { id: 'pay', label: 'Payoff table (rows = alternatives, columns = states)', type: 'text', rows: 4, value: 'Large plant, 200000, -180000\nSmall plant, 100000, -20000\nDo nothing, 0, 0' },
        { id: 'prob', label: 'State probabilities', type: 'list', value: '0.5, 0.5', optional: true, help: 'Leave blank if unknown; expected-value results are then skipped.' },
        { id: 'alpha', label: 'Hurwicz coefficient of optimism (α)', value: 0.7 }
      ],
      compute(v) {
        const { labels, m } = M.parseMatrix(v.pay), k = m[0].length;
        const names = labels.map((l, i) => l || 'Alternative ' + (i + 1));
        const s = v.kind === 'cost' ? -1 : 1, P = m.map(row => row.map(x => s * x));
        const hasP = v.prob && v.prob.length;
        if (hasP) { need(v.prob.length === k, 'Need one probability per state (' + k + ').'); need(Math.abs(sum(v.prob) - 1) < 1e-6, 'Probabilities must sum to 1.'); }
        need(v.alpha >= 0 && v.alpha <= 1, 'α must be between 0 and 1.');
        const colMax = P[0].map((_, j) => Math.max(...P.map(row => row[j])));
        const stats = P.map(row => {
          const mx = Math.max(...row), mn = Math.min(...row);
          return { mx, mn, hur: v.alpha * mx + (1 - v.alpha) * mn, lap: sum(row) / k, reg: Math.max(...row.map((x, j) => colMax[j] - x)), ev: hasP ? sum(row.map((x, j) => x * v.prob[j])) : NaN };
        });
        const pick = (key, dir) => { let b = 0; stats.forEach((st, i) => { if (dir * st[key] > dir * stats[b][key]) b = i; }); return b; };
        const show = x => s * x;
        const c = v.kind === 'cost';
        const res = [
          r(c ? 'Minimin (optimistic)' : 'Maximax (optimistic)', names[pick('mx', 1)], 'text'),
          r(c ? 'Minimax (pessimistic)' : 'Maximin (pessimistic)', names[pick('mn', 1)], 'text'),
          r('Hurwicz (α = ' + v.alpha + ')', names[pick('hur', 1)], 'text'),
          r('Laplace (equally likely)', names[pick('lap', 1)], 'text'),
          r('Minimax regret', names[pick('reg', -1)], 'text')
        ];
        if (hasP) {
          const b = pick('ev', 1), evpi = sum(colMax.map((x, j) => x * v.prob[j])) - stats[b].ev;
          res.unshift(r('Best by expected value', names[b], 'text', true), r(c ? 'Expected cost' : 'Expected monetary value', show(stats[b].ev), 'money', true));
          res.push(sec('Value of information'), r('Expected value with perfect information', show(sum(colMax.map((x, j) => x * v.prob[j]))), 'money'), r('EVPI', evpi, 'money', true, 'Most you should pay for perfect information'));
        }
        return {
          results: res,
          tables: [{ head: ['Alternative', hasP ? (c ? 'Expected cost' : 'EMV') : null, 'Best case', 'Worst case', 'Hurwicz', 'Laplace', 'Max regret'].filter(x => x !== null),
            fmts: ['text'].concat(hasP ? ['money'] : []).concat(['money', 'money', 'money', 'money', 'money']),
            rows: stats.map((st, i) => [names[i]].concat(hasP ? [show(st.ev)] : []).concat([show(st.mx), show(st.mn), show(st.hur), show(st.lap), st.reg])) }]
        };
      },
      formula: ['EMV = Σ pⱼ × payoffᵢⱼ', 'Hurwicz = α × best + (1 − α) × worst', 'Regret = best payoff in state − payoff', 'EVPI = Σ pⱼ × best payoff in state j − best EMV']
    },
    {
      id: 'makebuy', name: 'Make-or-buy / crossover', desc: 'Indifference volume between two options with different fixed and variable costs.',
      keywords: 'make or buy outsourcing crossover indifference point break even between alternatives location process selection',
      inputs: [
        { id: 'fa', label: 'Option A fixed cost (e.g. make)', unit: 'cur', value: 200000 },
        { id: 'va', label: 'Option A variable cost per unit', unit: 'cur', value: 8 },
        { id: 'fb', label: 'Option B fixed cost (e.g. buy)', unit: 'cur', value: 20000 },
        { id: 'vb', label: 'Option B variable cost per unit', unit: 'cur', value: 14 },
        { id: 'q', label: 'Expected volume', unit: 'units', value: 25000 }
      ],
      compute(v) {
        const ta = q => v.fa + v.va * q, tb = q => v.fb + v.vb * q;
        const x = v.va !== v.vb ? (v.fb - v.fa) / (v.va - v.vb) : NaN;
        const xmax = Math.max(v.q * 1.5, Number.isFinite(x) && x > 0 ? x * 2 : 0, 10);
        const xs = M.range(0, xmax, 2);
        const best = ta(v.q) < tb(v.q) ? 'Option A' : ta(v.q) > tb(v.q) ? 'Option B' : 'Either';
        return {
          results: [
            r('Indifference volume', Number.isFinite(x) && x >= 0 ? x : 'None (lines do not cross)', 'd2', true, 'units'),
            r('Cheaper at expected volume', best, 'text', true),
            r('Cost of A at expected volume', ta(v.q), 'money'), r('Cost of B at expected volume', tb(v.q), 'money'),
            r('Saving', Math.abs(ta(v.q) - tb(v.q)), 'money')
          ],
          charts: [{ type: 'line', title: 'Total cost by volume', xLabel: 'Volume', yLabel: 'Total cost',
            series: [{ name: 'Option A', points: xs.map(q => [q, ta(q)]) }, { name: 'Option B', points: xs.map(q => [q, tb(q)]), dashed: true }],
            vlines: [{ x: v.q, label: 'Expected' }].concat(Number.isFinite(x) && x > 0 ? [{ x, label: 'Crossover' }] : []) }]
        };
      },
      formula: ['Crossover Q = (F_B − F_A) / (v_A − v_B)']
    },
    {
      id: 'scoring', name: 'Weighted scoring model', desc: 'Rank options against weighted criteria (location, supplier or project selection).',
      keywords: 'factor rating weighted scoring multi criteria decision location selection vendor supplier',
      inputs: [
        { id: 'w', label: 'Criteria weights', type: 'list', value: '0.3, 0.25, 0.25, 0.2', help: 'Weights are normalized to sum to 1.' },
        { id: 'scores', label: 'Scores (rows = options, columns = criteria)', type: 'text', rows: 4, value: 'Site A, 7, 8, 6, 9\nSite B, 9, 6, 7, 6\nSite C, 6, 9, 8, 7' }
      ],
      compute(v) {
        const { labels, m } = M.parseMatrix(v.scores);
        need(v.w.length === m[0].length, 'Need one weight per criterion (' + m[0].length + ').');
        const ws = sum(v.w); need(ws > 0, 'Weights must sum to more than 0.');
        const rows = m.map((row, i) => [labels[i] || 'Option ' + (i + 1), sum(row.map((x, j) => x * v.w[j] / ws))]).sort((a, b) => b[1] - a[1]);
        return {
          results: [r('Highest score', rows[0][0], 'text', true), r('Score', rows[0][1], 'd4', true)],
          tables: [{ head: ['Rank', 'Option', 'Weighted score'], fmts: ['int', 'text', 'd4'], rows: rows.map((x, i) => [i + 1, x[0], x[1]]) }],
          charts: [{ type: 'bar', title: 'Weighted score', labels: rows.map(x => x[0]), series: [{ name: 'Score', values: rows.map(x => x[1]) }] }]
        };
      },
      formula: ['Score = Σ wⱼ × scoreⱼ / Σ wⱼ']
    }
  ]);
})();
