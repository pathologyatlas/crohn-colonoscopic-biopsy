/**
 * OSD Auto Scalebar
 * Calibrates the OpenSeadragon scale bar from the slide's own resolution.
 *
 * A DZI pyramid carries no physical units. libvips writes them next to the
 * tiles in `<stain>_files/vips-properties.xml` (xres/yres, pixels per mm).
 * This plugin derives that URL from the viewer's tile source, reads it, checks
 * it belongs to the image actually loaded, and only then draws the bar.
 *
 * It never falls back to a "typical" scanner value: slides in this atlas range
 * from 0.07 to 0.63 um/pixel, so a guessed bar is wrong far more often than
 * right. A slide with no usable sidecar gets no scale bar.
 *
 * Usage (replaces a direct viewer.scalebar({...}) call; same style options,
 * minus pixelsPerMeter):
 *
 *   OSDAutoScalebar(viewer, {
 *     type: OpenSeadragon.ScalebarType.MICROSCOPY,
 *     location: OpenSeadragon.ScalebarLocation.BOTTOM_RIGHT,
 *     minWidth: '120px'
 *   });
 *
 * Call it once per viewer, before or after the image opens. It recalibrates by
 * itself whenever the viewer opens another image (stain switch, sequence
 * mode); calling it again for the same viewer is harmless.
 *
 * Result for other scripts: viewer.atlasCalibration is
 *   { status: 'loading' | 'calibrated' | 'uncalibrated', mpp: <um per pixel> }
 */
var OSDAutoScalebar = (function () {

  // './HE_files/' -> './HE_files/vips-properties.xml'
  function sidecarUrl(viewer) {
    var item = viewer.world && viewer.world.getItemAt(0);
    var src = item && item.source;
    if (!src) return null;
    var base = src.tilesUrl;
    if (!base && src.getTileUrl) {
      var tileUrl = src.getTileUrl(0, 0, 0) || '';
      var cut = tileUrl.indexOf('_files/');
      if (cut !== -1) base = tileUrl.substring(0, cut + 7);
    }
    if (!base) return null;
    return base + (base.charAt(base.length - 1) === '/' ? '' : '/') + 'vips-properties.xml';
  }

  // Pixels per metre from the sidecar text, or null when it cannot be trusted.
  function pixelsPerMeter(xmlText, contentSize) {
    var xml = new DOMParser().parseFromString(xmlText, 'application/xml');
    if (xml.querySelector('parsererror')) return null;
    var props = {};
    xml.querySelectorAll('properties > property').forEach(function (p) {
      var name = p.querySelector('name');
      var value = p.querySelector('value');
      if (name && value) props[name.textContent.trim()] = Number(value.textContent.trim());
    });
    var xres = props.xres, yres = props.yres;
    // xres <= 1 is libvips' placeholder for "the source had no resolution".
    if (!isFinite(xres) || !isFinite(yres) || xres <= 1 || yres <= 1) return null;
    if (Math.abs(xres - yres) > 1e-6 * xres) return null;           // not square pixels
    if (props.width !== contentSize.x || props.height !== contentSize.y) return null;  // other image
    return xres * 1000;
  }

  function calibrate(viewer, style) {
    var url = sidecarUrl(viewer);
    var state = viewer.__autoScalebar;
    if (state.url === url) return;            // already done, or in flight, for this image
    state.url = url;
    viewer.atlasCalibration = { status: 'loading' };
    // Hide the previous image's bar while this one's resolution is fetched.
    if (viewer.scalebarInstance) viewer.scalebar({ pixelsPerMeter: 0 });

    function finish(ppm) {
      if (state.url !== url) return;          // the viewer moved on to another image
      var options = {};
      for (var key in style) options[key] = style[key];
      options.pixelsPerMeter = ppm || 0;      // 0 makes the plugin hide the bar
      viewer.scalebar(options);
      viewer.atlasCalibration = ppm
        ? { status: 'calibrated', mpp: 1e6 / ppm }
        : { status: 'uncalibrated' };
      if (viewer.scalebarInstance) viewer.scalebarInstance.refresh();
    }

    if (!url) { finish(null); return; }
    var size = viewer.world.getItemAt(0).getContentSize();
    fetch(url)
      .then(function (response) { return response.ok ? response.text() : null; })
      .then(function (text) { finish(text ? pixelsPerMeter(text, size) : null); })
      .catch(function () { finish(null); });
  }

  return function (viewer, style) {
    if (!viewer.__autoScalebar) {
      viewer.__autoScalebar = { url: undefined };
      viewer.addHandler('open', function () { calibrate(viewer, style || {}); });
    }
    if (viewer.isOpen()) calibrate(viewer, style || {});
  };
})();
