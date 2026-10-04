// Tiny in-browser test harness. Run with: python3 tests/run.py
(function () {
  const tests = [];
  const errors = [];
  window.addEventListener("error", (e) => {
    errors.push(`error: ${e.message} (${(e.filename || "").split("/").pop()}:${e.lineno})`);
  });
  window.addEventListener("unhandledrejection", (e) => {
    errors.push(`unhandled rejection: ${e.reason && e.reason.message ? e.reason.message : e.reason}`);
  });

  window.test = (name, fn) => tests.push({ name, fn });
  window.assert = (cond, msg = "assertion failed") => {
    if (!cond) throw new Error(msg);
  };
  window.eq = (actual, expected, msg = "") => {
    const a = JSON.stringify(actual);
    const e = JSON.stringify(expected);
    if (a !== e) throw new Error(`${msg ? `${msg}: ` : ""}expected ${e}, got ${a}`);
  };

  window.runTests = async function () {
    const out = [];
    let failed = 0;
    for (const t of tests) {
      try {
        await t.fn();
        out.push(`PASS ${t.name}`);
      } catch (err) {
        failed += 1;
        out.push(`FAIL ${t.name} — ${err.message}`);
      }
    }
    await new Promise((r) => setTimeout(r, 50)); // let late rejections surface
    errors.forEach((m) => out.push(`FAIL ${m}`));
    failed += errors.length;
    out.push(failed ? `${failed} FAILED (${tests.length} tests)` : `ALL ${tests.length} PASSED`);
    document.getElementById("results").textContent = out.join("\n");
  };
})();
