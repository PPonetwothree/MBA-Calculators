/* Shared helpers: parsing, formatting, numerics, statistics and SVG charts. */
(function () {
  'use strict';

  // ---------- Registry ----------
  const CATEGORIES = [
    { id: 'finance', name: 'Finance' },
    { id: 'accounting', name: 'Accounting & Ratios' },
    { id: 'operations', name: 'Operations' },
    { id: 'optimization', name: 'Optimization & Decisions' },
    { id: 'economics', name: 'Economics' },
    { id: 'marketing', name: 'Marketing' },
    { id: 'statistics', name: 'Statistics' }
  ];
  const CALCS = [];
  function register(cat, list) {
    list.forEach(c => { c.cat = cat; CALCS.push(c); });
  }

  // ---------- Errors ----------
  class InputError extends Error {}
  function fail(msg) { throw new InputError(msg); }
  function need(cond, msg) { if (!cond) fail(msg); }

  // ---------- Parsing ----------
  function parseNumber(s) {
    if (typeof s === 'number') return s;
    const t = String(s).trim().replace(/[\s_]/g, '');
    if (t === '') return NaN;
    return Number(t);
  }
  // List of numbers separated by commas, spaces, semicolons or new lines.
  function parseList(s) {
    const parts = String(s).split(/[\s,;]+/).filter(Boolean);
    return parts.map(p => {
      const n = Number(p);
      if (!Number.isFinite(n)) fail('"' + p + '" is not a number. Separate values with commas or spaces (no thousands separators).');
      return n;
    });
  }
  // Rows of "label, n1, n2 ..." (label optional). Tokens split by comma/tab, or whitespace if neither present.
  function parseRows(s) {
    return String(s).split('\n').map(l => l.trim()).filter(l => l && !l.startsWith('#')).map(line => {
      const toks = (/[,\t]/.test(line) ? line.split(/[,\t]/) : line.split(/\s+/)).map(t => t.trim()).filter(t => t !== '');
      let label = null;
      if (toks.length && !Number.isFinite(Number(toks[0]))) label = toks.shift();
      return { label, toks };
    });
  }
  function rowNums(row, lineNo) {
    return row.toks.map(t => {
      const n = Number(t);
      if (!Number.isFinite(n)) fail('Line ' + lineNo + ': "' + t + '" is not a number.');
      return n;
    });
  }
  function parseMatrix(s) {
    const rows = parseRows(s);
    const labels = rows.map((r, i) => r.label || null);
    const m = rows.map((r, i) => rowNums(r, i + 1));
    need(m.length > 0, 'Enter at least one row.');
    const w = m[0].length;
    m.forEach((r, i) => need(r.length === w, 'Row ' + (i + 1) + ' has ' + r.length + ' values; expected ' + w + '.'));
    return { labels, m };
  }

  // ---------- Formatting ----------
  let currency = '$';
  try { const c = localStorage.getItem('currency'); if (c !== null) currency = c; } catch (e) { /* ignore */ }
  function setCurrency(c) { currency = c; try { localStorage.setItem('currency', c); } catch (e) { /* ignore */ } }
  function getCurrency() { return currency; }

  const nfCache = {};
  function nf(min, max) {
    const k = min + ':' + max;
    return nfCache[k] || (nfCache[k] = new Intl.NumberFormat('en-US', { minimumFractionDigits: min, maximumFractionDigits: max }));
  }
  const noNegZero = s => /^-[0.,]+$/.test(s) ? s.slice(1) : s;
  function fmtNum(v, dp) {
    if (v === null || v === undefined || Number.isNaN(v)) return '–';
    if (v === Infinity) return '∞';
    if (v === -Infinity) return '−∞';
    if (dp === undefined) {
      const a = Math.abs(v);
      dp = a >= 1000 ? 2 : a >= 1 ? 4 : a === 0 ? 0 : 6;
      return noNegZero(nf(0, dp).format(v)).replace('-', '−');
    }
    return noNegZero(nf(dp, dp).format(v)).replace('-', '−');
  }
  function fmt(v, kind) {
    if (typeof v === 'string') return v;
    switch (kind) {
      case 'money': {
        if (!Number.isFinite(v)) return fmtNum(v);
        const s = nf(2, 2).format(Math.abs(v));
        return (v < 0 && s !== '0.00' ? '−' : '') + currency + s;
      }
      case 'pct': return Number.isFinite(v) ? fmtNum(v * 100, 2) + '%' : fmtNum(v);
      case 'int': return fmtNum(Math.round(v), 0);
      case 'x': return fmtNum(v, 2) + '×';
      case 'd2': return fmtNum(v, 2);
      case 'd4': return fmtNum(v, 4);
      default: return fmtNum(v);
    }
  }

  // ---------- Numerics ----------
  const sum = a => a.reduce((s, x) => s + x, 0);
  const mean = a => sum(a) / a.length;
  function variance(a, sample = true) {
    const m = mean(a);
    return sum(a.map(x => (x - m) ** 2)) / (a.length - (sample ? 1 : 0));
  }
  const sd = (a, sample = true) => Math.sqrt(variance(a, sample));
  function quantile(sorted, q) {
    const pos = (sorted.length - 1) * q, lo = Math.floor(pos), hi = Math.ceil(pos);
    return sorted[lo] + (sorted[hi] - sorted[lo]) * (pos - lo);
  }
  function bisect(f, lo, hi, tol = 1e-12, iter = 300) {
    let flo = f(lo), fhi = f(hi);
    if (Number.isNaN(flo) || Number.isNaN(fhi) || flo * fhi > 0) return NaN;
    for (let i = 0; i < iter; i++) {
      const mid = (lo + hi) / 2, fm = f(mid);
      if (fm === 0 || (hi - lo) / 2 < tol) return mid;
      if (fm * flo < 0) { hi = mid; fhi = fm; } else { lo = mid; flo = fm; }
    }
    return (lo + hi) / 2;
  }
  // Find a root by scanning for a sign change, then bisecting.
  function findRoot(f, lo, hi, steps = 2000) {
    let a = lo, fa = f(a);
    for (let i = 1; i <= steps; i++) {
      const b = lo + (hi - lo) * i / steps, fb = f(b);
      if (fa === 0) return a;
      if (Number.isFinite(fa) && Number.isFinite(fb) && fa * fb < 0) return bisect(f, a, b);
      a = b; fa = fb;
    }
    return NaN;
  }
  const npv = (r, cfs) => cfs.reduce((s, cf, t) => s + cf / Math.pow(1 + r, t), 0);
  function irr(cfs) {
    const f = r => npv(r, cfs);
    // Scan from close to -100% upwards; prefer the root nearest 10%.
    let best = NaN;
    const grid = [];
    for (let r = -0.99; r <= 10; r += 0.005) grid.push(r);
    for (let i = 1; i < grid.length; i++) {
      const a = grid[i - 1], b = grid[i], fa = f(a), fb = f(b);
      if (fa === 0) return a;
      if (fa * fb < 0) {
        const root = bisect(f, a, b);
        if (Number.isNaN(best) || Math.abs(root - 0.1) < Math.abs(best - 0.1)) best = root;
      }
    }
    return best;
  }
  function annuityPmt(rate, n, pv) {
    if (rate === 0) return pv / n;
    return pv * rate / (1 - Math.pow(1 + rate, -n));
  }

  // ---------- Statistics ----------
  function erfc(x) {
    const z = Math.abs(x), t = 1 / (1 + 0.5 * z);
    const r = t * Math.exp(-z * z - 1.26551223 + t * (1.00002368 + t * (0.37409196 + t * (0.09678418 + t * (-0.18628806 +
      t * (0.27886807 + t * (-1.13520398 + t * (1.48851587 + t * (-0.82215223 + t * 0.17087277)))))))));
    return x >= 0 ? r : 2 - r;
  }
  const normCdf = x => 0.5 * erfc(-x / Math.SQRT2);
  const normPdf = x => Math.exp(-0.5 * x * x) / Math.sqrt(2 * Math.PI);
  function normInv(p) {
    if (p <= 0) return -Infinity;
    if (p >= 1) return Infinity;
    const a = [-3.969683028665376e+01, 2.209460984245205e+02, -2.759285104469687e+02, 1.383577518672690e+02, -3.066479806614716e+01, 2.506628277459239e+00];
    const b = [-5.447609879822406e+01, 1.615858368580409e+02, -1.556989798598866e+02, 6.680131188771972e+01, -1.328068155288572e+01];
    const c = [-7.784894002430293e-03, -3.223964580411365e-01, -2.400758277161838e+00, -2.549732539343734e+00, 4.374664141464968e+00, 2.938163982698783e+00];
    const d = [7.784695709041462e-03, 3.224671290700398e-01, 2.445134137142996e+00, 3.754408661907416e+00];
    const pl = 0.02425;
    let q, r, x;
    if (p < pl) {
      q = Math.sqrt(-2 * Math.log(p));
      x = (((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) / ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1);
    } else if (p <= 1 - pl) {
      q = p - 0.5; r = q * q;
      x = (((((a[0] * r + a[1]) * r + a[2]) * r + a[3]) * r + a[4]) * r + a[5]) * q / (((((b[0] * r + b[1]) * r + b[2]) * r + b[3]) * r + b[4]) * r + 1);
    } else {
      q = Math.sqrt(-2 * Math.log(1 - p));
      x = -(((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) / ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1);
    }
    // One Halley refinement step.
    const e = normCdf(x) - p, u = e * Math.sqrt(2 * Math.PI) * Math.exp(x * x / 2);
    return x - u / (1 + x * u / 2);
  }
  function lgamma(x) {
    const c = [0.99999999999980993, 676.5203681218851, -1259.1392167224028, 771.32342877765313, -176.61502916214059,
      12.507343278686905, -0.13857109526572012, 9.9843695780195716e-6, 1.5056327351493116e-7];
    if (x < 0.5) return Math.log(Math.PI / Math.abs(Math.sin(Math.PI * x))) - lgamma(1 - x);
    x -= 1;
    let a = c[0];
    const t = x + 7.5;
    for (let i = 1; i < 9; i++) a += c[i] / (x + i);
    return 0.5 * Math.log(2 * Math.PI) + (x + 0.5) * Math.log(t) - t + Math.log(a);
  }
  function betacf(a, b, x) {
    const MAXIT = 300, EPS = 3e-14, FPMIN = 1e-300;
    let qab = a + b, qap = a + 1, qam = a - 1, c = 1, d = 1 - qab * x / qap;
    if (Math.abs(d) < FPMIN) d = FPMIN;
    d = 1 / d;
    let h = d;
    for (let m = 1; m <= MAXIT; m++) {
      const m2 = 2 * m;
      let aa = m * (b - m) * x / ((qam + m2) * (a + m2));
      d = 1 + aa * d; if (Math.abs(d) < FPMIN) d = FPMIN;
      c = 1 + aa / c; if (Math.abs(c) < FPMIN) c = FPMIN;
      d = 1 / d; h *= d * c;
      aa = -(a + m) * (qab + m) * x / ((a + m2) * (qap + m2));
      d = 1 + aa * d; if (Math.abs(d) < FPMIN) d = FPMIN;
      c = 1 + aa / c; if (Math.abs(c) < FPMIN) c = FPMIN;
      d = 1 / d;
      const del = d * c;
      h *= del;
      if (Math.abs(del - 1) < EPS) break;
    }
    return h;
  }
  function ibeta(a, b, x) {
    if (x <= 0) return 0;
    if (x >= 1) return 1;
    const bt = Math.exp(lgamma(a + b) - lgamma(a) - lgamma(b) + a * Math.log(x) + b * Math.log(1 - x));
    return x < (a + 1) / (a + b + 2) ? bt * betacf(a, b, x) / a : 1 - bt * betacf(b, a, 1 - x) / b;
  }
  function tCdf(t, df) {
    const p = 0.5 * ibeta(df / 2, 0.5, df / (df + t * t));
    return t > 0 ? 1 - p : p;
  }
  function tInv(p, df) { return bisect(t => tCdf(t, df) - p, -1e4, 1e4, 1e-12); }
  function gammaP(a, x) {
    if (x <= 0) return 0;
    const gln = lgamma(a);
    if (x < a + 1) {
      let ap = a, s = 1 / a, del = s;
      for (let n = 0; n < 500; n++) { ap++; del *= x / ap; s += del; if (Math.abs(del) < Math.abs(s) * 1e-15) break; }
      return s * Math.exp(-x + a * Math.log(x) - gln);
    }
    let b = x + 1 - a, c = 1e300, d = 1 / b, h = d;
    for (let i = 1; i < 500; i++) {
      const an = -i * (i - a); b += 2;
      d = an * d + b; if (Math.abs(d) < 1e-300) d = 1e-300;
      c = b + an / c; if (Math.abs(c) < 1e-300) c = 1e-300;
      d = 1 / d; const del = d * c; h *= del;
      if (Math.abs(del - 1) < 1e-15) break;
    }
    return 1 - Math.exp(-x + a * Math.log(x) - gln) * h;
  }
  const chiCdf = (x, k) => gammaP(k / 2, x / 2);
  function lnChoose(n, k) { return lgamma(n + 1) - lgamma(k + 1) - lgamma(n - k + 1); }

  // ---------- Linear programming (two-phase simplex, Bland's rule) ----------
  // problem: { sense: 'max'|'min', c: [..], rows: [{ a: [..], op: '<='|'>='|'=', b }] }, all variables >= 0.
  function solveLP(problem) {
    const EPS = 1e-9;
    const n = problem.c.length;
    const rows = problem.rows.map(r => r.b < 0
      ? { a: r.a.map(v => -v), op: r.op === '<=' ? '>=' : r.op === '>=' ? '<=' : '=', b: -r.b, flipped: true }
      : Object.assign({ flipped: false }, r));
    const m = rows.length;
    let nSlack = 0, nArt = 0;
    rows.forEach(r => { if (r.op !== '=') nSlack++; if (r.op !== '<=') nArt++; });
    const N = n + nSlack + nArt;
    const T = [], basis = [], rowSlack = [], rowArt = [];
    let s = n, art = n + nSlack;
    rows.forEach((r, i) => {
      const row = new Array(N + 1).fill(0);
      for (let j = 0; j < n; j++) row[j] = r.a[j] || 0;
      row[N] = r.b;
      rowSlack[i] = rowArt[i] = -1;
      if (r.op === '<=') { row[s] = 1; rowSlack[i] = s; basis[i] = s; s++; }
      else if (r.op === '>=') { row[s] = -1; rowSlack[i] = s; s++; row[art] = 1; rowArt[i] = art; basis[i] = art; art++; }
      else { row[art] = 1; rowArt[i] = art; basis[i] = art; art++; }
      T.push(row);
    });
    const isArt = j => j >= n + nSlack;
    function pivot(pr, pc) {
      const pv = T[pr][pc];
      for (let j = 0; j <= N; j++) T[pr][j] /= pv;
      for (let i = 0; i < m; i++) {
        if (i === pr) continue;
        const f = T[i][pc];
        if (f !== 0) for (let j = 0; j <= N; j++) T[i][j] -= f * T[pr][j];
      }
      basis[pr] = pc;
    }
    function reduced(cost) {
      const rc = new Array(N).fill(0);
      for (let j = 0; j < N; j++) {
        let z = 0;
        for (let i = 0; i < m; i++) z += cost[basis[i]] * T[i][j];
        rc[j] = cost[j] - z;
      }
      return rc;
    }
    function run(cost, allowArt) {
      for (let it = 0; it < 5000; it++) {
        const rc = reduced(cost);
        let pc = -1;
        for (let j = 0; j < N; j++) if (rc[j] > EPS && (allowArt || !isArt(j))) { pc = j; break; }
        if (pc < 0) return 'optimal';
        let pr = -1, best = Infinity;
        for (let i = 0; i < m; i++) {
          if (T[i][pc] > EPS) {
            const ratio = T[i][N] / T[i][pc];
            if (ratio < best - EPS || (Math.abs(ratio - best) <= EPS && basis[i] < basis[pr])) { best = ratio; pr = i; }
          }
        }
        if (pr < 0) return 'unbounded';
        pivot(pr, pc);
      }
      return 'iteration limit';
    }
    if (nArt > 0) {
      const c1 = new Array(N).fill(0);
      for (let j = n + nSlack; j < N; j++) c1[j] = -1;
      run(c1, true);
      let infeas = 0;
      for (let i = 0; i < m; i++) if (isArt(basis[i])) infeas += T[i][N];
      if (infeas > 1e-7) return { status: 'infeasible' };
      for (let i = 0; i < m; i++) {
        if (isArt(basis[i])) {
          for (let j = 0; j < n + nSlack; j++) if (Math.abs(T[i][j]) > EPS) { pivot(i, j); break; }
        }
      }
    }
    const sign = problem.sense === 'min' ? -1 : 1;
    const c2 = new Array(N).fill(0);
    for (let j = 0; j < n; j++) c2[j] = sign * problem.c[j];
    const st = run(c2, false);
    if (st !== 'optimal') return { status: st };
    const x = new Array(n).fill(0);
    for (let i = 0; i < m; i++) if (basis[i] < n) x[basis[i]] = T[i][N];
    const z = sum(x.map((v, j) => v * problem.c[j]));
    const rc = reduced(c2);
    const duals = rows.map((r, i) => {
      let y;
      if (r.op === '<=') y = -rc[rowSlack[i]];
      else if (r.op === '>=') y = rc[rowSlack[i]];
      else { let zj = 0; for (let k = 0; k < m; k++) zj += c2[basis[k]] * T[k][rowArt[i]]; y = zj; }
      if (r.flipped) y = -y;
      return sign * y;
    });
    return { status: 'optimal', x, z, duals };
  }
  // Branch and bound for integer variables (indices in intVars).
  function solveILP(problem, intVars, maxNodes = 3000) {
    let best = null, nodes = 0;
    const better = (a, b) => problem.sense === 'min' ? a < b - 1e-9 : a > b + 1e-9;
    const stack = [problem.rows];
    while (stack.length && nodes < maxNodes) {
      const rows = stack.pop(); nodes++;
      const res = solveLP({ sense: problem.sense, c: problem.c, rows });
      if (res.status === 'unbounded') return { status: 'unbounded' };
      if (res.status !== 'optimal') continue;
      if (best && !better(res.z, best.z)) continue;
      const k = intVars.find(j => Math.abs(res.x[j] - Math.round(res.x[j])) > 1e-6);
      if (k === undefined) { best = Object.assign({}, res, { x: res.x.map((v, j) => intVars.includes(j) ? Math.round(v) : v) }); continue; }
      const e = problem.c.map((_, j) => (j === k ? 1 : 0));
      stack.push(rows.concat([{ a: e, op: '>=', b: Math.ceil(res.x[k]) }]));
      stack.push(rows.concat([{ a: e, op: '<=', b: Math.floor(res.x[k]) }]));
    }
    if (!best) return { status: nodes >= maxNodes ? 'node limit reached' : 'infeasible' };
    best.nodes = nodes;
    best.duals = null;
    return best;
  }

  // ---------- SVG charts ----------
  const esc = s => String(s).replace(/[&<>"]/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[ch]));
  function niceTicks(min, max, count = 5) {
    if (min === max) { min -= 1; max += 1; }
    const span = max - min, step0 = span / count, mag = Math.pow(10, Math.floor(Math.log10(step0)));
    const step = [1, 2, 2.5, 5, 10].map(f => f * mag).find(s => s >= step0) || 10 * mag;
    const lo = Math.floor(min / step) * step, hi = Math.ceil(max / step) * step, ticks = [];
    for (let v = lo; v <= hi + step / 2; v += step) ticks.push(Math.abs(v) < step / 1e6 ? 0 : v);
    return ticks;
  }
  function shortNum(v) {
    const a = Math.abs(v);
    if (a >= 1e9) return fmtNum(v / 1e9, 1) + 'B';
    if (a >= 1e6) return fmtNum(v / 1e6, 1) + 'M';
    if (a >= 1e4) return fmtNum(v / 1e3, 0) + 'k';
    if (a >= 100) return fmtNum(v, 0);
    return fmtNum(+v.toPrecision(3));
  }
  // spec: { type: 'line'|'bar', title, xLabel, yLabel, series: [{name, points: [[x,y]], dashed}] | bar: {labels, series:[{name, values}]}, vlines:[{x,label}], hlines:[{y,label}], yPct }
  function chart(spec) {
    const W = 640, H = 300, L = 56, R = 16, T = 16, B = 44;
    const pw = W - L - R, ph = H - T - B;
    const yf = v => spec.yPct ? fmtNum(v * 100, 0) + '%' : shortNum(v);
    let out = '';
    let xs, ys, xmin, xmax, ymin, ymax;
    if (spec.type === 'bar') {
      const vals = spec.series.flatMap(s => s.values).filter(Number.isFinite);
      ymin = Math.min(0, ...vals); ymax = Math.max(0, ...vals);
    } else {
      const pts = spec.series.flatMap(s => s.points).filter(p => Number.isFinite(p[0]) && Number.isFinite(p[1]));
      xmin = Math.min(...pts.map(p => p[0])); xmax = Math.max(...pts.map(p => p[0]));
      ymin = Math.min(...pts.map(p => p[1])); ymax = Math.max(...pts.map(p => p[1]));
      (spec.hlines || []).forEach(h => { ymin = Math.min(ymin, h.y); ymax = Math.max(ymax, h.y); });
      if (spec.yZero !== false && ymin > 0 && ymin < ymax * 0.6) ymin = 0;
      if (xmin === xmax) { xmin -= 1; xmax += 1; }
    }
    const yt = niceTicks(ymin, ymax);
    ymin = yt[0]; ymax = yt[yt.length - 1];
    const Y = v => T + ph - (v - ymin) / (ymax - ymin) * ph;
    yt.forEach(v => {
      out += `<line class="grid" x1="${L}" x2="${W - R}" y1="${Y(v)}" y2="${Y(v)}"/>`;
      out += `<text class="tick" x="${L - 6}" y="${Y(v) + 4}" text-anchor="end">${esc(yf(v))}</text>`;
    });
    if (ymin < 0 && ymax > 0) out += `<line class="axis" x1="${L}" x2="${W - R}" y1="${Y(0)}" y2="${Y(0)}"/>`;
    if (spec.type === 'bar') {
      const labels = spec.labels, ns = spec.series.length, gw = pw / labels.length, bw = Math.min(40, gw * 0.8 / ns);
      const every = Math.ceil(labels.length / 14);
      labels.forEach((lab, i) => {
        spec.series.forEach((s, k) => {
          const v = s.values[i];
          if (!Number.isFinite(v)) return;
          const x = L + gw * i + (gw - bw * ns) / 2 + bw * k, y1 = Y(v);
          const base = Y(Math.min(Math.max(0, ymin), ymax));
          out += `<rect class="s${k}" x="${x}" y="${Math.min(base, y1)}" width="${bw - 1}" height="${Math.max(0.5, Math.abs(base - y1))}"><title>${esc(lab)}: ${esc(fmtNum(v))}</title></rect>`;
        });
        if (i % every === 0) out += `<text class="tick" x="${L + gw * i + gw / 2}" y="${T + ph + 16}" text-anchor="middle">${esc(lab)}</text>`;
      });
    } else {
      const xt = niceTicks(xmin, xmax, 6).filter(v => v >= xmin - 1e-9 && v <= xmax + 1e-9);
      const X = v => L + (v - xmin) / (xmax - xmin) * pw;
      const xf = spec.xPct ? (v => fmtNum(v * 100, 0) + '%') : shortNum;
      xt.forEach(v => { out += `<text class="tick" x="${X(v)}" y="${T + ph + 16}" text-anchor="middle">${esc(xf(v))}</text>`; });
      (spec.hlines || []).forEach(h => {
        out += `<line class="ref" x1="${L}" x2="${W - R}" y1="${Y(h.y)}" y2="${Y(h.y)}"/>`;
        if (h.label) out += `<text class="reflabel" x="${W - R - 4}" y="${Y(h.y) - 4}" text-anchor="end">${esc(h.label)}</text>`;
      });
      (spec.vlines || []).forEach(v => {
        if (!Number.isFinite(v.x) || v.x < xmin || v.x > xmax) return;
        out += `<line class="ref" x1="${X(v.x)}" x2="${X(v.x)}" y1="${T}" y2="${T + ph}"/>`;
        if (v.label) out += `<text class="reflabel" x="${X(v.x) + 4}" y="${T + 12}">${esc(v.label)}</text>`;
      });
      spec.series.forEach((s, k) => {
        const pts = s.points.filter(p => Number.isFinite(p[0]) && Number.isFinite(p[1]));
        if (s.area) {
          const d = pts.map((p, i) => (i ? 'L' : 'M') + X(p[0]).toFixed(1) + ' ' + Y(p[1]).toFixed(1)).join(' ') + ' Z';
          out += `<path class="area s${k}" d="${d}"/>`;
        } else if (s.dots) {
          pts.forEach(p => { out += `<rect class="dot s${k}" x="${X(p[0]) - 4}" y="${Y(p[1]) - 4}" width="8" height="8"/>`; });
        } else {
          const d = pts.map((p, i) => (i ? 'L' : 'M') + X(p[0]).toFixed(1) + ' ' + Y(Math.max(ymin, Math.min(ymax, p[1]))).toFixed(1)).join(' ');
          out += `<path class="line s${k}${s.dashed ? ' dashed' : ''}" d="${d}"/>`;
          if (s.markers) pts.forEach(p => { out += `<rect class="dot s${k}" x="${X(p[0]) - 3}" y="${Y(p[1]) - 3}" width="6" height="6"/>`; });
        }
      });
    }
    out += `<line class="axis" x1="${L}" x2="${L}" y1="${T}" y2="${T + ph}"/>`;
    out += `<line class="axis" x1="${L}" x2="${W - R}" y1="${T + ph}" y2="${T + ph}"/>`;
    if (spec.xLabel) out += `<text class="axlabel" x="${L + pw / 2}" y="${H - 6}" text-anchor="middle">${esc(spec.xLabel)}</text>`;
    if (spec.yLabel) out += `<text class="axlabel" x="12" y="${T + ph / 2}" text-anchor="middle" transform="rotate(-90 12 ${T + ph / 2})">${esc(spec.yLabel)}</text>`;
    const legend = spec.series.length > 1
      ? '<div class="legend">' + spec.series.map((s, k) => `<span><i class="s${k}${s.dashed ? ' dashed' : ''}"></i>${esc(s.name)}</span>`).join('') + '</div>'
      : '';
    return `<figure class="chart">${spec.title ? `<figcaption>${esc(spec.title)}</figcaption>` : ''}${legend}<svg viewBox="0 0 ${W} ${H}" shape-rendering="crispEdges" role="img" aria-label="${esc(spec.title || 'Chart')}">${out}</svg></figure>`;
  }
  const range = (a, b, n) => Array.from({ length: n + 1 }, (_, i) => a + (b - a) * i / n);

  window.MC = {
    CATEGORIES, CALCS, register, InputError, fail, need,
    parseNumber, parseList, parseRows, rowNums, parseMatrix,
    fmt, fmtNum, setCurrency, getCurrency, esc,
    sum, mean, variance, sd, quantile, bisect, findRoot, npv, irr, annuityPmt, range,
    normCdf, normPdf, normInv, tCdf, tInv, chiCdf, lgamma, lnChoose, gammaP,
    solveLP, solveILP, chart
  };
})();
