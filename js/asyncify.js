// Asyncify driver: lets the debugger's blocking Sleep() inside wasm return to JavaScript
// and continue later from the same point (binaryen --asyncify, import env.web_sleep).
(function (root) {
  'use strict';
  const STACK = 256 * 1024;

  function create() {
    let E = null, data = 0;
    let rewinding = false;
    const st = { suspended: null, wakeAt: 0 }; // suspended: name of the export that is paused

    function init(exports) {
      E = exports;
      data = E.malloc(STACK + 8);
    }
    // import: env.web_sleep(ms)
    function web_sleep(ms) {
      if (rewinding) { E.asyncify_stop_rewind(); rewinding = false; return; }
      const v = new Int32Array(E.memory.buffer, data, 2);
      v[0] = data + 8; v[1] = data + 8 + STACK;
      st.wakeAt = (typeof performance !== 'undefined' ? performance.now() : Date.now()) + ms;
      E.asyncify_start_unwind(data);
    }
    // call an export; returns { done, value }. If it went to sleep, done = false.
    function call(name, ...args) {
      const value = E[name](...args);
      if (E.asyncify_get_state() === 1) { E.asyncify_stop_unwind(); st.suspended = { name, args }; return { done: false }; }
      return { done: true, value };
    }
    // continue the paused export
    function resume() {
      const s = st.suspended; st.suspended = null;
      rewinding = true;
      E.asyncify_start_rewind(data);
      return call(s.name, ...s.args);
    }
    return { init, web_sleep, call, resume, state: st, get suspended() { return !!st.suspended; } };
  }

  const api = { create };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.UnrealAsyncify = api;
})(typeof self !== 'undefined' ? self : this);
