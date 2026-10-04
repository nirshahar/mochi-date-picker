const VP = { vw: 1000, vh: 800 };
const seq = (...vals) => { let i = 0; return () => vals[i++ % vals.length]; };

test("geo.rectsOverlap: touching edges don't overlap, padding makes them", () => {
  const a = { x: 0, y: 0, w: 10, h: 10 };
  const b = { x: 10, y: 0, w: 10, h: 10 };
  eq(App.geo.rectsOverlap(a, b), false);
  eq(App.geo.rectsOverlap(a, b, 1), true);
});

test("geo.randomSafeSpot: stays inside the viewport and off obstacles", () => {
  const size = { w: 100, h: 40 };
  const yes = { x: 400, y: 300, w: 200, h: 200 };
  for (let i = 0; i < 200; i++) {
    const p = App.geo.randomSafeSpot(size, VP, [yes]);
    assert(p.x >= 16 && p.y >= 16 && p.x + 100 <= 984 && p.y + 40 <= 784, `out of bounds ${JSON.stringify(p)}`);
    eq(App.geo.rectsOverlap({ ...p, ...size }, yes, 24), false, "overlaps YES");
  }
});

test("geo.randomSafeSpot: retries past a blocked first guess", () => {
  const size = { w: 100, h: 40 };
  const leftHalf = { x: 0, y: 0, w: 500, h: 800 };
  const p = App.geo.randomSafeSpot(size, VP, [leftHalf], { rng: seq(0.1, 0.5, 0.9, 0.5) });
  assert(p.x > 524, `expected the right half, got x=${p.x}`);
});

test("geo.randomSafeSpot: falls back to the emptiest corner when nothing random fits", () => {
  const size = { w: 100, h: 40 };
  const mostOfScreen = { x: 0, y: 0, w: 1000, h: 700 };
  const p = App.geo.randomSafeSpot(size, VP, [mostOfScreen], { rng: () => 0.2 });
  eq(p, { x: 16, y: 744 });
});

test("geo.safeCorner: never leaves the viewport even if every corner is covered", () => {
  const p = App.geo.safeCorner({ w: 100, h: 40 }, VP, [{ x: 0, y: 0, w: 1000, h: 800 }]);
  assert(p.x >= 16 && p.y >= 16 && p.x <= 884 && p.y <= 744, JSON.stringify(p));
});

test("geo.safeCorner: works on a viewport smaller than the button", () => {
  eq(App.geo.safeCorner({ w: 300, h: 40 }, { vw: 200, vh: 100 }, []), { x: 16, y: 44 });
});

test("geo.clampToViewport: pulls an off-screen button back in (window resized)", () => {
  eq(App.geo.clampToViewport({ x: 1200, y: -50 }, { w: 100, h: 40 }, VP), { x: 884, y: 16 });
});

test("geo.nearestEdge: picks the closest side", () => {
  eq(App.geo.nearestEdge({ x: 20, y: 300, w: 100, h: 40 }, VP), "left");
  eq(App.geo.nearestEdge({ x: 880, y: 300, w: 100, h: 40 }, VP), "right");
  eq(App.geo.nearestEdge({ x: 450, y: 740, w: 100, h: 40 }, VP), "bottom");
  eq(App.geo.nearestEdge({ x: 450, y: 5, w: 100, h: 40 }, VP), "top");
});

test("geo.contactPoint: middle of the side facing the edge", () => {
  const r = { x: 100, y: 200, w: 80, h: 40 };
  eq(App.geo.contactPoint(r, "left"), { x: 100, y: 220 });
  eq(App.geo.contactPoint(r, "right"), { x: 180, y: 220 });
  eq(App.geo.contactPoint(r, "top"), { x: 140, y: 200 });
  eq(App.geo.contactPoint(r, "bottom"), { x: 140, y: 240 });
});

test("geo.pawGeometry: hidden just off-screen, peeking just inside", () => {
  const g = App.geo.pawGeometry("right", { x: 700, y: 300 }, VP);
  eq(g.angle, -90);
  eq(g.hidden, { x: 1020, y: 300 });
  eq(g.peek, { x: 966, y: 300 });
  eq(App.geo.pawGeometry("bottom", { x: 700, y: 300 }, VP).hidden, { x: 700, y: 820 });
  eq(App.geo.pawGeometry("left", { x: 700, y: 300 }, VP).angle, 90);
});

test("geo.fitYesScale: grows as asked but never past the screen", () => {
  const base = { w: 150, h: 50 };
  eq(App.geo.fitYesScale(2.2, base, VP), 2.2);
  eq(App.geo.fitYesScale(2.6, base, { vw: 375, vh: 667 }), (375 - 32) / 150);
  eq(App.geo.fitYesScale(2.6, base, { vw: 100, vh: 667 }), 1);
});

test("geo.distToRect: 0 inside, straight-line distance outside", () => {
  const r = { x: 100, y: 100, w: 50, h: 50 };
  eq(App.geo.distToRect(120, 120, r), 0);
  eq(App.geo.distToRect(100, 50, r), 50);
  eq(App.geo.distToRect(180, 190, r), 50);
});
