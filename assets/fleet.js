/**
 * The landing-page fleet: drives every canvas on the page using the app's real
 * rendering code (assets/claw-demo.js, built from the private repo's
 * sprites.ts / planets.ts / starfield.ts). Load claw-demo.js first.
 */

var CLAW_PLANETS = [
  { style: 0, x: -380, y: -70, r: 46, orbitR: 96, label: 'claw-command ⎇ main' },
  { style: 3, x: 320, y: -170, r: 50, orbitR: 104, label: 'webapp' },
  { style: 1, x: 270, y: 215, r: 42, orbitR: 88, label: 'side-quests' },
  { style: 2, x: -210, y: 255, r: 38, orbitR: 80, label: 'docs-site' },
]

var CLAW_ROBOTS = [
  { chassis: 'sonnet', state: 'running', p: 0, a: 0.4, sp: 0.1, title: 'wire the socket client' },
  { chassis: 'haiku', state: 'running', p: 0, a: 2.6, sp: 0.13, title: 'sweep dead flags' },
  { chassis: 'fable', state: 'needs_input', p: 0, a: 4.6, sp: 0.07, title: 'auth refactor, needs a yes' },
  { chassis: 'opus', state: 'running', p: 1, a: 1.1, sp: 0.08, title: 'coordinate: split the PR' },
  { chassis: 'sonnet', state: 'sleeping', p: 1, a: 3.3, sp: 0.06, title: 'retro summary, done' },
  { chassis: 'haiku', state: 'error', p: 1, a: 5.2, sp: 0.09, title: 'hit an API error' },
  { chassis: 'sonnet', state: 'running', p: 2, a: 0.9, sp: 0.11, title: 'write release notes' },
  { chassis: 'sonnet', state: 'needs_input', p: 2, a: 2.4, sp: 0.06, title: 'release notes need a review' },
  { chassis: 'haiku', state: 'out_of_fuel', p: 2, a: 3.8, sp: 0.045, title: 'context window full' },
  { chassis: 'haiku', state: 'running', p: 3, a: 2.0, sp: 0.12, title: 'fix the sitemap' },
  { chassis: 'fable', state: 'idle', p: 3, a: 5.0, sp: 0.05, title: 'pricing page, draft ready' },
]

class FleetDemo {
  constructor() {
    var self = this
    this._hero = {
      cam: { x: -26, y: 30, zoom: 0.55 },
      follow: { type: 'fit' },
      selected: -1,
      att: -1,
      last: 0,
      sf: null,
      sf2: null,
    }
    this._t0 = performance.now()
    var tick = function (now) {
      var t = (now - self._t0) / 1000
      try { self.drawAll(t) } catch (e) {}
      self._raf = requestAnimationFrame(tick)
    }
    this._raf = requestAnimationFrame(tick)
    this.wireInput()
  }

  /* ── canvas plumbing ─────────────────────────────────────────────────── */

  ctx(id) {
    var el = document.getElementById(id)
    if (!el || !el.getContext) return null
    var dpr = Math.min(2, window.devicePixelRatio || 1)
    var w = el.clientWidth, h = el.clientHeight
    if (!w || !h) return null
    var pw = Math.round(w * dpr), ph = Math.round(h * dpr)
    if (el.width !== pw || el.height !== ph) { el.width = pw; el.height = ph }
    var g = el.getContext('2d')
    g.setTransform(dpr, 0, 0, dpr, 0, 0)
    return { el: el, g: g, w: w, h: h, dpr: dpr }
  }

  sprite(g, dpr, chassis, anim, x, y, size, t, alpha) {
    var CD = window.ClawDemo
    var atlas = CD.getAtlas(dpr)
    var f = Math.floor(t * CD.ANIM_FPS[anim]) % CD.FRAMES
    var r = atlas.rect(chassis, anim, f)
    if (alpha != null) { g.save(); g.globalAlpha = alpha }
    g.drawImage(atlas.image, r.sx, r.sy, atlas.cell, atlas.cell, x - size / 2, y - size / 2, size, size)
    if (alpha != null) g.restore()
  }

