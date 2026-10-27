// Calque de montage injecté dans la page (rendu manuel image par image).
(() => {
  const css = `
  #toast{display:none!important}
  #ov{position:fixed;inset:0;pointer-events:none;z-index:99999;font-family:Fredoka,Nunito,system-ui,sans-serif;overflow:hidden}
  #ov .cap{position:absolute;left:4%;right:4%;text-align:center;color:#fff;font-weight:700;line-height:1.08;
    -webkit-text-stroke:7px #1d2a48;paint-order:stroke fill;text-shadow:0 5px 0 #1d2a48,0 10px 24px rgba(0,0,0,.35);transform-origin:50% 50%}
  #ov .cap .y{color:#ffd23f}
  #ov .cap .r{color:#ff6b6b}
  #ov .cap .g{color:#7ee081}
  #ov #flash{position:absolute;inset:0;background:#fff;opacity:0}
  #ov #vig{position:absolute;inset:0;background:radial-gradient(ellipse at 50% 45%,transparent 55%,rgba(200,30,30,.55));opacity:0}
  #ov .dot{position:absolute;width:44px;height:44px;margin:-22px 0 0 -22px;border-radius:50%;background:rgba(255,255,255,.55);border:4px solid #fff;box-shadow:0 0 0 3px rgba(29,42,72,.5)}
  #ov #ring{position:absolute;border-radius:50%;border:6px solid #ffd23f;box-shadow:0 0 0 4px #1d2a48,0 0 30px #ffd23f}
  #ov #end{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:18px;
    background:radial-gradient(circle at 50% 40%,rgba(255,255,255,.92),rgba(220,230,255,.97));opacity:0}
  #ov #end .title{font-size:64px;margin:0}
  #ov #end .l1{font-size:26px;font-weight:700;color:#1d2a48}
  #ov #end .l2{font-size:20px;font-weight:700;color:#5b6787}
  #ov #end .hexes{display:flex;gap:6px}
  #ov #end .hexes i{width:34px;height:30px;clip-path:polygon(25% 0,75% 0,100% 50%,75% 100%,25% 100%,0 50%)}
  `;
  const st = document.createElement('style'); st.textContent = css; document.head.append(st);
  const ov = document.createElement('div'); ov.id = 'ov';
  ov.innerHTML = `<div id="vig"></div><div id="flash"></div><div id="ring" hidden></div><div id="dots"></div>
    <div class="cap" id="cap1"></div><div class="cap" id="cap2"></div><div class="cap" id="big"></div>
    <div id="end"><div class="hexes"><i style="background:#f2756a"></i><i style="background:#f2c94c"></i><i style="background:#5cb85c"></i><i style="background:#2bb3ad"></i><i style="background:#3866d6"></i><i style="background:#9b7fdc"></i></div>
    <h1 class="title">Tomettes</h1><div class="l1" id="endl1"></div><div class="l2" id="endl2"></div></div>`;
  document.body.append(ov);
  window.__swaps = []; window.__log = [];
  const easeBack = (x) => { const c = 1.9; x = Math.min(1, Math.max(0, x)); return 1 + (c + 1) * Math.pow(x - 1, 3) + c * Math.pow(x - 1, 2); };
  window.ovHook = () => {
    const g = tomettes.game;
    if (g.__hooked) return; g.__hooked = true;
    const ts = g.trySwap.bind(g);
    g.trySwap = (c1, r1, c2, r2) => { const ok = ts(c1, r1, c2, r2); if (ok) { window.__swaps.push({ f: window.__frame, c: c2, r: r2, c1, r1 }); window.__log.push({ f: window.__frame, k: 'swap' }); } return ok; };
    const push = g.events.push.bind(g.events);
    g.events.push = (...es) => { for (const e of es) if (e.kind === 'clear') window.__log.push({ f: window.__frame, k: 'clear', chain: e.chain, size: e.size, ros: e.rosaces, gold: e.gold }); return push(...es); };
  };
  const capEl = (el, c) => {
    if (!c) { el.style.display = 'none'; return; }
    el.style.display = 'block';
    if (el.__html !== c.html) { el.innerHTML = c.html; el.__html = c.html; }
    const s = easeBack((c.t ?? 99) / 7) * (c.scale ?? 1) * (1 + (c.pulse ?? 0));
    el.style.top = (c.y ?? 18) + '%';
    el.style.left = (c.box ? c.box[0] : 4) + '%'; el.style.right = (c.box ? 100 - c.box[1] : 4) + '%';
    el.style.textAlign = c.box ? 'left' : 'center'; el.style.transformOrigin = c.box ? '0 50%' : '50% 50%';
    el.style.fontSize = (c.size ?? 40) + 'px';
    el.style.transform = `rotate(${c.rot ?? -2}deg) scale(${s})`;
    el.style.opacity = c.alpha ?? 1;
  };
  window.ovRender = (o) => {
    window.__frame = o.frame;
    if (window.ovFloor) window.ovFloor(o.floor);
    capEl(document.getElementById('cap1'), o.cap1);
    capEl(document.getElementById('cap2'), o.cap2);
    capEl(document.getElementById('big'), o.big);
    document.getElementById('flash').style.opacity = o.flash ?? 0;
    document.getElementById('vig').style.opacity = o.vig ?? 0;
    // Zoom / tremblement : sur tout sauf le calque.
    const z = o.zoom ?? { s: 1, x: 50, y: 50 };
    const sh = o.shake ?? 0;
    const dx = sh ? (Math.sin(o.frame * 2.7) * sh) : 0, dy = sh ? (Math.cos(o.frame * 3.3) * sh) : 0;
    for (const el of document.body.children) {
      if (el.id === 'ov' || el.tagName === 'SCRIPT' || el.tagName === 'STYLE') continue;
      el.style.transformOrigin = `${z.x}% ${z.y}%`;
      el.style.transform = (z.s !== 1 || sh) ? `translate(${dx}px,${dy}px) scale(${z.s})` : '';
    }
    // Ronds de toucher : là où le joueur échange.
    const dots = document.getElementById('dots');
    const live = (o.touch === false) ? [] : window.__swaps.filter((s) => o.frame - s.f < 9 && o.frame >= s.f);
    dots.replaceChildren(...live.map((s) => {
      const p = tomettes.cellOnScreen(s.c1, s.r1), q = tomettes.cellOnScreen(s.c, s.r);
      const k = (o.frame - s.f) / 8;
      const d = document.createElement('div'); d.className = 'dot';
      const x = p.x + (q.x - p.x) * Math.min(1, k * 2), y = p.y + (q.y - p.y) * Math.min(1, k * 2);
      d.style.left = x + 'px'; d.style.top = y + 'px'; d.style.opacity = 1 - k * 0.8;
      return d;
    }));
    const ring = document.getElementById('ring');
    if (o.ring) {
      const a = tomettes.cellOnScreen(o.ring.c1, o.ring.r1), b = tomettes.cellOnScreen(o.ring.c2, o.ring.r2);
      const cx = (a.x + b.x) / 2, cy = (a.y + b.y) / 2, rad = Math.hypot(a.x - b.x, a.y - b.y) / 2 + a.R * 1.15;
      const pul = 1 + 0.06 * Math.sin(o.frame * 0.5);
      ring.hidden = false; ring.style.left = (cx - rad * pul) + 'px'; ring.style.top = (cy - rad * pul) + 'px';
      ring.style.width = ring.style.height = (2 * rad * pul) + 'px';
    } else ring.hidden = true;
    const mini = document.getElementById('duel-mini');
    if (mini) { const m = o.mini ?? 1; mini.style.transformOrigin = '100% 0'; mini.style.transform = m !== 1 ? `scale(${m})` : '';
      mini.style.boxShadow = m !== 1 ? '0 0 0 3px #fff, 0 0 0 6px #1d2a48, 0 10px 30px rgba(0,0,0,.35)' : ''; mini.style.borderRadius = '6px'; mini.style.position = 'relative'; mini.style.zIndex = '50'; }
    const end = document.getElementById('end');
    end.style.opacity = o.end ? Math.min(1, o.end.t / 6) : 0;
    if (o.end) { document.getElementById('endl1').textContent = o.end.l1; document.getElementById('endl2').textContent = o.end.l2;
      end.querySelector('.title').style.transform = `scale(${easeBack(o.end.t / 8)})`; }
  };
})();
