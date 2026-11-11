(function () {
  'use strict';
  const M = window.MC;
  const { need, fmt, sum, mean, sd } = M;
  const r = (label, value, f, key, hint) => ({ label, value, fmt: f, key, hint });
  const sec = section => ({ section });
  const pct = v => v / 100;
  const confOpts = [['90', '90%'], ['95', '95%'], ['99', '99%']];
  const tailOpts = [['two', 'Two-tailed (≠)'], ['greater', 'Right-tailed (>)'], ['less', 'Left-tailed (<)']];
  const pFromZ = (z, tail) => tail === 'two' ? 2 * (1 - M.normCdf(Math.abs(z))) : tail === 'greater' ? 1 - M.normCdf(z) : M.normCdf(z);
  const pFromT = (t, df, tail) => tail === 'two' ? 2 * (1 - M.tCdf(Math.abs(t), df)) : tail === 'greater' ? 1 - M.tCdf(t, df) : M.tCdf(t, df);

  M.register('statistics', [
    {
      id: 'descriptive', name: 'Descriptive statistics', desc: 'Mean, median, standard deviation, quartiles, skewness and a histogram.',
      keywords: 'mean median mode standard deviation variance quartile iqr range skewness kurtosis summary statistics',
      inputs: [{ id: 'x', label: 'Data', type: 'list', value: '12, 15, 11, 18, 21, 14, 16, 13, 19, 25, 15, 17' }],
      compute(v) {
        const x = v.x, n = x.length;
        need(n >= 2, 'Enter at least two values.');
        const s = x.slice().sort((a, b) => a - b), m = mean(x), sdev = sd(x);
        const counts = new Map(); x.forEach(val => counts.set(val, (counts.get(val) || 0) + 1));
        const maxc = Math.max(...counts.values());
        const modes = maxc > 1 ? [...counts].filter(e => e[1] === maxc).map(e => e[0]).join(', ') : 'None';
        const skew = n > 2 ? n / ((n - 1) * (n - 2)) * sum(x.map(xi => ((xi - m) / sdev) ** 3)) : NaN;
        const q1 = M.quantile(s, 0.25), q3 = M.quantile(s, 0.75);
        const k = Math.max(3, Math.ceil(Math.log2(n) + 1)), lo = s[0], w = (s[n - 1] - lo) / k || 1;
        const bins = new Array(k).fill(0); x.forEach(val => bins[Math.min(k - 1, Math.floor((val - lo) / w))]++);
        return {
          results: [
            r('Count', n, 'int'), r('Mean', m, 'd4', true), r('Median', M.quantile(s, 0.5), 'd4', true), r('Mode', modes, 'text'),
            r('Std. deviation (sample)', sdev, 'd4', true), r('Std. deviation (population)', sd(x, false), 'd4'), r('Variance (sample)', sdev * sdev, 'd4'),
            r('Standard error of mean', sdev / Math.sqrt(n), 'd4'), r('Coefficient of variation', sdev / m, 'pct'),
            r('Minimum', s[0], 'd4'), r('Q1', q1, 'd4'), r('Q3', q3, 'd4'), r('Maximum', s[n - 1], 'd4'), r('Range', s[n - 1] - s[0], 'd4'), r('IQR', q3 - q1, 'd4'),
            r('Skewness', skew, 'd4'), r('Sum', sum(x), 'd4')
          ],
          charts: [{ type: 'bar', title: 'Histogram', labels: bins.map((_, i) => M.fmtNum(+(lo + i * w).toPrecision(4)) + '–' + M.fmtNum(+(lo + (i + 1) * w).toPrecision(4))), series: [{ name: 'Frequency', values: bins }] }],
          notes: ['Quartiles use linear interpolation (the same method as Excel QUARTILE.INC).']
        };
      },
      formula: ['s = √[Σ(x − x̄)² / (n − 1)]', 'Skewness = n/((n−1)(n−2)) × Σ((x − x̄)/s)³']
    },
    {
      id: 'regression', name: 'Linear regression & correlation', desc: 'Least-squares line, R², correlation, slope significance and prediction.',
      keywords: 'simple linear regression correlation coefficient pearson r squared trend line least squares prediction',
      inputs: [
        { id: 'x', label: 'X values', type: 'list', value: '1, 2, 3, 4, 5, 6, 7, 8' },
        { id: 'y', label: 'Y values', type: 'list', value: '3.1, 4.9, 7.2, 8.8, 11.1, 12.7, 15.2, 16.8' },
        { id: 'x0', label: 'Predict Y at X =', value: 10, optional: true }
      ],
      compute(v) {
        const x = v.x, y = v.y, n = x.length;
        need(n === y.length, 'X and Y need the same number of values.');
        need(n >= 3, 'Enter at least three pairs.');
        const mx = mean(x), my = mean(y);
        const sxx = sum(x.map(a => (a - mx) ** 2)), syy = sum(y.map(b => (b - my) ** 2)), sxy = sum(x.map((a, i) => (a - mx) * (y[i] - my)));
        need(sxx > 0, 'X values must not all be equal.');
        const b = sxy / sxx, a = my - b * mx, rr = sxy / Math.sqrt(sxx * syy);
        const sse = sum(x.map((xi, i) => (y[i] - a - b * xi) ** 2)), se = Math.sqrt(sse / (n - 2)), seb = se / Math.sqrt(sxx);
        const t = b / seb, p = pFromT(t, n - 2, 'two');
        const res = [
          r('Slope (b)', b, 'd4', true), r('Intercept (a)', a, 'd4', true), r('R²', rr * rr, 'd4', true), r('Correlation (r)', rr, 'd4'),
          r('Std. error of estimate', se, 'd4'), r('Std. error of slope', seb, 'd4'), r('t-statistic for slope', t, 'd4'), r('p-value for slope', p, 'd4')
        ];
        if (Number.isFinite(v.x0)) res.splice(3, 0, r('Predicted Y at X = ' + M.fmtNum(v.x0), a + b * v.x0, 'd4', true));
        const xmin = Math.min(...x, Number.isFinite(v.x0) ? v.x0 : Infinity), xmax = Math.max(...x, Number.isFinite(v.x0) ? v.x0 : -Infinity);
        return {
          results: res,
          charts: [{ type: 'line', title: 'Scatter and fitted line', xLabel: 'X', yLabel: 'Y', yZero: false,
            series: [{ name: 'Data', points: x.map((xi, i) => [xi, y[i]]), dots: true }, { name: 'ŷ = ' + M.fmtNum(a) + ' + ' + M.fmtNum(b) + 'x', points: [[xmin, a + b * xmin], [xmax, a + b * xmax]] }] }]
        };
      },
      formula: ['b = Σ(x − x̄)(y − ȳ) / Σ(x − x̄)²;  a = ȳ − b·x̄', 'r = Sxy / √(Sxx·Syy)', 't = b / SE(b), df = n − 2']
    },
    {
      id: 'normal', name: 'Normal distribution', desc: 'Probabilities and percentiles for a normal distribution.',
      keywords: 'normal distribution z score probability percentile bell curve inverse normal',
      inputs: [
        { id: 'mu', label: 'Mean (μ)', value: 100 },
        { id: 'sigma', label: 'Standard deviation (σ)', value: 15 },
        { id: 'a', label: 'Value a', value: 85 },
        { id: 'b', label: 'Value b (optional, for P(a < X < b))', value: 120, optional: true },
        { id: 'p', label: 'Percentile to find', unit: '%', value: 95 }
      ],
      compute(v) {
        need(v.sigma > 0, 'σ must be positive.');
        const z = x => (x - v.mu) / v.sigma, F = x => M.normCdf(z(x));
        const res = [r('z-score of a', z(v.a), 'd4'), r('P(X < a)', F(v.a), 'd4', true), r('P(X > a)', 1 - F(v.a), 'd4')];
        if (Number.isFinite(v.b)) res.push(r('P(a < X < b)', Math.abs(F(v.b) - F(v.a)), 'd4', true));
        res.push(r(M.fmtNum(v.p) + 'th percentile', v.mu + v.sigma * M.normInv(pct(v.p)), 'd4', true));
        const xs = M.range(v.mu - 4 * v.sigma, v.mu + 4 * v.sigma, 80);
        return {
          results: res,
          charts: [{ type: 'line', title: 'Density', xLabel: 'X', yLabel: 'Density', series: [{ name: 'Density', points: xs.map(x => [x, M.normPdf(z(x)) / v.sigma]) }],
            vlines: [{ x: v.a, label: 'a' }].concat(Number.isFinite(v.b) ? [{ x: v.b, label: 'b' }] : []) }]
        };
      },
      formula: ['z = (x − μ) / σ', 'P(X < x) = Φ(z)']
    },
    {
      id: 'ci', name: 'Confidence interval', desc: 'Confidence interval for a mean (t) or a proportion (z).',
      keywords: 'confidence interval margin of error mean proportion t distribution estimate',
      inputs: [
        { id: 'type', label: 'Interval for', type: 'select', value: 'mean', options: [['mean', 'Mean'], ['prop', 'Proportion']] },
        { id: 'xbar', label: 'Sample mean', value: 52.3, showIf: v => v.type === 'mean' },
        { id: 's', label: 'Sample standard deviation', value: 8.1, showIf: v => v.type === 'mean' },
        { id: 'x', label: 'Number of successes', value: 132, showIf: v => v.type === 'prop' },
        { id: 'n', label: 'Sample size', value: 40 },
        { id: 'conf', label: 'Confidence level', type: 'select', value: '95', options: confOpts }
      ],
      compute(v) {
        need(v.n >= 2, 'Sample size must be at least 2.');
        const a = 1 - pct(Number(v.conf));
        if (v.type === 'mean') {
          const t = M.tInv(1 - a / 2, v.n - 1), se = v.s / Math.sqrt(v.n), e = t * se;
          return { results: [r('Lower bound', v.xbar - e, 'd4', true), r('Upper bound', v.xbar + e, 'd4', true), r('Margin of error', e, 'd4'), r('Critical t', t, 'd4'), r('Standard error', se, 'd4'), r('Degrees of freedom', v.n - 1, 'int')] };
        }
        need(v.x >= 0 && v.x <= v.n, 'Successes must be between 0 and n.');
        const p = v.x / v.n, z = M.normInv(1 - a / 2), se = Math.sqrt(p * (1 - p) / v.n), e = z * se;
        return {
          results: [r('Lower bound', Math.max(0, p - e), 'pct', true), r('Upper bound', Math.min(1, p + e), 'pct', true), r('Sample proportion', p, 'pct'), r('Margin of error', e, 'pct'), r('Critical z', z, 'd4')],
          notes: [v.n * p < 10 || v.n * (1 - p) < 10 ? 'np or n(1 − p) is below 10, so the normal approximation may be poor.' : null]
        };
      },
      formula: ['Mean: x̄ ± t(α/2, n−1) × s/√n', 'Proportion: p̂ ± z(α/2) × √(p̂(1 − p̂)/n)']
    },
    {
      id: 'samplesize', name: 'Sample size', desc: 'Required sample size to estimate a mean or proportion within a margin of error.',
      keywords: 'sample size calculation margin of error survey power',
      inputs: [
        { id: 'type', label: 'Estimating a', type: 'select', value: 'prop', options: [['prop', 'Proportion'], ['mean', 'Mean']] },
        { id: 'p', label: 'Expected proportion', unit: '%', value: 50, showIf: v => v.type === 'prop', help: 'Use 50% if unknown (most conservative).' },
        { id: 's', label: 'Estimated standard deviation', value: 15, showIf: v => v.type === 'mean' },
        { id: 'e', label: 'Margin of error', value: 5, help: 'Percentage points for a proportion; units of the data for a mean.' },
        { id: 'conf', label: 'Confidence level', type: 'select', value: '95', options: confOpts },
        { id: 'N', label: 'Population size (optional)', value: '', optional: true }
      ],
      compute(v) {
        need(v.e > 0, 'Margin of error must be positive.');
        const z = M.normInv(1 - (1 - pct(Number(v.conf))) / 2);
        let n0 = v.type === 'prop' ? z * z * pct(v.p) * (1 - pct(v.p)) / (pct(v.e) ** 2) : (z * v.s / v.e) ** 2;
        const n = Number.isFinite(v.N) && v.N > 0 ? n0 / (1 + (n0 - 1) / v.N) : n0;
        return { results: [r('Required sample size', Math.ceil(n - 1e-9), 'int', true), r('Before finite population correction', n0, 'd2'), r('z', z, 'd4')] };
      },
      formula: ['Proportion: n = z²·p(1 − p) / E²', 'Mean: n = (z·σ / E)²', 'Finite population: n = n₀ / (1 + (n₀ − 1)/N)']
    },
    {
      id: 'ttest', name: 't-test', desc: 'One-sample or two-sample (Welch) t-test from summary statistics.',
      keywords: 'hypothesis test t test one sample two sample welch p value significance difference of means',
      inputs: [
        { id: 'type', label: 'Test', type: 'select', value: 'one', options: [['one', 'One sample vs. a value'], ['two', 'Two independent samples (Welch)']] },
        { id: 'm1', label: 'Mean, sample 1', value: 52.3 },
        { id: 's1', label: 'Std. deviation, sample 1', value: 8.1 },
        { id: 'n1', label: 'Size, sample 1', value: 40 },
        { id: 'mu0', label: 'Hypothesized mean (μ₀)', value: 50, showIf: v => v.type === 'one' },
        { id: 'm2', label: 'Mean, sample 2', value: 48.9, showIf: v => v.type === 'two' },
        { id: 's2', label: 'Std. deviation, sample 2', value: 9.4, showIf: v => v.type === 'two' },
        { id: 'n2', label: 'Size, sample 2', value: 35, showIf: v => v.type === 'two' },
        { id: 'tail', label: 'Alternative', type: 'select', value: 'two', options: tailOpts },
        { id: 'alpha', label: 'Significance level α', unit: '%', value: 5 }
      ],
      compute(v) {
        let t, df, diff;
        if (v.type === 'one') {
          need(v.n1 >= 2, 'Sample size must be at least 2.');
          diff = v.m1 - v.mu0; t = diff / (v.s1 / Math.sqrt(v.n1)); df = v.n1 - 1;
        } else {
          need(v.n1 >= 2 && v.n2 >= 2, 'Sample sizes must be at least 2.');
          const a = v.s1 * v.s1 / v.n1, b = v.s2 * v.s2 / v.n2;
          diff = v.m1 - v.m2; t = diff / Math.sqrt(a + b); df = (a + b) ** 2 / (a * a / (v.n1 - 1) + b * b / (v.n2 - 1));
        }
        const p = pFromT(t, df, v.tail), sig = p < pct(v.alpha);
        return {
          results: [r('t-statistic', t, 'd4', true), r('p-value', p, 'd4', true), r('Degrees of freedom', df, 'd2'), r('Difference', diff, 'd4'),
            r('Decision at α = ' + M.fmtNum(v.alpha) + '%', sig ? 'Reject H₀' : 'Fail to reject H₀', 'text', true)]
        };
      },
      formula: ['One sample: t = (x̄ − μ₀) / (s/√n), df = n − 1', 'Welch: t = (x̄₁ − x̄₂) / √(s₁²/n₁ + s₂²/n₂)']
    },
    {
      id: 'abtest', name: 'A/B test (two proportions)', desc: 'Compare conversion rates of two variants with a two-proportion z-test.',
      keywords: 'ab test split test conversion rate significance two proportion z test experiment lift',
      inputs: [
        { id: 'na', label: 'Visitors, A (control)', value: 10000 },
        { id: 'xa', label: 'Conversions, A', value: 320 },
        { id: 'nb', label: 'Visitors, B (variant)', value: 10000 },
        { id: 'xb', label: 'Conversions, B', value: 385 },
        { id: 'conf', label: 'Confidence level', type: 'select', value: '95', options: confOpts }
      ],
      compute(v) {
        need(v.na > 0 && v.nb > 0 && v.xa <= v.na && v.xb <= v.nb, 'Conversions must not exceed visitors.');
        const pa = v.xa / v.na, pb = v.xb / v.nb, pp = (v.xa + v.xb) / (v.na + v.nb);
        const z = (pb - pa) / Math.sqrt(pp * (1 - pp) * (1 / v.na + 1 / v.nb)), p = pFromZ(z, 'two');
        const a = 1 - pct(Number(v.conf)), zc = M.normInv(1 - a / 2), se = Math.sqrt(pa * (1 - pa) / v.na + pb * (1 - pb) / v.nb);
        return {
          results: [
            r('Conversion rate A', pa, 'pct'), r('Conversion rate B', pb, 'pct'), r('Relative lift', pa ? pb / pa - 1 : NaN, 'pct', true),
            r('z-statistic', z, 'd4'), r('p-value (two-sided)', p, 'd4', true),
            r('Result', p < a ? 'Significant at ' + v.conf + '%' : 'Not significant at ' + v.conf + '%', 'text', true),
            r('CI for difference (B − A)', fmt(pb - pa - zc * se, 'pct') + ' to ' + fmt(pb - pa + zc * se, 'pct'), 'text')
          ]
        };
      },
      formula: ['z = (p_B − p_A) / √[p̄(1 − p̄)(1/n_A + 1/n_B)]', 'p̄ = pooled conversion rate']
    },
    {
      id: 'chisq', name: 'Chi-square test of independence', desc: 'Test whether two categorical variables are related, from a contingency table.',
      keywords: 'chi square test independence contingency table cross tab categorical cramer v',
      inputs: [
        { id: 'tab', label: 'Observed counts (rows × columns)', type: 'text', rows: 4, value: 'Male, 30, 45, 25\nFemale, 40, 35, 25', help: 'Optional row label first.' },
        { id: 'alpha', label: 'Significance level α', unit: '%', value: 5 }
      ],
      compute(v) {
        const { labels, m } = M.parseMatrix(v.tab), R = m.length, C = m[0].length;
        need(R >= 2 && C >= 2, 'Need at least a 2×2 table.');
        const rt = m.map(row => sum(row)), ct = m[0].map((_, j) => sum(m.map(row => row[j]))), N = sum(rt);
        let chi = 0; const E = m.map((row, i) => row.map((o, j) => { const e = rt[i] * ct[j] / N; chi += (o - e) ** 2 / e; return e; }));
        const df = (R - 1) * (C - 1), p = 1 - M.chiCdf(chi, df);
        return {
          results: [r('χ² statistic', chi, 'd4', true), r('Degrees of freedom', df, 'int'), r('p-value', p, 'd4', true),
            r('Decision at α = ' + M.fmtNum(v.alpha) + '%', p < pct(v.alpha) ? 'Reject independence' : 'Fail to reject independence', 'text', true),
            r('Cramér\'s V', Math.sqrt(chi / (N * (Math.min(R, C) - 1))), 'd4')],
          tables: [{ title: 'Expected counts', head: [''].concat(ct.map((_, j) => 'Col ' + (j + 1))), fmts: ['text'].concat(ct.map(() => 'd2')), rows: E.map((row, i) => [labels[i] || 'Row ' + (i + 1)].concat(row)) }],
          notes: [E.some(row => row.some(e => e < 5)) ? 'Some expected counts are below 5; the chi-square approximation may be unreliable.' : null]
        };
      },
      formula: ['χ² = Σ (O − E)² / E,  E = row total × column total / N', 'df = (rows − 1)(columns − 1)']
    },
    {
      id: 'binomial', name: 'Binomial & Poisson', desc: 'Exact, cumulative and tail probabilities for binomial and Poisson distributions.',
      keywords: 'binomial distribution poisson distribution probability discrete successes arrivals',
      inputs: [
        { id: 'dist', label: 'Distribution', type: 'select', value: 'binom', options: [['binom', 'Binomial'], ['pois', 'Poisson']] },
        { id: 'n', label: 'Number of trials (n)', value: 20, showIf: v => v.dist === 'binom' },
        { id: 'p', label: 'Probability of success (p)', value: 0.3, showIf: v => v.dist === 'binom' },
        { id: 'lambda', label: 'Mean number of events (λ)', value: 4, showIf: v => v.dist === 'pois' },
        { id: 'k', label: 'Number of successes / events (k)', value: 5 }
      ],
      compute(v) {
        const k = Math.round(v.k);
        let pmf, maxK, mu, vr;
        if (v.dist === 'binom') {
          const n = Math.round(v.n);
          need(n >= 1 && n <= 100000 && v.p >= 0 && v.p <= 1, 'Need n ≥ 1 and 0 ≤ p ≤ 1.');
          pmf = j => j < 0 || j > n ? 0 : v.p === 0 ? (j === 0 ? 1 : 0) : v.p === 1 ? (j === n ? 1 : 0) : Math.exp(M.lnChoose(n, j) + j * Math.log(v.p) + (n - j) * Math.log(1 - v.p));
          maxK = n; mu = n * v.p; vr = n * v.p * (1 - v.p);
        } else {
          need(v.lambda > 0, 'λ must be positive.');
          pmf = j => j < 0 ? 0 : Math.exp(-v.lambda + j * Math.log(v.lambda) - M.lgamma(j + 1));
          maxK = Math.ceil(v.lambda + 10 * Math.sqrt(v.lambda) + 10); mu = vr = v.lambda;
        }
        let cdf = 0; for (let j = 0; j <= Math.min(k, maxK); j++) cdf += pmf(j);
        const hi = Math.min(maxK, Math.ceil(mu + 4 * Math.sqrt(vr) + 2)), lo = Math.max(0, Math.floor(mu - 4 * Math.sqrt(vr) - 1));
        const ks = []; for (let j = lo; j <= hi; j++) ks.push(j);
        return {
          results: [r('P(X = k)', pmf(k), 'd4', true), r('P(X ≤ k)', Math.min(1, cdf), 'd4', true), r('P(X < k)', Math.min(1, cdf - pmf(k)), 'd4'), r('P(X ≥ k)', Math.max(0, 1 - cdf + pmf(k)), 'd4'), r('P(X > k)', Math.max(0, 1 - cdf), 'd4'),
            r('Mean', mu, 'd4'), r('Standard deviation', Math.sqrt(vr), 'd4')],
          charts: [{ type: 'bar', title: 'Probability mass function', labels: ks.map(String), series: [{ name: 'P(X = k)', values: ks.map(pmf) }] }]
        };
      },
      formula: ['Binomial: P(X = k) = C(n, k)·pᵏ·(1 − p)ⁿ⁻ᵏ', 'Poisson: P(X = k) = e^(−λ)·λᵏ / k!']
    },
    {
      id: 'bayes', name: 'Bayes\' theorem', desc: 'Update a prior probability with evidence (e.g. test results, signals).',
      keywords: 'bayes theorem conditional probability posterior prior sensitivity specificity false positive',
      inputs: [
        { id: 'prior', label: 'Prior probability P(A)', unit: '%', value: 2 },
        { id: 'tp', label: 'P(evidence | A) — sensitivity', unit: '%', value: 90 },
        { id: 'fp', label: 'P(evidence | not A) — false positive rate', unit: '%', value: 8 }
      ],
      compute(v) {
        const pa = pct(v.prior), pe = pct(v.tp) * pa + pct(v.fp) * (1 - pa);
        need(pe > 0, 'Probability of the evidence is zero.');
        const post = pct(v.tp) * pa / pe, postNeg = (1 - pct(v.tp)) * pa / (1 - pe);
        return {
          results: [r('P(A | evidence)', post, 'pct', true), r('P(evidence)', pe, 'pct'), r('P(A | no evidence)', postNeg, 'pct'), r('Likelihood ratio', pct(v.tp) / pct(v.fp), 'd4')],
          tables: [{ title: 'Out of 10,000 cases', head: ['', 'Evidence', 'No evidence', 'Total'], fmts: ['text', 'int', 'int', 'int'],
            rows: [['A', 1e4 * pa * pct(v.tp), 1e4 * pa * (1 - pct(v.tp)), 1e4 * pa], ['Not A', 1e4 * (1 - pa) * pct(v.fp), 1e4 * (1 - pa) * (1 - pct(v.fp)), 1e4 * (1 - pa)]] }]
        };
      },
      formula: ['P(A|E) = P(E|A)·P(A) / [P(E|A)·P(A) + P(E|¬A)·P(¬A)]']
    }
  ]);
})();