  halo(g, x, y, z, t, i) {
    var a = 0.32 + 0.16 * Math.sin(t * 5 + i)
    g.save()
    g.strokeStyle = 'rgba(255,176,32,' + a.toFixed(3) + ')'
    g.lineWidth = Math.max(1, 1.6 * z)
    g.beginPath()
    g.arc(x, y, (30 + 2 * Math.sin(t * 5 + i)) * z, 0, Math.PI * 2)
    g.stroke()
    var q = (t / 2.4 + i * 0.37) % 1
    g.strokeStyle = 'rgba(255,176,32,' + (0.42 * (1 - q)).toFixed(3) + ')'
    g.lineWidth = Math.max(1, 1.2 * z)
    g.beginPath()
    g.arc(x, y, (30 + q * 85) * z, 0, Math.PI * 2)
    g.stroke()
    g.restore()
  }

  idleGlow(g, x, y, z) {
    // An answer just landed: a faint steady halo, no pulse and no ping —
    // mirrors FleetCanvas.vue's idle treatment.
    var rr = 50 * z
    var grad = g.createRadialGradient(x, y, 0, x, y, rr)
    grad.addColorStop(0, 'rgba(255,215,94,0.45)')
    grad.addColorStop(1, 'rgba(0,0,0,0)')
    g.save()
    g.globalAlpha = 0.14
    g.fillStyle = grad
    g.beginPath()
    g.arc(x, y, rr, 0, Math.PI * 2)
    g.fill()
    g.restore()
  }

  redGlow(g, x, y, z) {
    var grad = g.createRadialGradient(x, y, 0, x, y, 34 * z)
    grad.addColorStop(0, 'rgba(255,77,94,0.2)')
    grad.addColorStop(1, 'rgba(0,0,0,0)')
    g.fillStyle = grad
    g.beginPath()
    g.arc(x, y, 34 * z, 0, Math.PI * 2)
    g.fill()
  }

  brackets(g, x, y, z) {
    var hlf = 30 * z, L = 9 * z
    g.save()
    g.strokeStyle = '#7adcff'
    g.lineWidth = 1.5
    var cs = [[-1, -1], [1, -1], [-1, 1], [1, 1]]
    for (var i = 0; i < 4; i++) {
      var cx = x + cs[i][0] * hlf, cy = y + cs[i][1] * hlf
      g.beginPath()
      g.moveTo(cx - cs[i][0] * L, cy)
      g.lineTo(cx, cy)
      g.lineTo(cx, cy - cs[i][1] * L)
      g.stroke()
    }
    g.restore()
  }

  /* ── the hero fleet ──────────────────────────────────────────────────── */

  robotPos(r, t) {
    var p = CLAW_PLANETS[r.p]
    var a = r.a + t * r.sp
    return { x: p.x + Math.cos(a) * p.orbitR, y: p.y + Math.sin(a) * p.orbitR * 0.92 }
  }

  fitPose(w, h) {
    return { x: -26, y: 34, zoom: Math.min(w / 1010, h / 690) }
  }

  targetPose(w, h, t) {
    var hr = this._hero
    if (hr.follow.type === 'robot') {
      var pos = this.robotPos(CLAW_ROBOTS[hr.follow.i], t)
      return { x: pos.x, y: pos.y, zoom: 2.1 }
    }
    if (hr.follow.type === 'planet') {
      var p = CLAW_PLANETS[hr.follow.i]
      return { x: p.x, y: p.y + 8, zoom: 1.5 }
    }
    return this.fitPose(w, h)
  }

