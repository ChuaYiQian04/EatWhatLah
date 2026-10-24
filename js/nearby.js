window.Nearby = (() => {
  const cache = new Map();
  const services = {
    primary: 'https://overpass-api.de/api/interpreter',
    alternate: 'https://overpass.private.coffee/api/interpreter',
  };
  const rad = (d) => (d * Math.PI) / 180;
  function distance(a, b, c, d) {
    const x =
      Math.sin(rad(c - a) / 2) ** 2 +
      Math.cos(rad(a)) * Math.cos(rad(c)) * Math.sin(rad(d - b) / 2) ** 2;
    return (
      6371000 * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(Math.max(0, 1 - x)))
    );
  }
  function mapLink(place) {
    return (
      "https://www.google.com/maps/search/?api=1&query=" +
      encodeURIComponent(place.name + " " + place.lat + "," + place.lon)
    );
  }
  async function search(lat, lon, radius, service = 'primary') {
    if (
      !Number.isFinite(lat) ||
      !Number.isFinite(lon) ||
      Math.abs(lat) > 90 ||
      Math.abs(lon) > 180 ||
      ![1000, 3000, 5000, 10000].includes(radius) || !Object.hasOwn(services, service)
    )
      throw new Error(
        "Enter a latitude from −90 to 90 and longitude from −180 to 180.",
      );
    const key = [lat.toFixed(4), lon.toFixed(4), radius, service].join(":");
    const existing = cache.get(key);
    if (existing && Date.now() - existing.time < 300000) return existing.items;
    const controller = new AbortController(),
      timer = setTimeout(() => controller.abort(), 30000);
    try {
      const query = `[out:json][timeout:22];nwr[amenity~"^(restaurant|cafe|fast_food)$"](around:${radius},${lat},${lon});out center tags 150;`;
      const response = await fetch(services[service], {
        method: "POST",
        body: new URLSearchParams({ data: query }),
        signal: controller.signal,
      });
      if (!response.ok)
        throw new Error(
          response.status === 429
            ? "The public search service is busy. Wait a minute, then retry."
            : `The nearby search service returned an error (${response.status}). Retry later or try the alternate service.`,
        );
      const data = await response.json();
      if (!Array.isArray(data.elements))
        throw new Error(
          "The search service returned an unexpected response. Please retry.",
        );
      if (data.remark)
        throw new Error(
          "The public search timed out or reached its limits. Try a smaller radius.",
        );
      const seen = new Set(),
        items = [];
      for (const e of data.elements) {
        const point = e.type === "node" ? e : e.center,
          tag = e.tags || {};
        if (
          !point ||
          !Number.isFinite(point.lat) ||
          !Number.isFinite(point.lon)
        )
          continue;
        const name =
          typeof tag.name === "string" && tag.name.trim()
            ? tag.name.trim()
            : `Unnamed ${tag.amenity === "cafe" ? "café" : tag.amenity === "fast_food" ? "fast-food outlet" : "restaurant"}`;
        const dedup =
          name.toLowerCase() +
          ":" +
          point.lat.toFixed(4) +
          ":" +
          point.lon.toFixed(4);
        if (seen.has(dedup)) continue;
        seen.add(dedup);
        items.push({
          id: "nearby-" + e.type + "-" + e.id,
          name,
          category:
            tag.amenity === "cafe"
              ? "Café"
              : tag.amenity === "fast_food"
                ? "Fast food"
                : "Restaurant",
          lat: point.lat,
          lon: point.lon,
          distance: distance(lat, lon, point.lat, point.lon),
          nearby: true,
        });
      }
      items.sort((a, b) => a.distance - b.distance);
      cache.set(key, { time: Date.now(), items });
      return items;
    } catch (error) {
      if (error.name === "AbortError")
        throw new Error(
          "Search took too long. Try a smaller radius or retry later.",
        );
      if (error instanceof TypeError)
        throw new Error(
          "Could not connect. Check your internet connection. Your browser may block this request (CORS), or the public service may be offline.",
        );
      throw error;
    } finally {
      clearTimeout(timer);
    }
  }
  return { search, distance, mapLink };
})();
