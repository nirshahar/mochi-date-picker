// Pure geometry helpers (no DOM). Rects are { x, y, w, h }, viewports { vw, vh }.
window.App = window.App || {};

(function () {
  function overlapArea(a, b, pad = 0) {
    const w = Math.min(a.x + a.w, b.x + b.w + pad) - Math.max(a.x, b.x - pad);
    const h = Math.min(a.y + a.h, b.y + b.h + pad) - Math.max(a.y, b.y - pad);
    return w > 0 && h > 0 ? w * h : 0;
  }

  function rectsOverlap(a, b, pad = 0) {
    return overlapArea(a, b, pad) > 0;
  }

  function clampToViewport(pos, size, vp, margin = 16) {
    const maxX = Math.max(margin, vp.vw - size.w - margin);
    const maxY = Math.max(margin, vp.vh - size.h - margin);
    return {
      x: Math.min(Math.max(pos.x, margin), maxX),
      y: Math.min(Math.max(pos.y, margin), maxY),
    };
  }

  // The corner whose spot overlaps obstacles the least (bottom corners win ties).
  function safeCorner(size, vp, obstacles, { margin = 16, pad = 24 } = {}) {
    const right = vp.vw - size.w - margin;
    const bottom = vp.vh - size.h - margin;
    const candidates = [
      { x: margin, y: bottom }, { x: right, y: bottom },
      { x: margin, y: margin }, { x: right, y: margin },
    ];
    let best = null;
    let bestArea = Infinity;
    candidates.forEach((c) => {
      const p = clampToViewport(c, size, vp, margin);
      const area = obstacles.reduce((sum, o) => sum + overlapArea({ ...p, ...size }, o, pad), 0);
      if (area < bestArea) {
        best = p;
        bestArea = area;
      }
    });
    return best;
  }

  function randomSafeSpot(size, vp, obstacles, { margin = 16, pad = 24, tries = 30, rng = Math.random } = {}) {
    const maxX = vp.vw - size.w - margin;
    const maxY = vp.vh - size.h - margin;
    if (maxX >= margin && maxY >= margin) {
      for (let i = 0; i < tries; i++) {
        const p = { x: margin + rng() * (maxX - margin), y: margin + rng() * (maxY - margin) };
        if (!obstacles.some((o) => rectsOverlap({ ...p, ...size }, o, pad))) return p;
      }
    }
    return safeCorner(size, vp, obstacles, { margin, pad });
  }

  function nearestEdge(rect, vp) {
    const d = {
      left: rect.x,
      right: vp.vw - (rect.x + rect.w),
      bottom: vp.vh - (rect.y + rect.h),
      top: rect.y,
    };
    return Object.keys(d).reduce((best, k) => (d[k] < d[best] ? k : best));
  }

  function contactPoint(rect, edge) {
    const cx = rect.x + rect.w / 2;
    const cy = rect.y + rect.h / 2;
    return {
      left: { x: rect.x, y: cy },
      right: { x: rect.x + rect.w, y: cy },
      top: { x: cx, y: rect.y },
      bottom: { x: cx, y: rect.y + rect.h },
    }[edge];
  }

  // The paw is drawn pointing up with its tip at the top; these angles aim it in from each edge.
  const PAW_ANGLE = { bottom: 0, left: 90, right: -90, top: 180 };

  // Direction a swat from each edge pushes things.
  const PUSH = { left: { x: 1, y: 0 }, right: { x: -1, y: 0 }, top: { x: 0, y: 1 }, bottom: { x: 0, y: -1 } };

  // Where the paw tip sits when hidden just off-screen, or peeking in, lined up with `point`.
  function pawGeometry(edge, point, vp, { out = 20, peek = 34 } = {}) {
    const spots = {
      left: { hidden: { x: -out, y: point.y }, peek: { x: peek, y: point.y } },
      right: { hidden: { x: vp.vw + out, y: point.y }, peek: { x: vp.vw - peek, y: point.y } },
      top: { hidden: { x: point.x, y: -out }, peek: { x: point.x, y: peek } },
      bottom: { hidden: { x: point.x, y: vp.vh + out }, peek: { x: point.x, y: vp.vh - peek } },
    }[edge];
    return { angle: PAW_ANGLE[edge], hidden: spots.hidden, peek: spots.peek };
  }

  // YES grows as configured, but never wider than the screen or taller than its row.
  function fitYesScale(desired, base, vp, { sideRoom = 32, maxHeight = 170 } = {}) {
    const fit = Math.min((vp.vw - sideRoom) / base.w, maxHeight / base.h);
    return Math.max(1, Math.min(desired, fit));
  }

  function distToRect(px, py, r) {
    const dx = Math.max(r.x - px, 0, px - (r.x + r.w));
    const dy = Math.max(r.y - py, 0, py - (r.y + r.h));
    return Math.hypot(dx, dy);
  }

  App.geo = {
    overlapArea, rectsOverlap, clampToViewport, safeCorner, randomSafeSpot,
    nearestEdge, contactPoint, pawGeometry, PUSH, fitYesScale, distToRect,
  };
})();