  drawHero(t) {
    var c = this.ctx('demo-canvas')
    var CD = window.ClawDemo
    if (!c || !CD) return
    var hr = this._hero
    var g = c.g
    if (!hr.sf) hr.sf = CD.makeStarfield(1312)

    var dt = Math.min(0.1, Math.max(0.001, t - hr.last))
    hr.last = t
    var pose = this.targetPose(c.w, c.h, t)
    var k = 1 - Math.exp(-dt * 4)
    hr.cam.x += (pose.x - hr.cam.x) * k
    hr.cam.y += (pose.y - hr.cam.y) * k
    hr.cam.zoom += (pose.zoom - hr.cam.zoom) * k
    var cam = hr.cam, z = cam.zoom

    g.fillStyle = '#070810'
    g.fillRect(0, 0, c.w, c.h)
    hr.sf.draw(g, cam, c.w, c.h, t)

    var W2S = function (wx, wy) {
      return [(wx - cam.x) * z + c.w / 2, (wy - cam.y) * z + c.h / 2]
    }

    // Orbit rings.
    g.save()
    g.strokeStyle = 'rgba(120,140,190,0.16)'
    g.lineWidth = 1
    g.setLineDash([3, 7])
    for (var i = 0; i < CLAW_PLANETS.length; i++) {
      var p = CLAW_PLANETS[i]
      var s = W2S(p.x, p.y)
      g.beginPath()
      g.ellipse(s[0], s[1], p.orbitR * z, p.orbitR * 0.92 * z, 0, 0, Math.PI * 2)
      g.stroke()
    }
    g.restore()

    // Bodies.
    CD.drawOrbitBody(g, { kind: 'home' }, W2S(0, 0)[0], W2S(0, 0)[1], 50 * z, t)
    for (var i = 0; i < CLAW_PLANETS.length; i++) {
      var p = CLAW_PLANETS[i]
      var s = W2S(p.x, p.y)
      CD.drawOrbitBody(g, { kind: 'planet', style: p.style }, s[0], s[1], p.r * z, t, p.style)
    }

    // Labels.
    if (z > 0.5) {
      g.font = '11px "JetBrains Mono", monospace'
      g.textAlign = 'center'
      g.fillStyle = 'rgba(200,210,238,' + Math.min(0.5, (z - 0.5) * 1.6 + 0.25).toFixed(2) + ')'
      for (var i = 0; i < CLAW_PLANETS.length; i++) {
        var p = CLAW_PLANETS[i]
        var s = W2S(p.x, p.y)
        g.fillText(p.label, s[0], s[1] + p.r * z + 18)
      }
      g.fillText('home', W2S(0, 0)[0], W2S(0, 0)[1] + 50 * z + 18)
    }

    // Robots.
    for (var i = 0; i < CLAW_ROBOTS.length; i++) {
      var r = CLAW_ROBOTS[i]
      var pos = this.robotPos(r, t)
      var s = W2S(pos.x, pos.y)
      if (r.state === 'error') this.redGlow(g, s[0], s[1], z)
      if (r.state === 'idle') this.idleGlow(g, s[0], s[1], z)
      if (r.state === 'needs_input') this.halo(g, s[0], s[1], z, t, i)
      var phase = ((t * 0.03) + i * 0.37) % 1
      var anim = CD.animForState(r.state, phase)
      this.sprite(g, c.dpr, r.chassis, anim, s[0], s[1], 52 * z, t + i * 0.7)
      if (i === hr.selected) this.brackets(g, s[0], s[1], z)
    }
  }

  /* ── the planets section scene ───────────────────────────────────────── */

