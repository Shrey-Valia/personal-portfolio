/* ═══════════════════════════════════════════════════════════
   The field
   One set of monomers, six topologies. Whichever section you
   are reading, the field re-forms into a figure that actually
   depicts that subject: a polymer chain for the molecular
   work, a denoising grid for diffusion, an agent graph for
   Vincio, an equity curve for the trading agent, a timeline
   for the record, a lattice for the toolkit.

   Everything is drawn in 3D and projected with perspective,
   back to front. Scroll drives rotation, scale and drift.
   Node colour is viridis, indexed along each figure.
   ═══════════════════════════════════════════════════════════ */

(function () {
  'use strict';

  var canvas = document.getElementById('sim');
  var readout = document.getElementById('readout');
  if (!canvas || !canvas.getContext) return;

  var ctx = canvas.getContext('2d');
  var reducedQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
  var reduced = reducedQuery.matches;

  var N = 38;                 // constant, so figures can morph one-to-one
  var VIRIDIS = [[68,1,84],[59,82,139],[33,144,140],[93,200,99],[253,231,37]];

  function viridis(k) {
    k = k < 0 ? 0 : k > 1 ? 1 : k;
    var s = k * (VIRIDIS.length - 1);
    var i = Math.min(Math.floor(s), VIRIDIS.length - 2);
    var f = s - i, a = VIRIDIS[i], b = VIRIDIS[i + 1];
    return [Math.round(a[0]+(b[0]-a[0])*f), Math.round(a[1]+(b[1]-a[1])*f),
            Math.round(a[2]+(b[2]-a[2])*f)];
  }

  function easeOutCubic(t) { var u = 1 - t; return 1 - u*u*u; }
  function easeInOut(t) { return t < 0.5 ? 4*t*t*t : 1 - Math.pow(-2*t+2, 3)/2; }

  /* accent tracks the section the figure belongs to, so the readout
     matches the heading beside it */
  var FIGURES = {
    chain:     { id: 'Fig. 1', name: 'Branched polymer chain, self-assembling', c: '#21908c' },
    diffusion: { id: 'Fig. 2', name: 'Diffusion sample denoising into structure', c: '#21908c' },
    agents:    { id: 'Fig. 3', name: 'Coordinated agents over a shared timeline', c: '#35b779' },
    series:    { id: 'Fig. 4', name: 'Equity curve, walk-forward backtest', c: '#35b779' },
    ladder:    { id: 'Fig. 5', name: 'Record, ordered by year', c: '#6ece58' },
    lattice:   { id: 'Fig. 6', name: 'Toolkit as an ordered lattice', c: '#a5db36' },
    converge:  { id: 'Fig. 7', name: 'Converged', c: '#cbe11f' }
  };

  var nodes = [];             // {x,y,z current} + {fx,fy,fz from} + {tx,ty,tz to}
  var edgesFrom = [], edgesTo = [];
  var bond = 40, R = 200;
  var morphStart = 0, morphDur = 1100, morphStagger = 500;
  var frame = 0, W = 0, H = 0, scroll = 0;
  var currentName = null;

  /* ─── figure generators — each returns N points + edges ─── */

  function clearance(pts, x, y, z, skip) {
    var min = Infinity;
    for (var i = 0; i < pts.length; i++) {
      if (i === skip) continue;
      var dx = x-pts[i][0], dy = y-pts[i][1], dz = z-pts[i][2];
      var d = Math.sqrt(dx*dx + dy*dy + dz*dz);
      if (d < min) min = d;
    }
    return min;
  }

  /* a self-avoiding walk in 3D: a real chain cannot pass through itself */
  function figChain() {
    var pts = [], edges = [], ks = [];
    var back = N - 6;
    var step = R / 2.9;
    var x = 0, y = 0, z = 0;
    var dx = Math.random()-0.5, dy = Math.random()-0.5, dz = Math.random()-0.5;
    var n = Math.sqrt(dx*dx+dy*dy+dz*dz) || 1; dx/=n; dy/=n; dz/=n;

    for (var i = 0; i < back; i++) {
      pts.push([x, y, z]); ks.push(i / (back - 1));
      if (i > 0) edges.push([i-1, i]);
      if (i === back - 1) break;

      var bx=x, by=y, bz=z, bdx=dx, bdy=dy, bdz=dz, best=-Infinity;
      for (var a = 0; a < 18; a++) {
        var jx = dx + (Math.random()-0.5)*1.5;
        var jy = dy + (Math.random()-0.5)*1.5;
        var jz = dz + (Math.random()-0.5)*1.5;
        var r = Math.sqrt(x*x+y*y+z*z);
        var pull = Math.min(1, Math.pow(r/R, 3)) * 0.7;
        if (r > 0.001) {
          jx = jx*(1-pull) - (x/r)*pull;
          jy = jy*(1-pull) - (y/r)*pull;
          jz = jz*(1-pull) - (z/r)*pull;
        }
        var m = Math.sqrt(jx*jx+jy*jy+jz*jz) || 1; jx/=m; jy/=m; jz/=m;
        var nx = x+jx*step, ny = y+jy*step, nz = z+jz*step;
        var gap = clearance(pts, nx, ny, nz, pts.length-1);
        if (Math.sqrt(nx*nx+ny*ny+nz*nz) > R) gap -= step*2;
        if (gap > best) { best=gap; bx=nx; by=ny; bz=nz; bdx=jx; bdy=jy; bdz=jz; }
        if (gap > step*0.95) break;
      }
      x=bx; y=by; z=bz; dx=bdx; dy=bdy; dz=bdz;
    }

    /* pendant side groups until the count is exact */
    var j = 2;
    while (pts.length < N) {
      var p = pts[j % (back-1)], q = pts[(j % (back-1)) + 1];
      var ax=q[0]-p[0], ay=q[1]-p[1], az=q[2]-p[2];
      var ux=ay, uy=-ax, uz=az*0.4;
      var um = Math.sqrt(ux*ux+uy*uy+uz*uz) || 1;
      var sgn = (j % 2) ? 1 : -1;
      pts.push([p[0]+(ux/um)*step*0.85*sgn,
                p[1]+(uy/um)*step*0.85*sgn,
                p[2]+(uz/um)*step*0.85*sgn]);
      ks.push(ks[j % (back-1)]);
      edges.push([j % (back-1), pts.length-1]);
      j += 4;
      if (j > back * 3) j = 2 + (pts.length % 3);
    }
    return { pts: pts, edges: edges, ks: ks };
  }

  /* noise on the left resolving into a clean grid on the right */
  function figDiffusion() {
    var pts = [], edges = [], ks = [];
    var cols = 8, rows = Math.ceil(N / cols);
    for (var i = 0; i < N; i++) {
      var cx = i % cols, cy = Math.floor(i / cols);
      var order = cx / (cols - 1);            // 0 = noisy, 1 = resolved
      var noise = (1 - order) * R * 0.85;
      pts.push([
        (cx / (cols-1) - 0.5) * R * 1.7 + (Math.random()-0.5) * noise,
        (cy / Math.max(1, rows-1) - 0.5) * R * 1.15 + (Math.random()-0.5) * noise,
        (Math.random()-0.5) * noise
      ]);
      ks.push(order);
      if (cx > 0) edges.push([i-1, i]);
      if (cy > 0) edges.push([i-cols, i]);
    }
    return { pts: pts, edges: edges, ks: ks };
  }

  /* four agents on a shared spine, each with its own capabilities */
  function figAgents() {
    var pts = [], edges = [], ks = [];
    var hubs = 4;
    for (var h = 0; h < hubs; h++) {
      var t = hubs > 1 ? h / (hubs - 1) : 0;
      pts.push([(t - 0.5) * R * 1.5, 0, 0]);
      ks.push(0.35 + t * 0.5);
      if (h > 0) edges.push([h-1, h]);        // the spine
    }
    var per = Math.ceil((N - hubs) / hubs);
    for (var i = hubs; i < N; i++) {
      var hub = Math.min(hubs - 1, Math.floor((i - hubs) / per));
      var a = ((i - hubs) % per) / per * Math.PI * 2 + hub;
      var rad = R * (0.4 + ((i * 7) % 5) / 14);
      pts.push([
        pts[hub][0] + Math.cos(a) * rad * 0.55,
        Math.sin(a) * rad,
        Math.cos(a * 1.7) * rad * 0.7
      ]);
      ks.push(ks[hub] - 0.22);
      edges.push([hub, i]);
    }
    return { pts: pts, edges: edges, ks: ks };
  }

  /* an equity curve: near-planar, trending up, sampled in time */
  function figSeries() {
    var pts = [], edges = [], ks = [];
    var v = -R * 0.5;
    for (var i = 0; i < N; i++) {
      var t = i / (N - 1);
      v += (Math.random() - 0.38) * R * 0.17;   // drift up, with drawdowns
      v = Math.max(-R * 0.85, Math.min(R * 0.85, v));
      pts.push([(t - 0.5) * R * 1.9, -v, (Math.random() - 0.5) * R * 0.07]);
      ks.push(t);
      if (i > 0) edges.push([i-1, i]);
    }
    return { pts: pts, edges: edges, ks: ks };
  }

  /* a timeline climbing in discrete steps */
  function figLadder() {
    var pts = [], edges = [], ks = [];
    var steps = 5, per = Math.ceil(N / steps);
    for (var i = 0; i < N; i++) {
      var s = Math.floor(i / per);
      var within = (i % per) / per;
      pts.push([
        (within - 0.5) * R * 0.85 + (s - (steps-1)/2) * R * 0.28,
        (s - (steps-1)/2) * -R * 0.42,
        (within - 0.5) * R * 0.5
      ]);
      ks.push(i / (N - 1));
      if (i > 0) edges.push([i-1, i]);
    }
    return { pts: pts, edges: edges, ks: ks };
  }

  /* a regular 3D lattice — order, nothing emergent */
  function figLattice() {
    var pts = [], edges = [], ks = [];
    var nx = 4, ny = 4, nz = 3;
    var grid = {};
    var i = 0;
    for (var a = 0; a < nx && i < N; a++) {
      for (var b = 0; b < ny && i < N; b++) {
        for (var c = 0; c < nz && i < N; c++) {
          grid[a+','+b+','+c] = i;
          pts.push([
            (a/(nx-1) - 0.5) * R * 1.25,
            (b/(ny-1) - 0.5) * R * 1.25,
            (c/(nz-1) - 0.5) * R * 1.0
          ]);
          ks.push((a + b + c) / (nx + ny + nz - 3));
          i++;
        }
      }
    }
    for (var a2 = 0; a2 < nx; a2++) for (var b2 = 0; b2 < ny; b2++) for (var c2 = 0; c2 < nz; c2++) {
      var from = grid[a2+','+b2+','+c2];
      if (from === undefined) continue;
      [[1,0,0],[0,1,0],[0,0,1]].forEach(function (d) {
        var to = grid[(a2+d[0])+','+(b2+d[1])+','+(c2+d[2])];
        if (to !== undefined) edges.push([from, to]);
      });
    }
    return { pts: pts, edges: edges, ks: ks };
  }

  function figConverge() {
    var pts = [], edges = [], ks = [];
    for (var i = 0; i < N; i++) {
      var a = i * 2.39996, r = Math.sqrt(i / N) * R * 0.3;
      pts.push([Math.cos(a)*r, Math.sin(a)*r, Math.sin(a*2)*r*0.6]);
      ks.push(1 - i / (N - 1) * 0.5);
      if (i > 0) edges.push([Math.max(0, i-3), i]);
    }
    return { pts: pts, edges: edges, ks: ks };
  }

  var GEN = {
    chain: figChain, diffusion: figDiffusion, agents: figAgents,
    series: figSeries, ladder: figLadder, lattice: figLattice,
    converge: figConverge
  };

  /* ─── morph ──────────────────────────────────────────────── */

  function setFigure(name, immediate) {
    if (name === currentName || !GEN[name]) return;
    currentName = name;

    var fig = GEN[name]();
    bond = R / 2.9;

    for (var i = 0; i < N; i++) {
      var p = fig.pts[i] || [0, 0, 0];
      if (!nodes[i]) {
        nodes[i] = {
          x: (Math.random()-0.5)*W*1.1, y: (Math.random()-0.5)*H*1.1,
          z: (Math.random()-0.5)*R*3,
          phase: Math.random() * Math.PI * 2
        };
      }
      var nd = nodes[i];
      nd.fx = nd.x; nd.fy = nd.y; nd.fz = nd.z;   // morph from where it is now
      nd.tx = p[0]; nd.ty = p[1]; nd.tz = p[2];
      nd.k = fig.ks[i] !== undefined ? fig.ks[i] : i / (N - 1);
    }

    edgesFrom = edgesTo;
    edgesTo = fig.edges;
    morphStart = performance.now();

    if (immediate || reduced) {
      morphDur = 1; morphStagger = 0;
      edgesFrom = edgesTo;
    }

    if (readout) {
      readout.querySelector('.readout__id').textContent = FIGURES[name].id;
      readout.querySelector('.readout__name').textContent = FIGURES[name].name;
      readout.style.setProperty('--accent', FIGURES[name].c);
    }
  }

  /* ─── draw ───────────────────────────────────────────────── */

  function draw(now) {
    var wide = W > 1024;
    var s = scroll;

    var intro = easeOutCubic(Math.min(s / 0.16, 1));
    var cx = W * (wide ? (0.66 + 0.06 * intro) : 0.5);
    var cy = H * (wide ? 0.5 : (0.42 + 0.06 * intro));
    var zoom = 1 - 0.26 * intro;
    var alpha = 1 - 0.38 * intro;

    var spinY = s * Math.PI * 2.4 + (reduced ? 0 : now * 0.00004);
    var spinX = Math.sin(s * Math.PI * 1.4) * 0.42;
    var focal = Math.min(W, H) * 1.5;

    ctx.clearRect(0, 0, W, H);

    var cosY = Math.cos(spinY), sinY = Math.sin(spinY);
    var cosX = Math.cos(spinX), sinX = Math.sin(spinX);
    var elapsed = now - morphStart;
    var settled = 1;
    var i, nd;

    for (i = 0; i < N; i++) {
      nd = nodes[i];
      if (!nd) continue;

      var delay = morphStagger * (i / N);
      var t = Math.max(0, Math.min(1, (elapsed - delay) / morphDur));
      var e = easeInOut(t);
      if (t < 1) settled = 0;

      nd.x = nd.fx + (nd.tx - nd.fx) * e;
      nd.y = nd.fy + (nd.ty - nd.fy) * e;
      nd.z = nd.fz + (nd.tz - nd.fz) * e;
      nd.a = Math.max(0.18, e);

      if (t === 1 && !reduced) {
        var d = now * 0.0007;
        nd.x += Math.sin(d + nd.phase) * bond * 0.06;
        nd.y += Math.cos(d*0.8 + nd.phase) * bond * 0.06;
      }

      var rx = nd.x*cosY + nd.z*sinY;
      var rz = -nd.x*sinY + nd.z*cosY;
      var ry = nd.y*cosX - rz*sinX;
      rz = nd.y*sinX + rz*cosX;

      var p = focal / (focal + rz);
      nd.px = cx + rx*p*zoom;
      nd.py = cy + ry*p*zoom;
      nd.pz = rz;
      nd.scale = p;
    }

    /* edges crossfade while the topology changes */
    var mix = Math.min(1, elapsed / (morphDur + morphStagger));
    ctx.lineCap = 'round';

    function strokeEdges(list, weight) {
      if (weight <= 0.01) return;
      for (var q = 0; q < list.length; q++) {
        var A = nodes[list[q][0]], B = nodes[list[q][1]];
        if (!A || !B) continue;
        var depth = (A.scale + B.scale) / 2;
        var col = viridis((A.k + B.k) / 2);
        ctx.strokeStyle = 'rgba(' + col[0] + ',' + col[1] + ',' + col[2] + ',' +
          (Math.min(A.a, B.a) * alpha * 0.5 * depth * weight) + ')';
        ctx.lineWidth = Math.max(0.6, bond * 0.035 * depth);
        ctx.beginPath();
        ctx.moveTo(A.px, A.py);
        ctx.lineTo(B.px, B.py);
        ctx.stroke();
      }
    }
    if (edgesFrom !== edgesTo) strokeEdges(edgesFrom, 1 - mix);
    strokeEdges(edgesTo, mix);
    if (mix >= 1) edgesFrom = edgesTo;

    /* monomers, far to near, with additive bloom */
    var order = nodes.slice(0, N).sort(function (a, b) { return b.pz - a.pz; });
    for (i = 0; i < order.length; i++) {
      nd = order[i];
      if (!nd || nd.a <= 0.04) continue;
      var c = viridis(nd.k);
      var rgb = c[0] + ',' + c[1] + ',' + c[2];
      var r = Math.max(1.2, bond * 0.11 * nd.scale);

      ctx.globalCompositeOperation = 'lighter';
      var g = ctx.createRadialGradient(nd.px, nd.py, 0, nd.px, nd.py, r*5);
      g.addColorStop(0, 'rgba(' + rgb + ',' + (nd.a * alpha * 0.5) + ')');
      g.addColorStop(1, 'rgba(' + rgb + ',0)');
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(nd.px, nd.py, r*5, 0, Math.PI*2); ctx.fill();

      ctx.globalCompositeOperation = 'source-over';
      ctx.fillStyle = 'rgba(' + rgb + ',' + Math.min(1, nd.a*alpha*1.25) + ')';
      ctx.beginPath(); ctx.arc(nd.px, nd.py, r, 0, Math.PI*2); ctx.fill();
    }
    return settled;
  }

  /* ─── which figure belongs to where you are ─────────────── */

  var stages = Array.prototype.slice.call(document.querySelectorAll('[data-figure]'));

  function pickFigure() {
    var line = window.innerHeight * 0.55;
    var name = stages.length ? stages[0].getAttribute('data-figure') : 'chain';
    for (var i = 0; i < stages.length; i++) {
      if (stages[i].getBoundingClientRect().top <= line) {
        name = stages[i].getAttribute('data-figure');
      }
    }
    setFigure(name);
  }

  function readScroll() {
    var max = document.documentElement.scrollHeight - window.innerHeight;
    scroll = max > 0 ? Math.min(1, Math.max(0, window.scrollY / max)) : 0;
    if (readout) readout.classList.toggle('is-on', window.scrollY > window.innerHeight * 0.6);
    pickFigure();
    if (reduced) draw(performance.now());
  }

  /* ─── loop ───────────────────────────────────────────────── */

  function stop() { if (frame) { cancelAnimationFrame(frame); frame = 0; } }
  function tick(now) { draw(now); frame = requestAnimationFrame(tick); }

  function resize() {
    var rect = canvas.getBoundingClientRect();
    if (!rect.width || !rect.height) return false;
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = rect.width; H = rect.height;
    canvas.width = Math.round(W*dpr);
    canvas.height = Math.round(H*dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    R = Math.min(W, H) * 0.3;
    return true;
  }

  var ticking = false;
  window.addEventListener('scroll', function () {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(function () { ticking = false; readScroll(); });
  }, { passive: true });

  var resizeTimer;
  window.addEventListener('resize', function () {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(function () {
      if (!resize()) return;
      var was = currentName; currentName = null;
      setFigure(was || 'chain', true);
      readScroll();
    }, 180);
  });

  document.addEventListener('visibilitychange', function () {
    if (document.hidden) stop();
    else if (!reduced && !frame) frame = requestAnimationFrame(tick);
  });

  if (reducedQuery.addEventListener) {
    reducedQuery.addEventListener('change', function (e) {
      reduced = e.matches;
      var was = currentName; currentName = null;
      setFigure(was || 'chain', true);
      if (reduced) { stop(); draw(performance.now()); }
      else if (!frame) frame = requestAnimationFrame(tick);
    });
  }

  function boot() {
    if (!resize()) return;
    document.body.classList.add('is-ready');

    /* first load: a long staggered assembly out of disorder */
    morphDur = 1000; morphStagger = 1700;
    setFigure('chain', reduced);
    readScroll();

    if (reduced) { draw(performance.now()); return; }
    frame = requestAnimationFrame(tick);

    /* later figure changes are quicker */
    setTimeout(function () { morphDur = 1100; morphStagger = 500; }, 2900);
  }

  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(boot).catch(boot);
  } else { boot(); }
})();


