/**
 * OSD Middle-Button Pan
 * Sectra-style middle-click pan with Pointer Lock for OpenSeadragon viewers.
 *
 * Usage:
 *   OSDMiddlePan(viewer)
 *   OSDMiddlePan(viewer, { speed: 1.5, maxDelta: 150, cssClass: 'mid-pan' })
 *
 * Options:
 *   speed    - Pan speed multiplier (default: 1.0)
 *   maxDelta - Clamp mouse delta to prevent spikes (default: 100)
 *   cssClass - CSS class added to viewer element during pan (default: 'mid-pan')
 *
 * Behavior:
 *   - Middle-click to activate, click again (any button) to deactivate
 *   - Mouse movement pans the viewport via Pointer Lock (cursor hidden)
 *   - No dependencies other than OpenSeadragon
 */
;(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory()
  else if (typeof define === 'function' && define.amd) define(factory)
  else root.OSDMiddlePan = factory()
})(this, function () {

  function OSDMiddlePan(viewer, opts) {
    opts = opts || {}
    var speed = opts.speed || 1.0
    var maxDelta = opts.maxDelta || 100
    var cssClass = opts.cssClass || 'mid-pan'

    var active = false
    var el = viewer.canvas
    var viewerEl = el.parentNode

    function activate() {
      active = true
      viewerEl.classList.add(cssClass)
      var p = el.requestPointerLock()
      if (p && p.catch) p.catch(function () {})
    }

    function deactivate() {
      if (!active) return
      active = false
      viewerEl.classList.remove(cssClass)
      if (document.pointerLockElement === el)
        document.exitPointerLock()
    }

    function handleDown(e) {
      if (e.button === 1) e.preventDefault()
      if (active) {
        e.stopImmediatePropagation()
        e.stopPropagation()
        e.preventDefault()
        deactivate()
      }
    }

    el.addEventListener('mousedown', handleDown, true)
    el.addEventListener('pointerdown', handleDown, true)

    el.addEventListener('auxclick', function (e) {
      if (e.button !== 1) return
      e.preventDefault()
      if (!active) activate()
    })

    document.addEventListener('pointerlockchange', function () {
      if (document.pointerLockElement !== el && active)
        deactivate()
    })

    document.addEventListener('mousemove', function (e) {
      if (!active || document.pointerLockElement !== el) return
      var mx = Math.max(-maxDelta, Math.min(maxDelta, e.movementX)) * speed
      var my = Math.max(-maxDelta, Math.min(maxDelta, e.movementY)) * speed
      var delta = viewer.viewport.deltaPointsFromPixels(
        new OpenSeadragon.Point(mx, my))
      viewer.viewport.panBy(delta, true)
    })

    return {
      setSpeed: function (s) { speed = s },
      getSpeed: function () { return speed },
      destroy: function () {
        deactivate()
        el.removeEventListener('mousedown', handleDown, true)
        el.removeEventListener('pointerdown', handleDown, true)
      }
    }
  }

  return OSDMiddlePan
})