  drawOrbits(t) {
    var c = this.ctx('orbits-canvas')
    var CD = window.ClawDemo
    if (!c || !CD) return
    var hr = this._hero
    var g = c.g
    if (!hr.sf2) hr.sf2 = CD.makeStarfield(77)

    g.fillStyle = '#070810'
    g.fillRect(0, 0, c.w, c.h)
    hr.sf2.draw(g, { x: 0, y: 0, zoom: 1 }, c.w, c.h, t)

    var px = c.w * 0.22, py = c.h * 0.5
    var hx = c.w * 0.78, hy = c.h * 0.46

    g.save()
    g.strokeStyle = 'rgba(120,140,190,0.18)'
    g.lineWidth = 1
    g.setLineDash([3, 7])
    g.beginPath()
    g.ellipse(px, py, 132, 118, 0, 0, Math.PI * 2)
    g.stroke()
    g.restore()

    CD.drawOrbitBody(g, { kind: 'planet', style: 3 }, px, py, 84, t, 3)
    CD.drawOrbitBody(g, { kind: 'blackhole' }, hx, hy, 72, t)

    var crew = [
      { chassis: 'sonnet', anim: 'work', a: 0.9, sp: 0.09 },
      { chassis: 'haiku', anim: 'idle', a: 3.1, sp: 0.11 },
      { chassis: 'opus', anim: 'sleep', a: 5.2, sp: 0.06 },
    ]
    for (var i = 0; i < crew.length; i++) {
      var cr = crew[i]
      var a = cr.a + t * cr.sp
      this.sprite(g, c.dpr, cr.chassis, cr.anim, px + Math.cos(a) * 132, py + Math.sin(a) * 118, 48, t + i)
    }

    // Archived agents circling the drain, dim and near-still.
    var gone = [
      { chassis: 'sonnet', a: 0.7, rad: 118, sp: 0.045 },
      { chassis: 'haiku', a: 3.6, rad: 134, sp: 0.035 },
    ]
    for (var i = 0; i < gone.length; i++) {
      var an = gone[i]
      var aa = an.a + t * an.sp
      this.sprite(g, c.dpr, an.chassis, 'archived', hx + Math.cos(aa) * an.rad, hy + Math.sin(aa) * an.rad * 0.5, 40, t + i * 1.7)
    }

    // The ghost held at the event horizon, mid-drag, waiting on the dialog.
    this.sprite(g, c.dpr, 'haiku', 'drift', hx - 96, hy + 34, 46, t, 0.55)
    g.save()
    g.strokeStyle = 'rgba(255,77,94,0.5)'
    g.lineWidth = 1
    g.setLineDash([2, 5])
    g.beginPath()
    g.arc(hx, hy, 92, 0, Math.PI * 2)
    g.stroke()
    g.restore()

    g.font = '11px "JetBrains Mono", monospace'
    g.textAlign = 'center'
    g.fillStyle = 'rgba(200,210,238,0.45)'
    g.fillText('webapp', px, py + 108)
    g.fillText('black hole (archive agents here)', hx, hy + 116)
  }

  /* ── state cards and deck icons ──────────────────────────────────────── */

  drawCards(t) {
    var defs = [
      ['card-running', 'sonnet', 'work'],
      ['card-attn', 'haiku', 'wave'],
      ['card-idle', 'fable', 'rest'],
      ['card-sleep', 'opus', 'sleep'],
      ['card-fuel', 'haiku', 'drift'],
      ['card-error', 'sonnet', 'error'],
    ]
    for (var i = 0; i < defs.length; i++) {
      var c = this.ctx(defs[i][0])
      if (!c) continue
      c.g.clearRect(0, 0, c.w, c.h)
      if (defs[i][2] === 'wave') this.halo(c.g, c.w / 2, c.h / 2 + 4, 1.4, t, i)
      if (defs[i][2] === 'rest') this.idleGlow(c.g, c.w / 2, c.h / 2 + 4, 1.4)
      this.sprite(c.g, c.dpr, defs[i][1], defs[i][2], c.w / 2, c.h / 2 + 4, 96, t + i * 0.9)
    }
  }

  drawIcons(t) {
    var els = document.querySelectorAll('canvas.ci')
    for (var i = 0; i < els.length; i++) {
      var el = els[i]
      if (!el.id) el.id = 'ci-' + i
      var c = this.ctx(el.id)
      if (!c) continue
      c.g.clearRect(0, 0, c.w, c.h)
      this.sprite(c.g, c.dpr, el.dataset.ch || 'haiku', el.dataset.anim || 'idle', c.w / 2, c.h / 2 + 1, c.w, t + i * 1.3)
    }
  }

