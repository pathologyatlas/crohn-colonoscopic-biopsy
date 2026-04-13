/**
 * OSD Keyboard Navigation
 * WASD / Arrow key pan with diagonal support + Z/X zoom for OpenSeadragon.
 *
 * Usage:
 *   var nav = OSDKeyboardNav(viewer)
 *   var nav = OSDKeyboardNav(viewer, { panStep: 0.004, zoomFactor: 1.015 })
 *
 * The returned object exposes panStep and zoomFactor as writable
 * properties so the UI can adjust speed at runtime:
 *   nav.panStep = 0.001;
 *   nav.zoomFactor = 1.005;
 *
 * Options:
 *   panStep    - Pan distance per frame (default: 0.0025)
 *   zoomFactor - Zoom multiplier per frame (default: 1.01)
 */
var OSDKeyboardNav = (function () {
  var SQRT2_INV = 1 / Math.SQRT2;

  function init(viewer, opts) {
    opts = opts || {};

    var nav = {
      panStep: opts.panStep || 0.0025,
      zoomFactor: opts.zoomFactor || 1.01,
      destroy: null
    };

    var keys = {};
    var animId = null;

    function tick() {
      var step = nav.panStep;
      var dx = 0, dy = 0;
      // Additive: pressing opposite keys cancels out to zero
      if (keys['w'] || keys['arrowup'])    dy -= step;
      if (keys['s'] || keys['arrowdown'])  dy += step;
      if (keys['a'] || keys['arrowleft'])  dx -= step;
      if (keys['d'] || keys['arrowright']) dx += step;
      // Normalize diagonal so it isn't ~1.41x faster than cardinal
      if (dx !== 0 && dy !== 0) {
        dx *= SQRT2_INV;
        dy *= SQRT2_INV;
      }
      if (dx !== 0 || dy !== 0)
        viewer.viewport.panBy(new OpenSeadragon.Point(dx, dy), false);
      if (keys['z']) viewer.viewport.zoomBy(nav.zoomFactor);
      if (keys['x']) viewer.viewport.zoomBy(1 / nav.zoomFactor);
      if (dx === 0 && dy === 0 && !keys['z'] && !keys['x']) { animId = null; return; }
      animId = requestAnimationFrame(tick);
    }

    function onKeyDown(e) {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' ||
          e.target.tagName === 'SELECT' || e.target.isContentEditable) return;
      var k = e.key.toLowerCase();
      if (k === 'w' || k === 'a' || k === 's' || k === 'd' ||
          k === 'arrowup' || k === 'arrowdown' || k === 'arrowleft' || k === 'arrowright' ||
          k === 'z' || k === 'x') {
        e.preventDefault();
        keys[k] = true;
        if (!animId) animId = requestAnimationFrame(tick);
      }
    }

    function onKeyUp(e) {
      delete keys[e.key.toLowerCase()];
    }

    function onBlur() { keys = {}; }

    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('keyup', onKeyUp);
    window.addEventListener('blur', onBlur);

    nav.destroy = function () {
      keys = {};
      if (animId) { cancelAnimationFrame(animId); animId = null; }
      document.removeEventListener('keydown', onKeyDown);
      document.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('blur', onBlur);
    };

    return nav;
  }

  return init;
})();
