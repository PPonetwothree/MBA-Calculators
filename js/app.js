/* App shell: routing, sidebar, search, form rendering and live results. */
(function () {
  'use strict';
  const M = window.MC;
  const { esc, fmt } = M;
  const $ = (sel, el = document) => el.querySelector(sel);
  const byId = new Map(M.CALCS.map(c => [c.id, c]));
  const catName = id => (M.CATEGORIES.find(c => c.id === id) || {}).name || id;

  // 8×8 pixel-art icons, one per category (original artwork).
  const ICONS = {
    finance: ['..####..', '.#....#.', '#..##..#', '#.##...#', '#..##..#', '#...##.#', '.#.##.#.', '..####..'],
    accounting: ['.######.', '.#....##', '.#.##.##', '.#....##', '.#.##.##', '.#....##', '.#######', '........'],
    operations: ['...##...', '.######.', '.##..##.', '###..###', '###..###', '.##..##.', '.######.', '...##...'],
    optimization: ['#####...', '#######.', '#####...', '#.......', '#.......', '#.......', '#.......', '###.....'],
    economics: ['#......#', '.#....#.', '..#..#..', '...##...', '...##...', '..#..#..', '.#....#.', '#......#'],
    marketing: ['......#.', '....###.', '##.####.', '#######.', '#######.', '##.####.', '....###.', '......#.'],
    statistics: ['........', '......##', '......##', '...##.##', '...##.##', '##.##.##', '##.##.##', '########']
  };
  function icon(cat, size = 16) {
    const rows = ICONS[cat] || [];
    let r = '';
    rows.forEach((row, y) => [...row].forEach((ch, x) => { if (ch === '#') r += `<rect x="${x}" y="${y}" width="1" height="1"/>`; }));
    return `<svg class="px-icon" width="${size}" height="${size}" viewBox="0 0 8 8" shape-rendering="crispEdges" aria-hidden="true" fill="currentColor">${r}</svg>`;
  }
  const worldNo = id => M.CATEGORIES.findIndex(c => c.id === id) + 1;

  const main = $('#main'), sidebar = $('#sidebar'), search = $('#search');
  let current = null; // { calc, raw }
  let timer = null;

  // ---------- Search ----------
  const norm = s => String(s).toLowerCase();
  function matches(c, q) {
    if (!q) return true;
    const hay = norm(c.name + ' ' + c.desc + ' ' + (c.keywords || '') + ' ' + catName(c.cat));
    return q.split(/\s+/).every(w => hay.includes(w));
  }
  function filtered() {
    const q = norm(search.value.trim());
    return M.CALCS.filter(c => matches(c, q));
  }

  // ---------- Sidebar ----------
  function renderSidebar() {
    const list = filtered(), activeId = current && current.calc.id;
    let html = '';
    M.CATEGORIES.forEach(cat => {
      const items = list.filter(c => c.cat === cat.id);
      if (!items.length) return;
      html += `<div class="nav-group" data-cat="${cat.id}"><h2>${icon(cat.id, 12)}${esc(cat.name)}</h2><ul>` +
        items.map(c => `<li><a href="#/${c.id}"${c.id === activeId ? ' aria-current="page"' : ''}>${esc(c.name)}</a></li>`).join('') +
        '</ul></div>';
    });
    sidebar.innerHTML = html || '<p class="muted pad">No calculators match.</p>';
  }

  // ---------- Home ----------
  function renderHome() {
    current = null;
    document.title = 'MBA Calculators';
    const list = filtered(), q = search.value.trim();
    const pad = n => String(n).padStart(6, '0');
    let html = `<div class="home"><section class="hero px-box">
        <div class="hud"><span>CALCS <b>${pad(M.CALCS.length)}</b></span><span>WORLDS <b>${M.CATEGORIES.length}</b></span><span>LIVES <b>99</b></span></div>
        <h1>MBA Calculators</h1>
        <p class="lede">${M.CALCS.length} calculators for finance, accounting, operations, optimization, economics, marketing and statistics.
        Results update as you type, every calculation shows its formula, and nothing leaves your browser.</p>
        <p class="press"><span class="blink">▶</span> PRESS / TO SEARCH OR SELECT A STAGE</p>
      </section>`;
    if (q) html += `<p class="muted">${list.length} result${list.length === 1 ? '' : 's'} for “${esc(q)}”.</p>`;
    M.CATEGORIES.forEach(cat => {
      const items = list.filter(c => c.cat === cat.id);
      if (!items.length) return;
      html += `<section class="cat" data-cat="${cat.id}"><h2 id="cat-${cat.id}">${icon(cat.id, 24)}<span><small>WORLD ${worldNo(cat.id)}</small>${esc(cat.name)}</span> <span class="count">${items.length} stages</span></h2><ul class="index">` +
        items.map(c => `<li><a href="#/${c.id}"><span class="name">${esc(c.name)}</span><span class="desc">${esc(c.desc)}</span></a></li>`).join('') +
        '</ul></section>';
    });
    if (!list.length) html += '<p>No calculators match your search.</p>';
    main.innerHTML = html + '</div>';
  }

  // ---------- Calculator ----------
  function defaults(calc) {
    const raw = {};
    calc.inputs.forEach(i => { raw[i.id] = i.value === undefined ? '' : String(i.value); });
    return raw;
  }
  function fieldHtml(inp, val) {
    const id = 'f-' + inp.id;
    const help = inp.help ? `<small class="help" id="${id}-h">${esc(inp.help)}</small>` : '';
    const desc = inp.help ? ` aria-describedby="${id}-h"` : '';
    let control;
    if (inp.type === 'select') {
      control = `<select id="${id}" name="${inp.id}"${desc}>` + inp.options.map(o => `<option value="${esc(o[0])}"${o[0] === val ? ' selected' : ''}>${esc(o[1])}</option>`).join('') + '</select>';
    } else if (inp.type === 'text') {
      control = `<textarea id="${id}" name="${inp.id}" rows="${inp.rows || 4}" spellcheck="false"${desc}>${esc(val)}</textarea>`;
    } else {
      const isList = inp.type === 'list';
      if (isList) return `<div class="field" data-id="${inp.id}"><label for="${id}">${esc(inp.label)}${inp.optional ? ' <span class="muted">(optional)</span>' : ''}</label><textarea class="list" id="${id}" name="${inp.id}" rows="2" spellcheck="false"${desc}>${esc(val)}</textarea>${help}</div>`;
      const pre = inp.unit === 'cur' && M.getCurrency() ? `<span class="affix">${esc(M.getCurrency())}</span>` : '';
      const suf = inp.unit && inp.unit !== 'cur' ? `<span class="affix">${esc(inp.unit)}</span>` : '';
      control = `<div class="input-wrap${isList ? ' wide' : ''}">${pre}<input id="${id}" name="${inp.id}" type="text" inputmode="${isList ? 'text' : 'decimal'}" autocomplete="off" spellcheck="false" value="${esc(val)}"${desc}>${suf}</div>`;
    }
    const opt = inp.optional ? ' <span class="muted">(optional)</span>' : '';
    return `<div class="field" data-id="${inp.id}"><label for="${id}">${esc(inp.label)}${opt}</label>${control}${help}</div>`;
  }

  function parseInputs(calc, raw) {
    const v = {};
    calc.inputs.forEach(i => { if (i.type === 'select') v[i.id] = raw[i.id]; });
    calc.inputs.forEach(inp => {
      const s = raw[inp.id], hidden = inp.showIf && !inp.showIf(v);
      if (inp.type === 'select') return;
      if (inp.type === 'text') { v[inp.id] = s; return; }
      if (inp.type === 'list') {
        if (!s.trim()) { if (inp.optional || hidden) { v[inp.id] = []; return; } M.fail(inp.label + ': enter at least one value.'); }
        try { v[inp.id] = M.parseList(s); } catch (e) { if (hidden) { v[inp.id] = []; return; } throw new M.InputError(inp.label + ': ' + e.message); }
        return;
      }
      const n = M.parseNumber(s);
      if (!Number.isFinite(n) && !inp.optional && !hidden) M.fail(inp.label + ': enter a number.');
      v[inp.id] = n;
    });
    return v;
  }

  function cell(val, f) {
    if (val === null || val === undefined || (typeof val === 'number' && Number.isNaN(val))) return '–';
    if (typeof val === 'string') return esc(val);
    return esc(fmt(val, f || 'num'));
  }
  function renderResults(out) {
    const items = out.results || [];
    const keys = items.filter(x => x.key && !x.section);
    const rest = items.filter(x => !x.key || x.section);
    let html = '';
    if (keys.length) {
      html += '<div class="key">' + keys.map(x => `<div class="kv"><div class="k">${esc(x.label)}</div><div class="v">${cell(x.value, x.fmt)}</div>${x.hint ? `<div class="u">${esc(x.hint)}</div>` : ''}</div>`).join('') + '</div>';
    }
    if (rest.length) {
      html += '<table class="dl"><tbody>' + rest.map(x => x.section
        ? `<tr class="sec"><th colspan="2">${esc(x.section)}</th></tr>`
        : (() => {
          const unit = x.hint && x.hint.length <= 16;
          return `<tr><th scope="row">${esc(x.label)}${x.hint && !unit ? `<small>${esc(x.hint)}</small>` : ''}</th><td>${cell(x.value, x.fmt)}${unit ? ` <span class="muted">${esc(x.hint)}</span>` : ''}</td></tr>`;
        })()).join('') + '</tbody></table>';
    }
    const notes = (out.notes || []).filter(Boolean);
    if (notes.length) html += '<ul class="notes">' + notes.map(n => `<li>${esc(n)}</li>`).join('') + '</ul>';
    return html;
  }
  function renderExtras(out) {
    let html = '';
    (out.charts || []).forEach(c => { html += M.chart(c); });
    (out.tables || []).forEach(t => {
      if (!t.rows || !t.rows.length) return;
      const fm = t.fmts || [];
      const numeric = j => fm[j] && fm[j] !== 'text';
      html += `<div class="table-block">${t.title ? `<h3>${esc(t.title)}</h3>` : ''}<div class="scroll"><table class="data"><thead><tr>` +
        t.head.map((h, j) => `<th${numeric(j) ? ' class="num"' : ''}>${esc(h)}</th>`).join('') + '</tr></thead><tbody>' +
        t.rows.map(row => '<tr>' + row.map((val, j) => `<td${numeric(j) ? ' class="num"' : ''}>${cell(val, fm[j])}</td>`).join('') + '</tr>').join('') +
        '</tbody></table></div></div>';
    });
    return html;
  }

  function recompute() {
    if (!current) return;
    const { calc, raw } = current;
    const form = $('#calc-form');
    // Visibility of conditional fields.
    const sel = {};
    calc.inputs.forEach(i => { if (i.type === 'select') sel[i.id] = raw[i.id]; });
    calc.inputs.forEach(i => { const el = form.querySelector(`[data-id="${i.id}"]`); if (el) el.hidden = !!(i.showIf && !i.showIf(sel)); });
    const res = $('#results'), extras = $('#extras');
    try {
      const out = calc.compute(parseInputs(calc, raw));
      res.innerHTML = renderResults(out);
      extras.innerHTML = renderExtras(out);
      res.classList.remove('has-error');
    } catch (e) {
      if (!(e instanceof M.InputError)) console.error(e);
      res.innerHTML = `<p class="error" role="alert"><b>ERROR!</b> ${esc(e instanceof M.InputError ? e.message : 'Could not calculate with these inputs. Check the values and try again.')}</p>`;
      extras.innerHTML = '';
      res.classList.add('has-error');
    }
  }

  function syncUrl() {
    if (!current) return;
    const d = defaults(current.calc), p = new URLSearchParams();
    Object.keys(current.raw).forEach(k => { if (current.raw[k] !== d[k]) p.set(k, current.raw[k]); });
    const qs = p.toString();
    history.replaceState(null, '', '#/' + current.calc.id + (qs ? '?' + qs : ''));
  }

  function renderCalc(calc, params) {
    const raw = defaults(calc);
    params.forEach((val, k) => { if (k in raw) raw[k] = val; });
    current = { calc, raw };
    document.title = calc.name + ' – MBA Calculators';
    const related = M.CALCS.filter(c => c.cat === calc.cat && c.id !== calc.id);
    main.innerHTML = `<article class="calc" data-cat="${calc.cat}">
      <p class="crumb"><a href="#/">All calculators</a> <span aria-hidden="true">/</span> ${icon(calc.cat, 12)} World ${worldNo(calc.cat)}: ${esc(catName(calc.cat))}</p>
      <h1>${esc(calc.name)}</h1>
      <p class="lede">${esc(calc.desc)}</p>
      <div class="calc-grid">
        <form id="calc-form" class="inputs px-box" novalidate autocomplete="off">
          <h2>Inputs</h2>
          ${calc.inputs.map(i => fieldHtml(i, raw[i.id])).join('')}
          <div class="actions">
            <button type="button" id="reset" class="btn">Reset example</button>
            <button type="button" id="copy" class="btn">Copy link</button>
          </div>
        </form>
        <section class="output" aria-labelledby="res-h">
          <h2 id="res-h">Results</h2>
          <div id="results" aria-live="polite"></div>
        </section>
      </div>
      <div id="extras" class="extras"></div>
      <section class="method">
        <h2>Formula</h2>
        <pre>${esc((calc.formula || []).join('\n'))}</pre>
      </section>
      ${related.length ? `<section class="related"><h2>More in ${esc(catName(calc.cat))}</h2><ul>${related.map(c => `<li><a href="#/${c.id}">${esc(c.name)}</a></li>`).join('')}</ul></section>` : ''}
    </article>`;
    const form = $('#calc-form');
    form.addEventListener('input', e => {
      const name = e.target.name;
      if (!name) return;
      current.raw[name] = e.target.value;
      clearTimeout(timer);
      timer = setTimeout(() => { recompute(); syncUrl(); }, e.target.tagName === 'SELECT' ? 0 : 120);
    });
    form.addEventListener('submit', e => e.preventDefault());
    $('#reset').addEventListener('click', () => { history.replaceState(null, '', '#/' + calc.id); route(); });
    $('#copy').addEventListener('click', e => {
      const btn = e.currentTarget, done = t => { btn.textContent = t; setTimeout(() => { btn.textContent = 'Copy link'; }, 1500); };
      const url = location.href;
      if (navigator.clipboard) navigator.clipboard.writeText(url).then(() => done('Copied'), () => done('Copy failed'));
      else done('Copy failed');
    });
    recompute();
  }

  // ---------- Router ----------
  function route() {
    const h = location.hash.replace(/^#\/?/, '');
    const [path, qs] = h.split('?');
    const calc = byId.get(path);
    document.body.classList.remove('nav-open');
    if (calc) {
      if (!current || current.calc !== calc) window.scrollTo(0, 0);
      renderCalc(calc, new URLSearchParams(qs || ''));
    } else renderHome();
    renderSidebar();
  }

  // ---------- Global controls ----------
  search.addEventListener('input', () => {
    renderSidebar();
    if (!current) renderHome();
  });
  search.addEventListener('keydown', e => {
    if (e.key === 'Enter') {
      const first = filtered()[0];
      if (first) { location.hash = '#/' + first.id; search.blur(); }
    } else if (e.key === 'Escape') { search.value = ''; search.dispatchEvent(new Event('input')); }
  });
  document.addEventListener('keydown', e => {
    if (e.key === '/' && !/^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement.tagName)) { e.preventDefault(); search.focus(); }
  });
  const cur = $('#currency');
  cur.value = M.getCurrency();
  cur.addEventListener('change', () => {
    M.setCurrency(cur.value);
    if (current) { const { calc } = current; const p = new URLSearchParams(location.hash.split('?')[1] || ''); renderCalc(calc, p); }
  });
  $('#menu').addEventListener('click', () => {
    const open = document.body.classList.toggle('nav-open');
    $('#menu').setAttribute('aria-expanded', String(open));
  });
  window.addEventListener('hashchange', route);
  route();
})();