  drawAll(t) {
    if (!window.ClawDemo) return
    this.drawHero(t)
    this.drawOrbits(t)
    this.drawCards(t)
    this.drawIcons(t)
  }

  /* ── input ───────────────────────────────────────────────────────────── */

  status(text) {
    var el = document.getElementById('demo-status')
    if (el && el.textContent !== text) el.textContent = text
  }

  attentionList() {
    var out = []
    for (var i = 0; i < CLAW_ROBOTS.length; i++) if (CLAW_ROBOTS[i].state === 'needs_input') out.push(i)
    return out
  }

  nextAttention(dir) {
    var hr = this._hero
    var list = this.attentionList()
    if (!list.length) return
    hr.att = ((hr.att + dir) % list.length + list.length) % list.length
    var i = list[hr.att]
    hr.selected = i
    hr.follow = { type: 'robot', i: i }
    this.status('→ ' + CLAW_ROBOTS[i].title)
  }

  fleetView() {
    var hr = this._hero
    hr.follow = { type: 'fit' }
    hr.selected = -1
    hr.att = -1
    this.status('fleet view')
  }

  heroHit(mx, my, w, h) {
    var hr = this._hero
    var t = (performance.now() - this._t0) / 1000
    var wx = (mx - w / 2) / hr.cam.zoom + hr.cam.x
    var wy = (my - h / 2) / hr.cam.zoom + hr.cam.y
    for (var i = 0; i < CLAW_ROBOTS.length; i++) {
      var pos = this.robotPos(CLAW_ROBOTS[i], t)
      if (Math.hypot(pos.x - wx, pos.y - wy) < 30 / Math.min(1, hr.cam.zoom)) return { kind: 'robot', i: i }
    }
    for (var i = 0; i < CLAW_PLANETS.length; i++) {
      var p = CLAW_PLANETS[i]
      if (Math.hypot(p.x - wx, p.y - wy) < p.r + 16) return { kind: 'planet', i: i }
    }
    return null
  }

  wireInput() {
    var self = this
    document.addEventListener('keydown', function (e) {
      if (e.metaKey || e.ctrlKey || e.altKey) return
      var inDemo = e.target && e.target.closest && e.target.closest('#demo-wrap')
      if (!inDemo) return
      if (e.key === 'n' || e.key === 'N') { e.preventDefault(); self.nextAttention(e.shiftKey ? -1 : 1) }
      else if (e.key === 'Escape') { e.preventDefault(); self.fleetView() }
    })
    document.addEventListener('click', function (e) {
      var el = e.target
      if (!el || !el.closest) return
      if (el.closest('#demo-btn-n')) { self.nextAttention(1); self.focusDemo(); return }
      if (el.closest('#demo-btn-esc')) { self.fleetView(); self.focusDemo(); return }
      if (el.id === 'demo-canvas') {
        var rect = el.getBoundingClientRect()
        var hit = self.heroHit(e.clientX - rect.left, e.clientY - rect.top, rect.width, rect.height)
        if (hit && hit.kind === 'robot') {
          self._hero.selected = hit.i
          self._hero.follow = { type: 'robot', i: hit.i }
          self.status('→ ' + CLAW_ROBOTS[hit.i].title)
        } else if (hit && hit.kind === 'planet') {
          self._hero.selected = -1
          self._hero.follow = { type: 'planet', i: hit.i }
          self.status('→ ' + CLAW_PLANETS[hit.i].label)
        } else {
          self.fleetView()
        }
      }
    })
    document.addEventListener('mousemove', function (e) {
      var el = e.target
      if (!el || el.id !== 'demo-canvas') return
      var rect = el.getBoundingClientRect()
      var hit = self.heroHit(e.clientX - rect.left, e.clientY - rect.top, rect.width, rect.height)
      el.style.cursor = hit ? 'pointer' : 'grab'
    })
  }

  focusDemo() {
    var wrap = document.getElementById('demo-wrap')
    if (wrap) wrap.focus()
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', function () { new FleetDemo() })
} else {
  new FleetDemo()
}