/* ═══════════════════════════════════════════════════════════
   Scroll reveals, count-ups, section rail
   ═══════════════════════════════════════════════════════════ */

(function () {
  'use strict';

  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var supported = 'IntersectionObserver' in window;
  var animated = Array.prototype.slice.call(document.querySelectorAll('[data-anim]'));

  function format(el, v) {
    var d = parseInt(el.getAttribute('data-decimals') || '0', 10);
    return (el.getAttribute('data-prefix') || '') + v.toFixed(d) +
           (el.getAttribute('data-suffix') || '');
  }

  function countUp(el) {
    if (el.dataset.counted) return;
    el.dataset.counted = '1';
    var target = parseFloat(el.getAttribute('data-count-to'));
    if (isNaN(target)) return;
    var DUR = 1300, started = null;
    function step(now) {
      if (started === null) started = now;
      var t = Math.min((now - started) / DUR, 1);
      var e = 1 - Math.pow(1 - t, 3);
      /* never blank the real value: if rAF never runs, the truth stays */
      el.textContent = t < 1 ? format(el, target * e) : format(el, target);
      if (t < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }

  if (reduced || !supported) {
    animated.forEach(function (el) { el.classList.add('is-in'); });
    Array.prototype.forEach.call(document.querySelectorAll('[data-count-to]'), function (el) {
      el.dataset.counted = '1';
    });
  } else {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-in');
        io.unobserve(entry.target);
        Array.prototype.forEach.call(
          entry.target.querySelectorAll('[data-count-to]'), countUp);
      });
    }, { rootMargin: '0px 0px -10% 0px', threshold: 0.12 });
    animated.forEach(function (el) { io.observe(el); });
  }

  var links = Array.prototype.slice.call(document.querySelectorAll('.rail a'));
  if (!links.length) return;

  var targets = links.map(function (link) {
    var el = document.getElementById(link.getAttribute('href').slice(1));
    return el ? { link: link, el: el } : null;
  }).filter(Boolean);

  var current = null;
  function track() {
    var line = window.innerHeight * 0.35;
    var found = targets[0];
    for (var i = 0; i < targets.length; i++) {
      if (targets[i].el.getBoundingClientRect().top <= line) found = targets[i];
    }
    if (window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 4) {
      found = targets[targets.length - 1];
    }
    if (found.link === current) return;
    if (current) current.classList.remove('is-current');
    found.link.classList.add('is-current');
    current = found.link;
  }

  var ticking = false;
  window.addEventListener('scroll', function () {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(function () { ticking = false; track(); });
  }, { passive: true });
  window.addEventListener('resize', track);
  track();
})();
