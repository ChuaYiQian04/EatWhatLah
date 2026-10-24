/* Browser location only; no IP guessing, permission bypass or persistent coordinates. */
window.LocationService = (() => {
  function message(code, protocol = location.protocol) {
    if (code === 1) return protocol === 'file:'
      ? 'Location was blocked. Local files may not receive location permission. Enter coordinates below, or use an HTTPS-hosted copy and allow location.'
      : 'Location permission is blocked. Allow Location in your browser’s site settings and check your device’s location permission, then try again.';
    if (code === 3) return 'Location timed out. Check that device location is on, then retry or enter coordinates below.';
    return 'Your device could not provide a location. Turn on Location Services and allow your browser to use them, or enter coordinates below.';
  }
  function current() {
    return new Promise((resolve, reject) => {
      if (!window.isSecureContext) { reject(new Error('Location requires a secure browser context. Open an HTTPS-hosted copy, or enter coordinates below.')); return; }
      if (!navigator.geolocation) { reject(new Error('This browser does not support location. Enter coordinates below.')); return; }
      const policy = document.permissionsPolicy || document.featurePolicy;
      if (policy?.allowsFeature && !policy.allowsFeature('geolocation')) { reject(new Error('Location is blocked by this page’s host or preview. Open the site in its own tab, or enter coordinates below.')); return; }
      // A separate timer also releases the UI if a browser/provider never calls back.
      let settled = false, timer;
      const finish = (error, position) => { if (settled) return; settled = true; clearTimeout(timer); error ? reject(error) : resolve(position.coords); };
      timer = setTimeout(() => finish(new Error(message(3))), 25000);
      try {
        navigator.geolocation.getCurrentPosition(
          position => finish(null, position),
          error => finish(new Error(message(error.code))),
          { enableHighAccuracy: false, timeout: 20000, maximumAge: 60000 },
        );
      } catch { finish(new Error(message(1))); }
    });
  }
  return { current, message };
})();
