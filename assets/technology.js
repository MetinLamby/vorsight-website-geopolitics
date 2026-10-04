/* Vorsight – technology page: six-step flow with interactive illustrations (plain JS) */
(function () {
  'use strict';

  var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  var NS = 'http://www.w3.org/2000/svg';
  var ORANGE = '#EE8A2E';

  /* ---------------------------------------------------------------- helpers */
  function $(s, r) { return (r || document).querySelector(s); }
  function $$(s, r) { return [].slice.call((r || document).querySelectorAll(s)); }
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
  function ease(x) { x = clamp(x, 0, 1); return x * x * (3 - 2 * x); }
  function el(tag, cls, html) { var e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; }
  function svgEl(tag, attrs, parent) {
    var e = document.createElementNS(NS, tag);
    for (var k in attrs) e.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(e);
    return e;
  }
  function sign(v, d) { return (v < 0 ? '−' : '+') + Math.abs(v).toFixed(d); }
  function fmtPct(v) { return Math.round(v) + '%'; }
  function fmtL(v) { return '€' + (v >= 100 ? Math.round(v) : v.toFixed(1)) + 'm'; }
  function onVisible(node, cb, thr) {
    if (!('IntersectionObserver' in window)) { cb(true); return; }
    new IntersectionObserver(function (es) { cb(es[0].isIntersecting); }, { threshold: thr || 0.25 }).observe(node);
  }
  function tween(node, from, to, ms, fmt) {
    cancelAnimationFrame(node._raf);
    if (reduce || ms <= 0 || document.hidden) { node.textContent = fmt(to); node._v = to; return; }
    var t0 = performance.now();
    (function step(t) {
      var k = ease((t - t0) / ms), v = from + (to - from) * k;
      node.textContent = fmt(v); node._v = v;
      if (k < 1) node._raf = requestAnimationFrame(step);
    })(t0);
  }
  /* run fn every `ms` while `node` is on screen; stops once the user has taken over */
  function autoplay(node, ms, fn, isTouched) {
    var vis = false;
    if (reduce) return;
    onVisible(node, function (v) { vis = v; }, 0.3);
    setInterval(function () { if (vis && !isTouched()) fn(); }, ms);
  }

  /* ---------------------------------------------------------------- column graph (DOM nodes + SVG edges) */
  function colGraph(root, cfg) {
    root.innerHTML = ''; root.classList.add('cg');
    root.style.setProperty('--n', cfg.cols.length);
    var svg = svgEl('svg', { 'class': 'cg-svg', 'aria-hidden': 'true' }); root.appendChild(svg);
    var cols = el('div', 'cg-cols'); root.appendChild(cols);
    var api = { nodes: {}, edges: [], root: root, order: [] }, idx = 0;

    cfg.cols.forEach(function (c, ci) {
      var col = el('div', 'cg-col'); col.appendChild(el('div', 'cg-title', c.title || ''));
      var list = el('div', 'cg-list');
      c.nodes.forEach(function (n) {
        var b = el('button', 'cg-node' + (n.kind ? ' cg-k-' + n.kind : ''));
        b.type = 'button'; b.setAttribute('data-id', n.id); b.style.setProperty('--i', idx++);
        b.innerHTML = '<span class="cg-l">' + n.label + '</span>' + (n.sub ? '<small>' + n.sub + '</small>' : '') + '<span class="cg-b"></span>';
        list.appendChild(b); api.nodes[n.id] = { el: b, col: ci, cfg: n }; api.order.push(n.id);
      });
      col.appendChild(list); cols.appendChild(col);
    });
    cfg.edges.forEach(function (e) {
      var p = svgEl('path', { 'class': 'cg-edge', pathLength: 1 }, svg);
      api.edges.push({ a: e[0], b: e[1], el: p });
    });

    api.draw = function () {
      var rr = root.getBoundingClientRect(); if (!rr.width) return;
      svg.setAttribute('width', rr.width); svg.setAttribute('height', rr.height);
      api.edges.forEach(function (e) {
        var A = api.nodes[e.a].el.getBoundingClientRect(), B = api.nodes[e.b].el.getBoundingClientRect();
        var fwd = A.left < B.left;
        var x1 = (fwd ? A.right : A.left) - rr.left, y1 = A.top + A.height / 2 - rr.top;
        var x2 = (fwd ? B.left : B.right) - rr.left, y2 = B.top + B.height / 2 - rr.top, dx = Math.abs(x2 - x1) * 0.5;
        e.el.setAttribute('d', 'M' + x1 + ' ' + y1 + ' C' + (x1 + (fwd ? dx : -dx)) + ' ' + y1 + ',' + (x2 - (fwd ? dx : -dx)) + ' ' + y2 + ',' + x2 + ' ' + y2);
      });
    };
    api.out = function (id) { return api.edges.filter(function (e) { return e.a === id; }).map(function (e) { return e.b; }); };
    api.reach = function (id) {          /* everything downstream of id */
      var seen = {}, q = [id]; seen[id] = 1;
      while (q.length) { var c = q.shift(); api.out(c).forEach(function (n) { if (!seen[n]) { seen[n] = 1; q.push(n); } }); }
      return seen;
    };
    if (window.ResizeObserver) new ResizeObserver(api.draw).observe(root); else window.addEventListener('resize', api.draw);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(api.draw);
    requestAnimationFrame(api.draw); setTimeout(api.draw, 300);
    return api;
  }

  /* ---------------------------------------------------------------- side rail */
  (function rail() {
    var rail = $('#rail'); if (!rail) return;
    var dots = $$('a', rail), stages = $$('.stage');
    rail.classList.add('show');
    if (!('IntersectionObserver' in window)) return;
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) { if (e.isIntersecting) { var n = +e.target.dataset.stage; dots.forEach(function (d, k) { d.classList.toggle('on', k === n - 1); }); } });
    }, { rootMargin: '-45% 0px -50% 0px' });
    stages.forEach(function (s) { io.observe(s); });
  })();

  /* ================================================================ 01 · company graph on a globe */
  (function stage1() {
    var cv = $('#globe-cv'); if (!cv || !window.VGEO) return;
    var wrap = cv.parentNode, ctx = cv.getContext('2d'), rad = Math.PI / 180, TAU = Math.PI * 2;
    var TOOLS = { export: 'Export controls', shipping: 'Shipping chokepoints', tariffs: 'Tariffs', finance: 'Sanctions & asset freezes' };
    var LV = ['None', 'Low', 'Medium', 'High'];

    /* the supply chain: rare earths -> magnets -> Germany -> sold in America */
    var N = [
      { id: 'mine', short: 'Mine', n: 'Rare earth mine & processing', s: 'China · Inner Mongolia', lat: 40.65, lon: 109.8, lvl: 3, tool: 'export', z: 2.5,
        why: 'Most rare earth processing sits in China. A licensing regime can stop exports within weeks.' },
      { id: 'mag', short: 'Magnets', n: 'Magnet manufacturer', s: 'Tier 2 · China', lat: 29.9, lon: 121.5, lvl: 3, tool: 'export', z: 3.2,
        why: 'Your drive-motor supplier buys its magnets from a single Tier 2 plant in China.' },
      { id: 'sea', short: 'Suez', n: 'Suez Canal route', s: 'Sea freight · Asia → Europe', lat: 30.5, lon: 32.3, lvl: 2, tool: 'shipping', z: 2.4,
        why: 'Asia–Europe freight passes one corridor. A closure adds weeks and cost.' },
      { id: 't1', short: 'Tier 1', n: 'Drive-motor supplier', s: 'Tier 1 · Germany', lat: 48.8, lon: 9.2, lvl: 3, tool: 'export', z: 6,
        why: 'Builds the motors. No magnets, no motors: a single point of failure.' },
      { id: 'plant', short: 'Plant', n: 'Assembly plant', s: 'Germany · Lower Saxony', lat: 52.4, lon: 10.8, lvl: 2, tool: null, z: 6,
        why: 'Where the cars are built. Production stops if motor deliveries stop.' },
      { id: 'us', short: 'US market', n: 'Dealers & customers', s: 'United States · East Coast', lat: 32.8, lon: -79.9, lvl: 3, tool: 'tariffs', z: 2.4,
        why: 'Your largest export market. New tariffs would hit price and volume at once.' },
      { id: 'tre', short: 'USD', n: 'Treasury · USD clearing', s: 'New York', lat: 40.7, lon: -74, lvl: 2, tool: 'finance', z: 3.6,
        why: 'Dollar clearing means sanctions or asset freezes could trap cash.' }
    ];
    var byId = {}; N.forEach(function (n) { byId[n.id] = n; });
    var LEGS = [['mine', 'mag', 'export'], ['mag', 'sea', 'export'], ['sea', 't1', 'shipping'], ['t1', 'plant', null], ['plant', 'us', 'tariffs'], ['tre', 'plant', 'finance', 1]];
    var CLABEL = [['CHINA', 35, 103], ['UNITED STATES', 39, -98], ['EGYPT', 26.5, 29.5]];

    /* ---- dots: land + detailed dots inside the countries on the route ---- */
    var bin = atob(VGEO.land), land = new Uint8Array(360 * 180), i, j;
    for (i = 0; i < bin.length; i++) { var c = bin.charCodeAt(i); for (j = 0; j < 8; j++) land[i * 8 + j] = (c >> (7 - j)) & 1; }
    var CO = {};
    Object.keys(VGEO.countries).forEach(function (k) {
      CO[k] = VGEO.countries[k].map(function (r) {
        var b = { pts: r, x0: 999, x1: -999, y0: 999, y1: -999 };
        r.forEach(function (p) { b.x0 = Math.min(b.x0, p[0]); b.x1 = Math.max(b.x1, p[0]); b.y0 = Math.min(b.y0, p[1]); b.y1 = Math.max(b.y1, p[1]); });
        return b;
      });
    });
    function inCountry(k, lon, lat) {
      var rs = CO[k];
      for (var a = 0; a < rs.length; a++) {
        var r = rs[a]; if (lon < r.x0 || lon > r.x1 || lat < r.y0 || lat > r.y1) continue;
        var p = r.pts, ins = false, n = p.length;
        for (var x = 0, y = n - 1; x < n; y = x++) {
          if ((p[x][1] > lat) !== (p[y][1] > lat) && lon < (p[y][0] - p[x][0]) * (lat - p[x][1]) / (p[y][1] - p[x][1]) + p[x][0]) ins = !ins;
        }
        if (ins) return true;
      }
      return false;
    }
    function which(lon, lat) { for (var k in CO) if (inCountry(k, lon, lat)) return k; return null; }
    function mkSet() { return { cl: [], sl: [], cL: [], sL: [], n: 0 }; }
    function add(s, lat, lon) { var la = lat * rad, lo = lon * rad; s.cl.push(Math.cos(la)); s.sl.push(Math.sin(la)); s.cL.push(Math.cos(lo)); s.sL.push(Math.sin(lo)); s.n++; }
    var REST = mkSet(), HI = {}, STEP = { CN: 0.5, US: 0.5, DE: 0.2, EG: 0.3 };
    var NG = 48000, GA = Math.PI * (3 - Math.sqrt(5));
    for (i = 0; i < NG; i++) {
      var la = Math.asin(1 - 2 * (i + 0.5) / NG) / rad, lo = ((GA * i) % TAU) / rad - 180;
      if (land[Math.min(179, Math.floor(90 - la)) * 360 + Math.min(359, Math.floor(lo + 180))] && !which(lo, la)) add(REST, la, lo);
    }
    Object.keys(CO).forEach(function (k) {
      var s = HI[k] = mkSet(), x0 = 999, x1 = -999, y0 = 999, y1 = -999, st = STEP[k] || 0.4, row = 0;
      CO[k].forEach(function (r) { x0 = Math.min(x0, r.x0); x1 = Math.max(x1, r.x1); y0 = Math.min(y0, r.y0); y1 = Math.max(y1, r.y1); });
      for (var lat = y0; lat <= y1; lat += st, row++) {
        var ls = st / Math.max(0.25, Math.cos(lat * rad));
        for (var lon = x0 + (row % 2) * ls / 2; lon <= x1; lon += ls) if (inCountry(k, lon, lat)) add(s, lat, lon);
      }
    });
    [REST].concat(Object.keys(HI).map(function (k) { return HI[k]; })).forEach(function (s) { s.cl = Float32Array.from(s.cl); s.sl = Float32Array.from(s.sl); s.cL = Float32Array.from(s.cL); s.sL = Float32Array.from(s.sL); });

    /* ---- arcs between route nodes (great circles lifted above the surface) ---- */
    function vec(n) { var la = n.lat * rad, lo = n.lon * rad; return [Math.cos(la) * Math.cos(lo), Math.cos(la) * Math.sin(lo), Math.sin(la)]; }
    LEGS.forEach(function (l) {
      var A = vec(byId[l[0]]), B = vec(byId[l[1]]), dot = clamp(A[0] * B[0] + A[1] * B[1] + A[2] * B[2], -1, 1), ang = Math.acos(dot), so = Math.sin(ang) || 1, pts = [];
      for (var s = 0; s <= 40; s++) {
        var t = s / 40, a = Math.sin((1 - t) * ang) / so, b = Math.sin(t * ang) / so;
        var x = a * A[0] + b * B[0], y = a * A[1] + b * B[1], z = a * A[2] + b * B[2], la = Math.asin(z), lo = Math.atan2(y, x), f = 1 + (0.02 + 0.1 * ang / Math.PI) * Math.sin(Math.PI * t);
        pts.push({ cl: Math.cos(la), sl: Math.sin(la), cL: Math.cos(lo), sL: Math.sin(lo), f: f });
      }
      l.pts = pts;
    });

    /* ---- camera + state ---- */
    var W = 0, H = 0, dpr = 1, base = 1, cx = 0, cy = 0;
    var OVER = { lon: 55, lat: 32, z: 1.15 };
    var cam = { lon: OVER.lon, lat: OVER.lat, z: OVER.z }, tgt = { lon: OVER.lon, lat: OVER.lat, z: OVER.z };
    var sel = 'mine', filter = 'all', touched = false, visible = false, last = 0, drag = null, pinPos = {}, hover = null;
    var detail = $('#g1-detail'), chips = $$('#g1-chips .chip'), route = $('#g1-route'), sum = $('#g1-count');
    var hiN = N.filter(function (n) { return n.lvl === 3; }).length, medN = N.filter(function (n) { return n.lvl === 2; }).length;
    sum.textContent = hiN + ' high · ' + medN + ' medium exposures';

    function size() {
      dpr = Math.min(window.devicePixelRatio || 1, 2); W = wrap.clientWidth; H = wrap.clientHeight; if (!W) return;
      cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr); ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      base = Math.min(W, H) * 0.42; cx = W / 2; cy = H / 2;
    }
    function lit(n) { return filter === 'all' ? n.lvl >= 2 : n.tool === filter; }
    function paintUi() {
      chips.forEach(function (c) { c.classList.toggle('on', c.dataset.tool === filter); c.setAttribute('aria-pressed', c.dataset.tool === filter); });
      $$('button', route).forEach(function (b) { b.classList.toggle('on', b.dataset.id === sel); });
      if (sel) {
        var n = byId[sel];
        detail.innerHTML = '<b>' + n.n + '</b> <span class="tagx' + (n.lvl >= 2 ? ' hot' : '') + '">' + LV[n.lvl] + ' exposure</span>' + (n.tool ? ' <span class="tagx">Tool: ' + TOOLS[n.tool] + '</span>' : '') +
          '<p>' + n.s + '. ' + n.why + '</p>';
      } else detail.innerHTML = '<b>Your supply chain on the globe.</b><p>Drag to rotate, or pick a stop on the route.</p>';
    }
    function select(id, user) {
      if (user) touched = true;
      sel = id;
      if (id) { var n = byId[id]; tgt = { lon: n.lon, lat: clamp(n.lat, -55, 60), z: n.z }; } else tgt = { lon: OVER.lon, lat: OVER.lat, z: OVER.z };
      paintUi();
    }
    N.forEach(function (n, k) {
      var b = el('button', 'rt', '<i>' + (k + 1) + '</i>' + n.short); b.type = 'button'; b.dataset.id = n.id;
      b.addEventListener('click', function () { select(n.id, true); }); route.appendChild(b);
    });
    var ov = el('button', 'rt rt-o', 'Overview'); ov.type = 'button'; ov.addEventListener('click', function () { select(null, true); }); route.appendChild(ov);
    chips.forEach(function (c) { c.addEventListener('click', function () { touched = true; filter = c.dataset.tool; paintUi(); }); });

    /* ---- rotate by dragging (vertical page scroll still works on touch) ---- */
    cv.addEventListener('pointerdown', function (e) {
      var rc = cv.getBoundingClientRect(), mx0 = e.clientX - rc.left, my0 = e.clientY - rc.top;     /* taps have no prior hover */
      hover = null; Object.keys(pinPos).forEach(function (id) { var p = pinPos[id]; if (p && Math.hypot(p.x - mx0, p.y - my0) < 20) hover = id; });
      if (hover) { select(hover, true); return; }
      drag = { x: e.clientX, y: e.clientY, lon: tgt.lon, lat: tgt.lat }; touched = true; cv.setPointerCapture(e.pointerId); wrap.classList.add('grab');
    });
    cv.addEventListener('pointermove', function (e) {
      var r = cv.getBoundingClientRect(), mx = e.clientX - r.left, my = e.clientY - r.top;
      if (drag) {
        var R = base * cam.z; tgt.lon = drag.lon - (e.clientX - drag.x) / R / rad; tgt.lat = clamp(drag.lat + (e.clientY - drag.y) / R / rad, -70, 70); sel = null; paintUi();
        cam.lon = tgt.lon; cam.lat = tgt.lat; return;
      }
      hover = null;
      Object.keys(pinPos).forEach(function (id) { var p = pinPos[id]; if (p && Math.hypot(p.x - mx, p.y - my) < 14) hover = id; });
      cv.style.cursor = hover ? 'pointer' : '';
    });
    function end() { drag = null; wrap.classList.remove('grab'); }
    cv.addEventListener('pointerup', end); cv.addEventListener('pointercancel', end);

    /* ---- drawing ---- */
    function drawSet(set, R, c0, s0, cp0, sp0, bks, minZ) {
      var n = set.n, cl = set.cl, sl = set.sl, cL = set.cL, sL = set.sL;
      for (var k = 0; k < n; k++) {
        var cd = cL[k] * c0 + sL[k] * s0, z = sp0 * sl[k] + cp0 * cl[k] * cd;
        if (z < minZ) continue;
        var x = cx + R * cl[k] * (sL[k] * c0 - cL[k] * s0), y = cy - R * (cp0 * sl[k] - sp0 * cl[k] * cd);
        if (x < -6 || x > W + 6 || y < -6 || y > H + 6) continue;
        var p = bks[z < 0.3 ? 0 : (z < 0.65 ? 1 : 2)], rr = bks.r; p.moveTo(x + rr, y); p.arc(x, y, rr, 0, TAU);
      }
    }
    function mkBks(r) { return { 0: new Path2D(), 1: new Path2D(), 2: new Path2D(), r: r }; }
    function fillBks(b, a0, a1, a2) { ctx.fillStyle = 'rgba(255,255,255,' + a0 + ')'; ctx.fill(b[0]); ctx.fillStyle = 'rgba(255,255,255,' + a1 + ')'; ctx.fill(b[1]); ctx.fillStyle = 'rgba(255,255,255,' + a2 + ')'; ctx.fill(b[2]); }
    function project(pl, f, c0, s0, cp0, sp0, R) {
      var cd = pl.cL * c0 + pl.sL * s0, z = f * (sp0 * pl.sl + cp0 * pl.cl * cd);
      return { x: cx + R * f * pl.cl * (pl.sL * c0 - pl.cL * s0), y: cy - R * f * (cp0 * pl.sl - sp0 * pl.cl * cd), z: z };
    }
    function halo(txt, x, y, col, align) {
      ctx.textAlign = align || 'left'; ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(14,16,19,0.9)'; ctx.strokeText(txt, x, y); ctx.fillStyle = col; ctx.fillText(txt, x, y);
    }

    function frame(t) {
      requestAnimationFrame(frame);
      if (!visible || !W) { last = t; return; }
      var dt = Math.min(0.05, (t - last) / 1000); last = t;
      var k = reduce ? 1 : 1 - Math.exp(-dt * 3.2), dl = ((tgt.lon - cam.lon + 540) % 360) - 180;
      cam.lon += dl * k; cam.lat += (tgt.lat - cam.lat) * k; cam.z += (tgt.z - cam.z) * k;
      var R = base * cam.z, c0 = Math.cos(cam.lon * rad), s0 = Math.sin(cam.lon * rad), cp0 = Math.cos(cam.lat * rad), sp0 = Math.sin(cam.lat * rad);
      ctx.clearRect(0, 0, W, H);
      var g = ctx.createRadialGradient(cx - R * 0.3, cy - R * 0.35, R * 0.1, cx, cy, R); g.addColorStop(0, '#1d2127'); g.addColorStop(1, '#0f1114');
      ctx.beginPath(); ctx.arc(cx, cy, R, 0, TAU); ctx.fillStyle = g; ctx.fill(); ctx.lineWidth = 1; ctx.strokeStyle = 'rgba(255,255,255,0.18)'; ctx.stroke();

      var rr = clamp(0.8 + cam.z * 0.16, 0.9, 2.1), b1 = mkBks(rr);
      drawSet(REST, R, c0, s0, cp0, sp0, b1, 0.02); fillBks(b1, 0.12, 0.3, 0.5);
      Object.keys(HI).forEach(function (kk) {
        var b2 = mkBks(clamp(STEP[kk] * R * rad * 0.3, 0.7, 2.1));
        drawSet(HI[kk], R, c0, s0, cp0, sp0, b2, 0.02); fillBks(b2, 0.55, 0.8, 1);
      });

      ctx.font = '600 9px "IBM Plex Mono",monospace'; ctx.textBaseline = 'middle';
      if (cam.z < 3.2) CLABEL.forEach(function (cl) {
        var la = cl[1] * rad, lo = cl[2] * rad, p = project({ cl: Math.cos(la), sl: Math.sin(la), cL: Math.cos(lo), sL: Math.sin(lo) }, 1, c0, s0, cp0, sp0, R);
        if (p.z > 0.25) halo(cl[0], p.x, p.y, 'rgba(255,255,255,0.55)', 'center');
      });

      /* arcs */
      LEGS.forEach(function (l, li) {
        var on = filter === 'all' ? !!l[2] : l[2] === filter, a = byId[l[0]], b = byId[l[1]], vis = filter === 'all' || on;
        ctx.lineWidth = on ? 2 : 1.2; ctx.strokeStyle = on ? ORANGE : 'rgba(255,255,255,' + (vis ? 0.55 : 0.2) + ')'; ctx.setLineDash(l[3] ? [3, 5] : []);
        var drawing = false, path = [];
        ctx.beginPath();
        l.pts.forEach(function (pl) {
          var p = project(pl, pl.f, c0, s0, cp0, sp0, R), ok = p.z > 0 || Math.hypot(p.x - cx, p.y - cy) > R;
          path.push(ok ? p : null);
          if (ok) { if (!drawing) { ctx.moveTo(p.x, p.y); drawing = true; } else ctx.lineTo(p.x, p.y); } else drawing = false;
        });
        ctx.stroke(); ctx.setLineDash([]);
        if (!reduce) {                                    /* travelling packet */
          var u = ((t / 2600 + li * 0.17) % 1) * 40, i0 = Math.floor(u), p0 = path[i0], p1 = path[Math.min(40, i0 + 1)];
          if (p0 && p1) { var q = u - i0; ctx.beginPath(); ctx.arc(p0.x + (p1.x - p0.x) * q, p0.y + (p1.y - p0.y) * q, 3, 0, TAU); ctx.fillStyle = on ? '#fff' : ORANGE; ctx.fill(); }
        }
      });

      /* pins + labels */
      pinPos = {}; ctx.font = '600 10.5px Inter,sans-serif';
      N.forEach(function (n) {
        var la = n.lat * rad, lo = n.lon * rad, p = project({ cl: Math.cos(la), sl: Math.sin(la), cL: Math.cos(lo), sL: Math.sin(lo) }, 1, c0, s0, cp0, sp0, R);
        if (p.z < 0.06 || p.x < -10 || p.x > W + 10 || p.y < -10 || p.y > H + 10) return;
        pinPos[n.id] = p;
        var on = lit(n), isSel = n.id === sel;
        if (isSel) { var q = reduce ? 0.4 : (t / 1000) % 1; ctx.beginPath(); ctx.arc(p.x, p.y, 6 + q * 16, 0, TAU); ctx.strokeStyle = 'rgba(238,138,46,' + (0.8 * (1 - q)).toFixed(2) + ')'; ctx.lineWidth = 1.2; ctx.stroke(); }
        ctx.beginPath(); ctx.arc(p.x, p.y, isSel ? 6.5 : 5, 0, TAU); ctx.fillStyle = on ? ORANGE : 'rgba(255,255,255,0.85)'; ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = '#0E1013'; ctx.stroke();
        halo(isSel || n.id === hover ? n.n : n.short, p.x + 10, p.y, isSel || n.id === hover ? '#fff' : 'rgba(255,255,255,0.8)');
      });
    }
    size();
    if (window.ResizeObserver) new ResizeObserver(size).observe(wrap);
    onVisible(wrap, function (v) { visible = v; if (v) size(); }, 0.2);
    paintUi();
    select('mine', false); if (reduce) { cam = { lon: tgt.lon, lat: tgt.lat, z: tgt.z }; }
    requestAnimationFrame(frame);
    var order = N.map(function (n) { return n.id; }), oi = 0;
    autoplay(wrap, 4200, function () { oi = (oi + 1) % order.length; select(order[oi], false); }, function () { return touched; });
  })();

  /* ================================================================ 02 · world graph as a force-directed network */
  (function stage2() {
    var cv = $('#fg-cv'); if (!cv) return;
    var wrap = cv.parentNode, ctx = cv.getContext('2d'), TAU = Math.PI * 2;
    var detail = $('#g2-detail'), dotsBox = $('#g2-dots'), play = $('#g2-play'), chips = $$('#g2-chips .chip');
    var TYPE = { actor: 'Actor', tool: 'Statecraft tool', choke: 'Chokepoint', industry: 'Industry', co: 'Company' };

    /* hubs: id -> [label, type, description] */
    var HUB = {
      us: ['United States', 'actor', 'Uses all four tool families. Controls the dollar system and key chip technology.'],
      cn: ['China', 'actor', 'Dominates rare earth processing and battery supply. Uses licensing as a lever.'],
      eu: ['European Union', 'actor', 'Large market. Reacts with screening and trade-defence tools.'],
      jp: ['Japan', 'actor', 'Key supplier of chip materials and equipment. Aligns with US controls.'],
      kr: ['South Korea', 'actor', 'Battery cells and memory chips. Exposed to both US and Chinese measures.'],
      ru: ['Russia', 'actor', 'Energy and commodity supplier. Target of sanctions and asset freezes.'],
      in: ['India', 'actor', 'Fast-growing market and manufacturing base. Uses tariffs and local-content rules.'],
      gulf: ['Gulf states', 'actor', 'Energy exporters and growing financial hubs.'],
      tar: ['Tariffs', 'tool', 'Taxes on imports. The most common tool, and the fastest to change.'],
      exp: ['Export controls', 'tool', 'Licences for sensitive goods and technology. Can stop supply within weeks.'],
      san: ['Sanctions', 'tool', 'Restrictions on trade and dealings with named countries or firms.'],
      frz: ['Asset freezes', 'tool', 'Immobilise reserves and corporate assets abroad.'],
      scr: ['Investment screening', 'tool', 'Reviews and blocks foreign investment in sensitive sectors.'],
      sub: ['Subsidies & local content', 'tool', 'Industrial policy that shifts where production is competitive.'],
      chip: ['Advanced chips', 'choke', 'Design, tools and fabs are concentrated in a few countries.'],
      re: ['Rare earths & magnets', 'choke', 'Processing is concentrated in China.'],
      bat: ['Battery supply chain', 'choke', 'Cells, graphite and lithium run through a handful of countries.'],
      crit: ['Critical minerals', 'choke', 'Gallium, germanium, cobalt and more.'],
      fin: ['Financial rails', 'choke', 'Dollar clearing and payment messaging.'],
      shp: ['Shipping lanes', 'choke', 'Suez, Hormuz, Malacca and the Panama Canal.'],
      nrg: ['Energy', 'choke', 'Gas, oil and power grids.'],
      data: ['Data & cloud', 'choke', 'Cloud platforms, software and standards.'],
      auto: ['Automotive', 'industry', 'Depends on chips, magnets, batteries and open markets.'],
      mach: ['Machinery', 'industry', 'Depends on magnets, metals and export markets.'],
      chem: ['Chemicals', 'industry', 'Depends on energy and shipping.'],
      elec: ['Electronics', 'industry', 'Depends on chips and critical minerals.'],
      aero: ['Aerospace', 'industry', 'Depends on rare earths, titanium and export licences.'],
      pharma: ['Pharma', 'industry', 'Depends on chemical inputs and shipping.'],
      power: ['Energy equipment', 'industry', 'Depends on magnets, batteries and metals.'],
      agri: ['Agri-food', 'industry', 'Depends on energy, fertiliser and shipping.']
    };
    var HE = [
      ['us', 'tar'], ['us', 'exp'], ['us', 'san'], ['us', 'frz'], ['us', 'scr'], ['cn', 'tar'], ['cn', 'exp'], ['cn', 'scr'], ['cn', 'sub'], ['eu', 'tar'], ['eu', 'san'], ['eu', 'scr'], ['eu', 'sub'],
      ['jp', 'exp'], ['kr', 'sub'], ['ru', 'san'], ['ru', 'frz'], ['in', 'tar'], ['in', 'sub'], ['gulf', 'frz'],
      ['tar', 'bat'], ['tar', 'shp'], ['tar', 'auto'], ['exp', 'chip'], ['exp', 're'], ['exp', 'bat'], ['exp', 'crit'], ['san', 'fin'], ['san', 'nrg'], ['frz', 'fin'], ['scr', 'chip'], ['scr', 'data'], ['sub', 'bat'], ['sub', 'chip'],
      ['chip', 'auto'], ['chip', 'mach'], ['chip', 'elec'], ['chip', 'aero'], ['re', 'auto'], ['re', 'mach'], ['re', 'aero'], ['re', 'power'], ['bat', 'auto'], ['bat', 'power'], ['bat', 'elec'],
      ['crit', 'elec'], ['crit', 'aero'], ['crit', 'power'], ['fin', 'mach'], ['fin', 'chem'], ['fin', 'pharma'], ['shp', 'chem'], ['shp', 'mach'], ['shp', 'auto'], ['shp', 'agri'], ['nrg', 'chem'], ['nrg', 'agri'], ['nrg', 'mach'], ['data', 'elec'], ['data', 'pharma']
    ];

    /* ---- build nodes (hubs + generated company clusters) ---- */
    var seed = 11; function rnd() { seed = (seed * 1664525 + 1013904223) % 4294967296; return seed / 4294967296; }
    var nodes = [], idx = {}, edges = [];
    Object.keys(HUB).forEach(function (id) {
      var h = HUB[id], n = { id: id, label: h[0], type: h[1], d: h[2], x: (rnd() - 0.5) * 300, y: (rnd() - 0.5) * 240, vx: 0, vy: 0, deg: 0, hub: true };
      idx[id] = nodes.length; nodes.push(n);
    });
    HE.forEach(function (e) { edges.push([idx[e[0]], idx[e[1]]]); });
    var inds = ['auto', 'mach', 'chem', 'elec', 'aero', 'pharma', 'power', 'agri'], weights = [4, 3, 2, 3, 1.5, 1.2, 1.4, 1];
    function pickInd() { var s = 0, r = rnd() * weights.reduce(function (a, b) { return a + b; }, 0); for (var q = 0; q < inds.length; q++) { s += weights[q]; if (r <= s) return inds[q]; } return inds[0]; }
    for (var q = 0; q < 280; q++) {
      var ind = pickInd(), chokes = HE.filter(function (e) { return e[1] === ind && HUB[e[0]][1] === 'choke'; }).map(function (e) { return e[0]; });
      var n = { id: 'c' + q, label: HUB[ind][0] + ' supplier', type: 'co', ind: ind, d: '', x: (rnd() - 0.5) * 420, y: (rnd() - 0.5) * 340, vx: 0, vy: 0, deg: 0, hub: false, deps: [] };
      idx[n.id] = nodes.length; nodes.push(n);
      edges.push([idx[n.id], idx[ind]]);
      var nd = 1 + (rnd() < 0.55 ? 1 : 0) + (rnd() < 0.15 ? 1 : 0);
      for (var z = 0; z < nd && chokes.length; z++) { var c = chokes[Math.floor(rnd() * chokes.length)]; if (n.deps.indexOf(c) < 0) { n.deps.push(c); edges.push([idx[n.id], idx[c]]); } }
      if (rnd() < 0.3) { var a = ['us', 'cn', 'eu', 'jp', 'kr', 'in'][Math.floor(rnd() * 6)]; n.jur = a; edges.push([idx[n.id], idx[a]]); }
    }
    var adj = nodes.map(function () { return []; });
    edges.forEach(function (e) { adj[e[0]].push(e[1]); adj[e[1]].push(e[0]); nodes[e[0]].deg++; nodes[e[1]].deg++; });
    nodes.forEach(function (n) { n.r = n.hub ? 6 + Math.min(15, n.deg * 0.5) : 2.6; n.m = n.hub ? 1 + n.deg * 0.15 : 1; });

    /* ---- force simulation ---- */
    var alpha = 1;
    function tick() {
      var i, j, a, b, dx, dy, d2, f, n = nodes.length;
      for (i = 0; i < n; i++) {
        a = nodes[i];
        for (j = i + 1; j < n; j++) {
          b = nodes[j]; dx = a.x - b.x; dy = a.y - b.y; d2 = dx * dx + dy * dy + 0.5; if (d2 > 160000) continue;
          f = (a.hub && b.hub ? 6200 : (a.hub || b.hub ? 1100 : 300)) * alpha / d2; a.vx += dx * f / a.m; a.vy += dy * f / a.m; b.vx -= dx * f / b.m; b.vy -= dy * f / b.m;
        }
      }
      edges.forEach(function (e) {
        a = nodes[e[0]]; b = nodes[e[1]]; dx = b.x - a.x; dy = b.y - a.y; var d = Math.sqrt(dx * dx + dy * dy) + 0.01, L = a.hub && b.hub ? 120 : 46;
        f = (d - L) * 0.035 * alpha; a.vx += dx / d * f / a.m; a.vy += dy / d * f / a.m; b.vx -= dx / d * f / b.m; b.vy -= dy / d * f / b.m;
      });
      nodes.forEach(function (p) {
        p.vx -= p.x * 0.012 * alpha * (p.hub ? 1.6 : 1); p.vy -= p.y * 0.012 * alpha * (p.hub ? 1.6 : 1);
        if (p.fixed) { p.vx = p.vy = 0; return; }
        p.vx *= 0.82; p.vy *= 0.82; p.x += p.vx; p.y += p.vy;
      });
      alpha = Math.max(0, alpha * 0.985 - 0.0004);
    }
    for (var s = 0; s < 320; s++) tick();
    alpha = 0;

    /* ---- view ---- */
    var W = 0, H = 0, dpr = 1, sc = 1, ox = 0, oy = 0, visible = false, hover = -1, selId = null, typeF = null, step = -1, touched = false, drag = null, panning = null, moved = false;
    function fit() {
      var xs = nodes.map(function (p) { return p.x; }).sort(function (a, b) { return a - b; }), ys = nodes.map(function (p) { return p.y; }).sort(function (a, b) { return a - b; });
      var lo = Math.floor(nodes.length * 0.04), hi = Math.ceil(nodes.length * 0.96) - 1;
      var x0 = xs[lo], x1 = xs[hi], y0 = ys[lo], y1 = ys[hi];
      sc = Math.min((W - 60) / (x1 - x0 || 1), (H - 50) / (y1 - y0 || 1)); ox = W / 2 - (x0 + x1) / 2 * sc; oy = H / 2 - (y0 + y1) / 2 * sc;
    }
    function size() {
      dpr = Math.min(window.devicePixelRatio || 1, 2); var w = wrap.clientWidth, h = wrap.clientHeight; if (!w) return;
      var first = !W; W = w; H = h; cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr); ctx.setTransform(dpr, 0, 0, dpr, 0, 0); if (first) fit();
    }
    function sx(p) { return p.x * sc + ox; } function sy(p) { return p.y * sc + oy; }

    /* ---- highlighting ---- */
    var SEQ = [
      { t: 'US tightens export controls on advanced chips', n: 'us exp chip auto elec mach aero', note: 'Think tank pattern: controls usually widen in rounds, not in one step.' },
      { t: 'China answers with licensing on rare earths and magnets', n: 'cn exp re auto mach aero power', note: 'Think tank pattern: retaliation mirrors the tool, usually within weeks.' },
      { t: 'The EU adds screening and tariff measures', n: 'eu scr tar chip bat auto', note: 'Think tank pattern: Europe reacts with screening first, tariffs second.' },
      { t: 'When trade tools stall, finance follows', n: 'us san frz fin chem mach pharma', note: 'Think tank pattern: sanctions and asset freezes come after trade tools are exhausted.' }
    ];
    var focus = null;   /* {nodes:{id:1}, edgeSet:true} */
    function reach(id) {                         /* downstream through the hub graph, then the companies behind it */
      var seen = {}, q = [id]; seen[id] = 1;
      while (q.length) { var c = q.shift(); HE.forEach(function (e) { if (e[0] === c && !seen[e[1]]) { seen[e[1]] = 1; q.push(e[1]); } }); }
      nodes.forEach(function (n) { if (!n.hub && seen[n.ind]) seen[n.id] = 1; });
      return seen;
    }
    function recompute() {
      var set = null, text, note = '', p;
      if (selId) {
        var n = nodes[idx[selId]];
        if (n.hub) {
          set = reach(selId); var cnt = { tool: 0, choke: 0, industry: 0, co: 0 };
          Object.keys(set).forEach(function (k) { var t = nodes[idx[k]].type; if (cnt[t] != null && k !== selId) cnt[t]++; });
          text = '<b>' + n.label + '</b> <span class="tagx">' + TYPE[n.type] + '</span>';
          note = n.d + ' Downstream: ' + (cnt.tool ? cnt.tool + ' tools, ' : '') + (cnt.choke ? cnt.choke + ' chokepoints, ' : '') + (cnt.industry ? cnt.industry + ' industries, ' : '') + cnt.co + ' companies.';
        } else {
          set = {}; set[selId] = 1; adj[idx[selId]].forEach(function (j) { set[nodes[j].id] = 1; });
          text = '<b>' + n.label + '</b> <span class="tagx">Company cluster</span>';
          note = 'Depends on: ' + (n.deps.map(function (d) { return HUB[d][0]; }).join(', ') || 'no single chokepoint') + (n.jur ? '. Jurisdiction: ' + HUB[n.jur][0] : '') + '.';
        }
      } else if (step >= 0) {
        var s = SEQ[step]; set = {}; s.n.split(' ').forEach(function (k) { set[k] = 1; });
        text = '<b>Move ' + (step + 1) + ' of ' + SEQ.length + '</b> ' + s.t; note = s.note;
      } else if (typeF) {
        set = {}; nodes.forEach(function (n) { if (n.type === typeF) set[n.id] = 1; });
        text = '<b>' + TYPE[typeF] + 's</b>'; note = 'Click a hub to see everything it reaches.';
      } else { text = '<b>Hover, drag, click a hub.</b>'; note = 'Our think tank maintains this graph: who uses which tool, against which chokepoint, hitting which industry and which companies.'; }
      focus = set; detail.innerHTML = text + '<p>' + note + '</p>';
      chips.forEach(function (c) { c.classList.toggle('on', c.dataset.type === typeF); c.setAttribute('aria-pressed', c.dataset.type === typeF); });
      $$('.sdotb', dotsBox).forEach(function (d, i) { d.classList.toggle('on', !selId && !typeF && i === step); });
    }
    SEQ.forEach(function (s, i) {
      var b = el('button', 'sdotb'); b.type = 'button'; b.setAttribute('aria-label', 'Move ' + (i + 1) + ': ' + s.t);
      b.addEventListener('click', function () { touched = true; selId = null; typeF = null; step = i; recompute(); }); dotsBox.appendChild(b);
    });
    play.addEventListener('click', function () { touched = false; selId = null; typeF = null; step = 0; recompute(); });
    chips.forEach(function (c) { c.addEventListener('click', function () { touched = true; selId = null; step = -1; typeF = typeF === c.dataset.type ? null : c.dataset.type; recompute(); }); });
    $('#fg-in').addEventListener('click', function () { zoomAt(1.3, W / 2, H / 2); });
    $('#fg-out').addEventListener('click', function () { zoomAt(1 / 1.3, W / 2, H / 2); });
    $('#fg-fit').addEventListener('click', fit);
    function zoomAt(k, x, y) { ox = x - (x - ox) * k; oy = y - (y - oy) * k; sc *= k; }

    /* ---- pointer interaction ---- */
    function pick(mx, my) {
      var best = -1, bd = 1e9;
      nodes.forEach(function (p, i) { var d = Math.hypot(sx(p) - mx, sy(p) - my), lim = Math.max(8, p.r * Math.max(1, sc) + 3); if (d < lim && d < bd) { bd = d; best = i; } });
      return best;
    }
    cv.addEventListener('pointerdown', function (e) {
      var r = cv.getBoundingClientRect(), mx = e.clientX - r.left, my = e.clientY - r.top, i = pick(mx, my); moved = false; cv.setPointerCapture(e.pointerId);
      if (i >= 0) { drag = i; nodes[i].fixed = true; } else panning = { x: e.clientX, y: e.clientY, ox: ox, oy: oy };
    });
    cv.addEventListener('pointermove', function (e) {
      var r = cv.getBoundingClientRect(), mx = e.clientX - r.left, my = e.clientY - r.top;
      if (drag != null) { moved = true; nodes[drag].x = (mx - ox) / sc; nodes[drag].y = (my - oy) / sc; alpha = Math.max(alpha, 0.25); return; }
      if (panning) { moved = true; ox = panning.ox + e.clientX - panning.x; oy = panning.oy + e.clientY - panning.y; return; }
      hover = pick(mx, my); cv.style.cursor = hover >= 0 ? 'pointer' : 'grab';
    });
    function up() {
      if (drag != null) { nodes[drag].fixed = false; if (!moved) { touched = true; step = -1; typeF = null; selId = nodes[drag].id === selId ? null : nodes[drag].id; recompute(); } }
      else if (panning && !moved && selId) { selId = null; recompute(); }
      drag = null; panning = null;
    }
    cv.addEventListener('pointerup', up); cv.addEventListener('pointercancel', up);
    cv.addEventListener('pointerleave', function () { hover = -1; });
    cv.addEventListener('wheel', function (e) { if (e.ctrlKey || e.metaKey) { e.preventDefault(); var r = cv.getBoundingClientRect(); zoomAt(e.deltaY < 0 ? 1.12 : 1 / 1.12, e.clientX - r.left, e.clientY - r.top); } }, { passive: false });

    /* ---- render ---- */
    function halo(txt, x, y, col) { ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(14,16,19,0.92)'; ctx.strokeText(txt, x, y); ctx.fillStyle = col; ctx.fillText(txt, x, y); }
    var HOVN = null;
    function draw() {
      ctx.clearRect(0, 0, W, H);
      var hset = null;
      if (hover >= 0 && !drag) { hset = {}; hset[nodes[hover].id] = 1; adj[hover].forEach(function (j) { hset[nodes[j].id] = 1; }); }
      var set = hset || focus, any = !!set;
      /* edges */
      ctx.lineWidth = 0.7;
      var dim = new Path2D(), lite = new Path2D(), hot = new Path2D();
      edges.forEach(function (e) {
        var a = nodes[e[0]], b = nodes[e[1]], inA = set && set[a.id] && set[b.id], p = inA ? (a.hub && b.hub ? hot : lite) : dim;
        p.moveTo(sx(a), sy(a)); p.lineTo(sx(b), sy(b));
      });
      ctx.strokeStyle = any ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.17)'; ctx.stroke(dim);
      ctx.strokeStyle = 'rgba(255,255,255,0.45)'; ctx.stroke(lite);
      ctx.lineWidth = 1.8; ctx.strokeStyle = ORANGE; ctx.stroke(hot);
      /* nodes: companies first, hubs on top */
      for (var pass = 0; pass < 2; pass++) nodes.forEach(function (n, i) {
        if (n.hub !== (pass === 1)) return;
        var x = sx(n), y = sy(n), on = !any || set[n.id], r = n.r * Math.max(0.7, Math.min(1.5, sc * 0.9)), isSel = n.id === selId;
        ctx.globalAlpha = on ? 1 : 0.14;
        if (!n.hub) { ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fillStyle = on && any ? '#fff' : 'rgba(255,255,255,0.45)'; ctx.fill(); }
        else {
          var col = n.type === 'tool' ? ORANGE : '#fff';
          ctx.fillStyle = col; ctx.strokeStyle = '#0E1013'; ctx.lineWidth = 1.5;
          if (n.type === 'actor') { ctx.fillRect(x - r, y - r, r * 2, r * 2); }
          else if (n.type === 'tool') { ctx.beginPath(); ctx.moveTo(x, y - r * 1.15); ctx.lineTo(x + r * 1.15, y); ctx.lineTo(x, y + r * 1.15); ctx.lineTo(x - r * 1.15, y); ctx.closePath(); ctx.fill(); }
          else if (n.type === 'choke') { ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fillStyle = '#0E1013'; ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = '#fff'; ctx.stroke(); }
          else { ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill(); }
          if (isSel) { ctx.beginPath(); ctx.arc(x, y, r + 5, 0, TAU); ctx.lineWidth = 1.5; ctx.strokeStyle = '#fff'; ctx.stroke(); }
        }
        ctx.globalAlpha = 1;
      });
      /* labels */
      ctx.font = '600 10.5px Inter,sans-serif'; ctx.textBaseline = 'middle'; ctx.textAlign = 'left';
      nodes.forEach(function (n, i) {
        var on = !any || set[n.id]; if (!n.hub && i !== hover && n.id !== selId) return; if (!on && i !== hover) return;
        var x = sx(n), y = sy(n), r = n.r * Math.max(0.7, Math.min(1.5, sc * 0.9));
        halo(n.label, x + r + 5, y, n.type === 'tool' ? ORANGE : '#fff');
      });
    }
    var last = 0;
    function frame(t) {
      requestAnimationFrame(frame);
      if (!visible || !W) return;
      if (alpha > 0.002) { tick(); tick(); }
      draw();
    }
    size();
    if (window.ResizeObserver) new ResizeObserver(size).observe(wrap);
    onVisible(wrap, function (v) { visible = v; }, 0.15);
    step = 0; recompute();
    requestAnimationFrame(frame);
    autoplay(wrap, 3800, function () { selId = null; typeF = null; step = (step + 1) % SEQ.length; recompute(); }, function () { return touched; });
    if (reduce) { step = 1; recompute(); }
  })();

  /* ================================================================ 03 · scenario trees */
  (function stage3() {
    var root = $('#g3'); if (!root) return;
    var TREES = {
      mag: { name: 'Rare earth magnets', root: 'China restricts magnet exports', sc: [
        { n: 'Managed friction', p: 55, imp: '€20m', leaves: [['sign', 'General licences issued'], ['act', 'Monitor lead times']] },
        { n: 'Targeted escalation', p: 35, imp: '€120m', leaves: [['sign', 'Licence delays at Tier 2'], ['sign', 'Countermeasure threats'], ['act', 'Qualify backup supplier']] },
        { n: 'Broad embargo', p: 10, imp: '€600m', leaves: [['sign', 'Embargo language in official statements'], ['act', 'Stockpile and redesign']] }] },
      bat: { name: 'Battery cells', root: 'Battery supply chain restricted', sc: [
        { n: 'Tariff tweaks', p: 50, imp: '€30m', leaves: [['sign', 'Tariff consultations open'], ['act', 'Pass through pricing']] },
        { n: 'Targeted controls', p: 38, imp: '€150m', leaves: [['sign', 'Draft control list published'], ['act', 'Dual-source cells']] },
        { n: 'Broad restrictions', p: 12, imp: '€500m', leaves: [['sign', 'Licensing for graphite and lithium'], ['act', 'Move cell assembly closer']] }] },
      tar: { name: 'US tariffs', root: 'US raises tariffs on EU cars', sc: [
        { n: 'Negotiated settlement', p: 45, imp: '€15m', leaves: [['sign', 'Trade talks scheduled'], ['act', 'Hold pricing']] },
        { n: 'Targeted tariff rise', p: 40, imp: '€90m', leaves: [['sign', 'Tariff list names car parts'], ['act', 'Shift allocation to US plant']] },
        { n: 'Broad escalation', p: 15, imp: '€400m', leaves: [['sign', 'EU retaliation announced'], ['act', 'Local-for-local production']] }] }
    };
    var keys = ['mag', 'bat', 'tar'], cur = 'mag', touched = false, g, detail = $('#g3-detail'), tabs = $$('#g3-chips .chip'), merge = $('#merge');

    function build(key) {
      var t = TREES[key], edges = [], scNodes = [], leafNodes = [];
      t.sc.forEach(function (s, i) {
        scNodes.push({ id: 's' + i, label: '<b>' + s.p + '%</b> ' + s.n, sub: 'Impact ' + s.imp, kind: 'sc' });
        edges.push(['r', 's' + i]);
        s.leaves.forEach(function (l, j) {
          var lid = 'l' + i + '_' + j;
          leafNodes.push({ id: lid, label: l[1], sub: l[0] === 'sign' ? 'Warning sign' : 'Response', kind: l[0] });
          edges.push(['s' + i, lid]);
        });
      });
      g = colGraph(root, { cols: [{ title: 'Risk', nodes: [{ id: 'r', label: t.root, kind: 'root' }] }, { title: 'Scenarios', nodes: scNodes }, { title: 'Warning signs & responses', nodes: leafNodes }], edges: edges });
      root.classList.remove('cg-anim'); void root.offsetWidth; if (!reduce) root.classList.add('cg-anim');
      t.sc.forEach(function (s, i) {
        var n = g.nodes['s' + i].el;
        function on() { focus(i); } function off() { focus(-1); }
        n.addEventListener('mouseenter', on); n.addEventListener('focus', on); n.addEventListener('mouseleave', off); n.addEventListener('blur', off);
      });
      focus(-1);
    }
    function focus(i) {
      var t = TREES[cur];
      Object.keys(g.nodes).forEach(function (id) {
        var m = /^l(\d+)_/.exec(id), mine = id === 'r' || id === 's' + i || (m && +m[1] === i);
        g.nodes[id].el.classList.toggle('dim', i >= 0 && !mine); g.nodes[id].el.classList.toggle('lit', i >= 0 && mine && id !== 'r');
      });
      g.edges.forEach(function (e) { var mine = i >= 0 && (e.b === 's' + i || e.a === 's' + i); e.el.classList.toggle('lit', mine); e.el.classList.toggle('dim', i >= 0 && !mine); });
      if (i < 0) detail.innerHTML = '<b>' + t.name + '</b><p>One tree per risk: scenarios with expert starting probabilities, the warning signs that point to each, and the response to prepare.</p>';
      else { var s = t.sc[i]; detail.innerHTML = '<b>' + s.n + '</b> <span class="tagx">Starting probability ' + s.p + '%</span> <span class="tagx hot">Impact ' + s.imp + '</span><p>' + s.leaves.map(function (l) { return (l[0] === 'sign' ? 'Watch: ' : 'Prepare: ') + l[1]; }).join(' · ') + '</p>'; }
    }
    function select(key) {
      cur = key;
      tabs.forEach(function (c) { c.classList.toggle('on', c.dataset.risk === key); c.setAttribute('aria-pressed', c.dataset.risk === key); });
      build(key);
    }
    tabs.forEach(function (c) { c.addEventListener('click', function () { touched = true; select(c.dataset.risk); }); });
    select('mag');
    onVisible(merge, function (v) { if (v) merge.classList.add('go'); }, 0.4);
    autoplay(root, 7000, function () { select(keys[(keys.indexOf(cur) + 1) % keys.length]); }, function () { return touched; });
  })();

  /* ================================================================ 04 · signals -> world model -> client silos */
  (function stage4() {
    var box = $('#flow4'); if (!box) return;
    var svg = $('#f4-svg'), core = $('#core'), src = $$('.src', box), silos = $$('.silo', box), detail = $('#g4-detail');
    /* signal i: affected silos */
    var SIG = [
      { to: [0, 1], t: 'China adds export licensing for magnet technology', src: 'Official journals' },
      { to: [0], t: 'EU imports of battery cells fall month on month', src: 'Customs & trade data' },
      { to: [0, 2], t: 'US announces new chip tool restrictions', src: 'News in many languages' },
      { to: [2], t: 'Analyst note: gas supply rules tighten', src: 'Think tank analysts' },
      { to: [1, 2], t: 'Freight rates spike on the Asia–Europe lane', src: 'Market data' }
    ];
    var counts = [0, 0, 0], touched = false, tokens = [], running = false, edgeEls = [];

    function pt(node, side) {
      var r = box.getBoundingClientRect(), b = node.getBoundingClientRect();
      return { x: (side === 'r' ? b.right : b.left) - r.left, y: b.top + b.height / 2 - r.top };
    }
    function curve(a, b) { var dx = Math.abs(b.x - a.x) * 0.5; return { a: a, c1: { x: a.x + dx, y: a.y }, c2: { x: b.x - dx, y: b.y }, b: b }; }
    function bez(c, t) {
      var u = 1 - t;
      return { x: u * u * u * c.a.x + 3 * u * u * t * c.c1.x + 3 * u * t * t * c.c2.x + t * t * t * c.b.x, y: u * u * u * c.a.y + 3 * u * u * t * c.c1.y + 3 * u * t * t * c.c2.y + t * t * t * c.b.y };
    }
    function dstr(c) { return 'M' + c.a.x + ' ' + c.a.y + ' C' + c.c1.x + ' ' + c.c1.y + ',' + c.c2.x + ' ' + c.c2.y + ',' + c.b.x + ' ' + c.b.y; }
    function layout() {
      var r = box.getBoundingClientRect(); if (!r.width) return;
      svg.setAttribute('width', r.width); svg.setAttribute('height', r.height);
      svg.innerHTML = ''; edgeEls = [];
      src.forEach(function (s, i) { var p = svgEl('path', { 'class': 'cg-edge', d: dstr(curve(pt(s, 'r'), pt(core, 'l'))) }, svg); edgeEls.push({ k: 's' + i, el: p }); });
      silos.forEach(function (s, i) { var p = svgEl('path', { 'class': 'cg-edge', d: dstr(curve(pt(core, 'r'), pt(s, 'l'))) }, svg); edgeEls.push({ k: 'c' + i, el: p }); });
      tokens.forEach(function (t) { svg.appendChild(t.dot); });
    }
    function flash(k) { edgeEls.forEach(function (e) { if (e.k === k) { e.el.classList.add('lit'); setTimeout(function () { e.el.classList.remove('lit'); }, 1500); } }); }
    function addToken(from, to, dur, done) {
      var dot = svgEl('circle', { r: 4.5, fill: ORANGE }, svg);
      tokens.push({ c: curve(from, to), t0: performance.now(), dur: dur, done: done, dot: dot });
      if (!running) { running = true; requestAnimationFrame(tick); }
    }
    function tick(now) {
      for (var i = tokens.length - 1; i >= 0; i--) {
        var t = tokens[i], k = clamp((now - t.t0) / t.dur, 0, 1), p = bez(t.c, ease(k));
        t.dot.setAttribute('cx', p.x); t.dot.setAttribute('cy', p.y);
        if (k >= 1) { tokens.splice(i, 1); if (t.dot.parentNode) t.dot.parentNode.removeChild(t.dot); if (t.done) t.done(); }
      }
      if (tokens.length) requestAnimationFrame(tick); else running = false;
    }
    function arrive(si, sigI) {
      var s = silos[si]; counts[si]++;
      var list = $('.silo-q', s), item = el('div', 'silo-i', SIG[sigI].t); list.insertBefore(item, list.firstChild);
      while (list.children.length > 2) list.removeChild(list.lastChild);
      $('.silo-n', s).textContent = counts[si]; s.classList.add('hit'); setTimeout(function () { s.classList.remove('hit'); }, 1100);
    }
    function emit(i) {
      var S = SIG[i];
      src.forEach(function (b, k) { b.classList.toggle('on', k === i); });
      detail.innerHTML = '<b>' + S.t + '</b><p>Source: ' + S.src + '. Matched against each client\'s company graph: ' +
        silos.map(function (s, k) { return s.dataset.name + (S.to.indexOf(k) >= 0 ? ' (relevant)' : ' (not relevant)'); }).join(' · ') + '.</p>';
      flash('s' + i);
      if (reduce || document.hidden) { S.to.forEach(function (k) { arrive(k, i); }); return; }
      addToken(pt(src[i], 'r'), pt(core, 'l'), 800, function () {
        core.classList.add('pulse'); setTimeout(function () { core.classList.remove('pulse'); }, 700);
        silos.forEach(function (s, k) {
          if (S.to.indexOf(k) >= 0) { flash('c' + k); addToken(pt(core, 'r'), pt(s, 'l'), 850, function () { arrive(k, i); }); }
          else { s.classList.add('skip'); setTimeout(function () { s.classList.remove('skip'); }, 1100); }
        });
      });
    }
    var cur = -1;
    src.forEach(function (b, i) { b.addEventListener('click', function () { touched = true; cur = i; emit(i); }); });
    layout();
    if (window.ResizeObserver) new ResizeObserver(layout).observe(box);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(layout);
    detail.innerHTML = '<b>Click a signal.</b><p>Sources feed one shared world model. Each signal only reaches the clients whose company graph it touches. Every client sits in its own private silo.</p>';
    autoplay(box, 3300, function () { cur = (cur + 1) % SIG.length; emit(cur); }, function () { return touched; });
  })();

  /* ================================================================ 05 · Bayesian update of the scenario graph */
  (function stage5() {
    var box = $('#bay'); if (!box) return;
    var PRI = [0.55, 0.35, 0.10], IMP = [20, 120, 600];
    var SIGS = [
      { L: [0.20, 0.70, 0.90], tag: 'Escalates' },
      { L: [0.30, 0.60, 0.80], tag: 'Escalates' },
      { L: [0.15, 0.50, 0.85], tag: 'Escalates' },
      { L: [0.70, 0.30, 0.10], tag: 'Eases' }
    ];
    var sigBtns = $$('.bsig', box), scEls = $$('.bsc', box), svg = $('#bay-svg'), conf = $('#bay-conf'), confV = $('#bay-conf-v');
    var elEl = $('#bay-el'), pbEl = $('#bay-pb'), work = $('#bay-work'), workBtn = $('#bay-work-toggle');
    var state = { on: [], conf: 100 }, touched = false, visible = false, didAuto = false, edges = [];
    elEl._v = 113; pbEl._v = 45; scEls.forEach(function (s, i) { s._v = PRI[i] * 100; });

    function calc(on, c100) {
      var c = c100 / 100, p = PRI.slice(), hist = [p.slice()];
      on.forEach(function (k) {
        var L = SIGS[k].L, m = (L[0] + L[1] + L[2]) / 3, s = 0, i;
        for (i = 0; i < 3; i++) { p[i] *= c * L[i] + (1 - c) * m; s += p[i]; }
        for (i = 0; i < 3; i++) p[i] /= s;
        hist.push(p.slice());
      });
      return { p: p, hist: hist, el: p[0] * IMP[0] + p[1] * IMP[1] + p[2] * IMP[2] };
    }
    function sizeOf(p) { return 34 + 88 * p; }

    function mkEdges() {
      var r = box.getBoundingClientRect(); if (!r.width) return;
      svg.setAttribute('width', r.width); svg.setAttribute('height', r.height); svg.innerHTML = ''; edges = [];
      sigBtns.forEach(function (b, i) {
        var A = b.getBoundingClientRect();
        scEls.forEach(function (s, j) {
          var B = $('.bsc-c', s).getBoundingClientRect();
          var x1 = A.right - r.left, y1 = A.top + A.height / 2 - r.top, x2 = B.left + B.width / 2 - r.left, y2 = B.top + B.height / 2 - r.top;
          var dx = Math.abs(x2 - x1) * 0.5;
          var p = svgEl('path', { 'class': 'cg-edge bay-e', d: 'M' + x1 + ' ' + y1 + ' C' + (x1 + dx) + ' ' + y1 + ',' + (x2 - dx) + ' ' + y2 + ',' + x2 + ' ' + y2 }, svg);
          edges.push({ i: i, j: j, el: p });
        });
      });
      paintEdges();
    }
    function paintEdges() {
      edges.forEach(function (e) {
        var on = state.on.indexOf(e.i) >= 0, L = SIGS[e.i].L[e.j];
        e.el.classList.toggle('lit', on); e.el.style.strokeWidth = on ? (0.6 + 5 * L).toFixed(2) : '';
        e.el.classList.toggle('eases', on && SIGS[e.i].tag === 'Eases');
      });
    }

    function renderWork(r) {
      var c = state.conf / 100, on = state.on, names = ['A', 'B', 'C'], i, j, h;
      h = '<div class="w-formula">posterior ∝ prior × Π ( c·L + (1−c)·m ) &nbsp;·&nbsp; c = ' + c.toFixed(2) + '</div>';
      h += '<div class="w-scroll"><table class="w-table"><thead><tr><th>Scenario</th><th>Prior</th>';
      on.forEach(function (k) { h += '<th>S' + (k + 1) + '</th>'; });
      h += '<th>Posterior</th><th>× Impact</th></tr></thead><tbody>';
      for (i = 0; i < 3; i++) {
        h += '<tr><td>' + names[i] + '</td><td>' + Math.round(PRI[i] * 100) + '%</td>';
        on.forEach(function (k) { var L = SIGS[k].L, m = (L[0] + L[1] + L[2]) / 3; h += '<td>' + (c * L[i] + (1 - c) * m).toFixed(2) + '</td>'; });
        h += '<td class="w-em">' + (r.p[i] * 100).toFixed(1) + '%</td><td>' + fmtL(r.p[i] * IMP[i]) + '</td></tr>';
      }
      h += '</tbody><tfoot><tr><td colspan="' + (on.length + 3) + '">Expected loss</td><td class="w-em">' + fmtL(r.el) + '</td></tr></tfoot></table></div>';
      if (on.length) {
        h += '<div class="w-trace"><div class="w-trace-h">Why did it move?</div>';
        for (j = 1; j < r.hist.length; j++) {
          var a = r.hist[j - 1], b = r.hist[j];
          h += '<div class="w-line"><b>S' + (on[j - 1] + 1) + '</b> A ' + sign((b[0] - a[0]) * 100, 1) + ' · B ' + sign((b[1] - a[1]) * 100, 1) + ' · C ' + sign((b[2] - a[2]) * 100, 1) + ' pts</div>';
        }
        h += '</div>';
      } else h += '<div class="w-empty">Select a signal to see the update, step by step.</div>';
      work.innerHTML = h;
    }

    function render() {
      var r = calc(state.on, state.conf), pb = (r.p[1] + r.p[2]) * 100;
      scEls.forEach(function (s, i) {
        var c = $('.bsc-c', s), pr = $('.bsc-p', s);
        c.style.width = c.style.height = sizeOf(r.p[i]) + 'px'; pr.style.width = pr.style.height = sizeOf(PRI[i]) + 'px';
        tween($('b', c), s._v, r.p[i] * 100, 350, fmtPct); s._v = r.p[i] * 100;
      });
      tween(elEl, elEl._v, r.el, 350, fmtL); tween(pbEl, pbEl._v, pb, 350, fmtPct);
      sigBtns.forEach(function (b, k) { var on = state.on.indexOf(k) >= 0; b.classList.toggle('on', on); b.setAttribute('aria-checked', on ? 'true' : 'false'); });
      confV.textContent = state.conf + '%';
      paintEdges();
      if (!work.hidden) renderWork(r);
      document.dispatchEvent(new CustomEvent('vorsight:escalation', { detail: { p: pb } }));
    }
    function toggle(k, auto) {
      if (!auto) touched = true;
      var ix = state.on.indexOf(k); if (ix >= 0) state.on.splice(ix, 1); else state.on.push(k);
      render();
    }
    sigBtns.forEach(function (b, k) { b.addEventListener('click', function () { toggle(k); }); });
    conf.addEventListener('input', function () { touched = true; state.conf = +conf.value; render(); });
    $('#bay-reset').addEventListener('click', function () { touched = true; state.on = []; state.conf = 100; conf.value = 100; render(); });
    workBtn.addEventListener('click', function () {
      work.hidden = !work.hidden; workBtn.setAttribute('aria-expanded', work.hidden ? 'false' : 'true');
      workBtn.textContent = work.hidden ? 'Show the working' : 'Hide the working';
      if (!work.hidden) renderWork(calc(state.on, state.conf));
    });
    document.addEventListener('keydown', function (e) {
      if (e.metaKey || e.ctrlKey || e.altKey || e.key.length !== 1) return;
      var k = '1234'.indexOf(e.key); if (k < 0 || !visible) return;
      var t = e.target; if (t && /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName) && t.type !== 'range') return;
      toggle(k);
    });
    mkEdges();
    if (window.ResizeObserver) new ResizeObserver(mkEdges).observe(box);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { mkEdges(); });
    render();
    onVisible(box, function (v) {
      visible = v;
      if (v && !touched && !didAuto && !reduce) { didAuto = true; setTimeout(function () { if (!touched) toggle(0, true); }, 1300); }
    }, 0.4);
  })();

  /* ================================================================ 06 · alerts */
  (function stage6() {
    var box = $('#rk'); if (!box) return;
    var HEDGE = 50, ACT = 70;
    var R = [
      { n: 'Rare earth magnets', p: 45, hedge: 'Consider a hedge: extend magnet inventory cover and lock in forward contracts.', act: 'Act: trigger the playbook. Qualify a backup supplier in Japan and build 3 months of buffer stock.' },
      { n: 'Battery cells', p: 50, hedge: 'Consider a hedge: pre-negotiate a second cell source.', act: 'Act: switch part of the cell volume to a non-China source.' },
      { n: 'US tariffs', p: 55, hedge: 'Consider a hedge: cover USD exposure and review pricing clauses.', act: 'Act: move US-bound volume to the US plant allocation.' }
    ];
    var rows = $$('.rk-row', box), feed = $('#alerts'), touched = false, shown = {};
    function status(p) { return p >= ACT ? 'act' : (p >= HEDGE ? 'hedge' : 'monitor'); }
    var LBL = { act: 'ACT', hedge: 'CONSIDER HEDGE', monitor: 'MONITOR' };

    function paint() {
      var cards = [];
      rows.forEach(function (row, i) {
        var r = R[i], st = status(r.p), key = i + st;
        $('input', row).value = r.p; $('.rk-p', row).textContent = Math.round(r.p) + '%';
        var chip = $('.rk-st', row); chip.textContent = LBL[st]; chip.className = 'rk-st ' + st;
        if (st !== 'monitor') cards.push({ st: st, key: key, txt: r[st], n: r.n, p: r.p });
      });
      cards.sort(function (a, b) { return (b.st === 'act') - (a.st === 'act') || b.p - a.p; });
      feed.innerHTML = '';
      if (!cards.length) feed.appendChild(el('div', 'al0', 'No alerts. Every risk is below its threshold.'));
      cards.forEach(function (c) {
        var fresh = !shown[c.key];
        feed.appendChild(el('div', 'al ' + c.st + (fresh ? ' fresh' : ''), '<span class="al-t">' + (c.st === 'act' ? 'ACT' : 'HEDGE') + '</span><b>' + c.n + ' · ' + Math.round(c.p) + '% escalation or worse</b><span>' + c.txt + '</span>'));
      });
      shown = {}; cards.forEach(function (c) { shown[c.key] = 1; });
    }
    rows.forEach(function (row, i) {
      $('input', row).addEventListener('input', function (e) { touched = true; R[i].p = +e.target.value; paint(); });
    });
    /* row 1 follows the Bayesian graph in step 05 */
    document.addEventListener('vorsight:escalation', function (e) {
      R[0].p = e.detail.p; $('input', rows[0]).disabled = true; paint();
    });
    paint();
    /* demo: sweep the last slider up and down until the user takes over */
    var dir = 1;
    autoplay(box, 900, function () { var r = R[2]; r.p += dir * 5; if (r.p >= 85) dir = -1; if (r.p <= 35) dir = 1; paint(); }, function () { return touched; });
  })();

  /* ================================================================ getting started timeline */
  (function () {
    var tl = $('#start-line'); if (!tl) return;
    onVisible(tl, function (v) { if (v) tl.classList.add('go'); }, 0.4);
  })();
})();
