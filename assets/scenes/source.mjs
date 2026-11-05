// Figure: source. The reference for every other figure's level of light.
export default (K) => {
  const { TAU, rng, clamp, ease, glow, spark, light } = K;
  return {
    // A ball of light fibres leaving one point, like the README banner but alive: the ball turns in depth, a wave of colour
    // crosses it, light runs along each fibre and makes its tip flare. The pointer turns the ball; a touch sends a pulse.
    source() {
      const r = rng(11), N = 560, golden = Math.PI * (3 - Math.sqrt(5));
      const fibres = Array.from({ length: N }, (_, i) => {
        const z = 1 - (2 * (i + .5)) / N, q = Math.sqrt(1 - z * z), phi = i * golden + (r() - .5) * .1;
        return {
          v: [Math.cos(phi) * q, Math.sin(phi) * q, z], len: .78 + .22 * r(), sag: .6 + .4 * r(),
          hue: .34 * ((Math.sin(phi) * q + 1) / 2) + .1 * (phi % TAU) / TAU + .05 * r(), pulse: r() * 5.2 + r() * 15.6,
        };
      });
      const stars = Array.from({ length: 160 }, () => [r() * 600, r() * 600, .3 + r() ** 3 * 1.1, r() * TAU, 3 + r() * 5]);
      const PERIOD = 18, PULSE = 5.2, R = 238;
      let yaw = 0, pitch = 0, burst = -99, lastClick = null;
      return (g, c, t, s) => {
        yaw = ease(s, yaw, s.x == null ? 0 : ((s.x - 300) / 300) * .9, .05);
        pitch = ease(s, pitch, s.y == null ? 0 : ((s.y - 300) / 300) * .6, .05);
        if (s.click && s.click !== lastClick) { lastClick = s.click; burst = t; }
        const spin = t * TAU / 140 + yaw, tilt = .35 + pitch, breath = 1 + .025 * Math.sin(t * TAU / 10);
        const cs = Math.cos(spin), sn = Math.sin(spin), ct = Math.cos(tilt), st = Math.sin(tilt);
        // the night behind
        g.fillStyle = c.ink;
        for (const [x, y, size, ph, per] of stars) {
          g.globalAlpha = .08 + .4 * (.5 + .5 * Math.sin(t * TAU / per + ph));
          g.beginPath(); g.arc(x, y, size, 0, TAU); g.fill();
        }
        g.globalAlpha = 1;
        // batched by colour and depth: one path per bucket and per pass keeps hundreds of fibres cheap
        const HB = 24, DB = 4, buckets = Array.from({ length: HB * DB }, () => ({ lines: [], runs: [], tips: [] }));
        for (const f of fibres) {
          let [x, y, z] = f.v;
          [x, z] = [x * cs + z * sn, -x * sn + z * cs];
          [y, z] = [y * ct - z * st, y * st + z * ct];
          const depth = (z + 1) / 2, L = R * f.len * breath, tx = 300 + x * L, ty = 300 + y * L;
          // real fibres sag: the middle drops, more for the ones that leave sideways
          const qx = 300 + x * L * .5, qy = 300 + y * L * .45 + 30 * (1 - Math.abs(y)) * f.sag;
          const h = ((((f.hue - t / PERIOD) % 1) + 1) % 1), b = buckets[Math.min(DB - 1, Math.floor(depth * DB)) * HB + Math.floor(h * HB)];
          b.lines.push(qx, qy, tx, ty);
          // the light that runs out along the fibre, and the tip that flares when it arrives
          const ph = ((((t - f.pulse) % PULSE) + PULSE) % PULSE) / PULSE;
          const sent = clamp(1 - (t - burst) / 1.6), u = Math.max(ph < .62 ? ph / .62 : -1, sent > 0 ? 1 - sent : -1);
          if (u >= 0 && u <= 1) { const a = 1 - u; b.runs.push(a * a * 300 + 2 * a * u * qx + u * u * tx, a * a * 300 + 2 * a * u * qy + u * u * ty); }
          b.tips.push(tx, ty, (ph >= .62 ? 1 - (ph - .62) / .38 : 0) * .6 + sent * .8);
        }
        light(g);
        glow(g, 300, 300, 330, c.heat(.25), .5);
        buckets.forEach((b, i) => {
          if (!b.lines.length) return;
          const depth = (Math.floor(i / HB) + .5) / DB, col = c.hue((i % HB + .5) / HB);
          g.strokeStyle = g.fillStyle = col;
          g.lineWidth = .4 + 1.1 * depth;
          g.globalAlpha = .07 + .22 * depth;
          g.beginPath();
          for (let k = 0; k < b.lines.length; k += 4) { g.moveTo(300, 300); g.quadraticCurveTo(b.lines[k], b.lines[k + 1], b.lines[k + 2], b.lines[k + 3]); }
          g.stroke();
          g.globalAlpha = .35 + .4 * depth;
          g.beginPath();
          for (let k = 0; k < b.runs.length; k += 2) { g.moveTo(b.runs[k] + 3, b.runs[k + 1]); g.arc(b.runs[k], b.runs[k + 1], 1.6 + 2.2 * depth, 0, TAU); }
          g.fill();
          // the tip: a bokeh of three discs, like a fibre's end seen out of focus; flaring tips get their own pass
          for (const [r0, a0, hot] of [[7 + 9 * depth, .05 + .09 * depth, 0], [2.4 + 3 * depth, .16 + .3 * depth, 0], [7 + 9 * depth, .1 + .1 * depth, 1], [2.4 + 3 * depth, .25 + .3 * depth, 1]]) {
            g.globalAlpha = a0;
            g.beginPath();
            for (let k = 0; k < b.tips.length; k += 3) if (!hot || b.tips[k + 2] > .25) { g.moveTo(b.tips[k] + r0, b.tips[k + 1]); g.arc(b.tips[k], b.tips[k + 1], r0, 0, TAU); }
            g.fill();
          }
          g.fillStyle = '#fff6ee';
          g.globalAlpha = .3 + .5 * depth;
          g.beginPath();
          for (let k = 0; k < b.tips.length; k += 3) { const r0 = (.7 + 1.2 * depth) * (1 + b.tips[k + 2]); g.moveTo(b.tips[k] + r0, b.tips[k + 1]); g.arc(b.tips[k], b.tips[k + 1], r0, 0, TAU); }
          g.fill();
        });
        // the Source itself: a heartbeat
        const beat = 1 + .16 * Math.exp(-(((t % 3.4) - .45) ** 2) * 40) + .07 * Math.exp(-(((t % 3.4) - 1.3) ** 2) * 40);
        glow(g, 300, 300, 120 * beat, c.mark, .55);
        glow(g, 300, 300, 34 * beat, c.heat(.8), .9);
        spark(g, 300, 300, 6 * beat, c.mark, 1);
        light(g, false);
        g.globalAlpha = 1;
      };
    },
  };
};

export const FROZEN = { source: 48 };
