function msToHours(ms) {
  return ms / (1000 * 60 * 60);
}

export function formatHours(ms) {
  const h = msToHours(ms);
  return `${h.toFixed(1)}h`;
}

export function formatMoney(amount) {
  return `${Number(amount).toFixed(2)}`;
}

function safePlanetName(x) {
  if (!x) return undefined;
  if (typeof x === "string") return x.trim();
  if (typeof x === "object" && x.name) return String(x.name).trim();
  return undefined;
}

function safeCompanyName(p) {
  const c = p?.company || p?.company?.company;
  if (!c) return "Unknown";
  if (typeof c === "string") return c;
  return c.name || "Unknown";
}

function makeId() {
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function buildRoutes(priceList) {
  const routes = [];

  for (const leg of priceList?.legs || []) {
    const from = safePlanetName(leg?.routeInfo?.from);
    const to = safePlanetName(leg?.routeInfo?.to);
    const distance = Number(leg?.routeInfo?.distance || 0);

    if (!from || !to) continue;

    for (const p of leg?.providers || []) {
      const companyName = safeCompanyName(p);

      const start = new Date(p?.flightStart).getTime();
      const end = new Date(p?.flightEnd).getTime();
      const durationMs =
        Number.isFinite(start) && Number.isFinite(end) ? Math.max(0, end - start) : 0;

      const price = Number(p?.price);
      if (!Number.isFinite(price)) continue;

      routes.push({
        id: makeId(),
        legId: leg?.id,
        routeId: leg?.routeInfo?.id,
        from,
        to,
        distance,
        providerId: p?.id,
        companyName,
        price,
        durationMs,
        flightStart: p?.flightStart,
        flightEnd: p?.flightEnd,
      });
    }
  }

  return routes;
}

export function getPlanetsFromPriceList(priceList) {
  const s = new Set();
  for (const leg of priceList?.legs || []) {
    const from = safePlanetName(leg?.routeInfo?.from);
    const to = safePlanetName(leg?.routeInfo?.to);
    if (from) s.add(from);
    if (to) s.add(to);
  }
  return Array.from(s).sort();
}

export function getCompaniesFromPriceList(priceList) {
  const s = new Set();
  for (const leg of priceList?.legs || []) {
    for (const p of leg?.providers || []) {
      const name = safeCompanyName(p);
      s.add(name);
    }
  }
  return Array.from(s).sort();
}

export function getReachableDestinations(priceList, origin, maxLegs = 5) {
  if (!priceList || !origin) return [];

  const routes = buildRoutes(priceList);
  const byFrom = new Map();

  for (const e of routes) {
    if (!byFrom.has(e.from)) byFrom.set(e.from, []);
    byFrom.get(e.from).push(e);
  }

  const reachable = new Set();
  let frontier = new Set([origin]);

  for (let depth = 0; depth < maxLegs; depth++) {
    const nextFrontier = new Set();

    for (const node of frontier) {
      const outs = byFrom.get(node) || [];
      for (const e of outs) {
        if (!e.to) continue;
        if (e.to === origin) continue;
        if (!reachable.has(e.to)) {
          reachable.add(e.to);
          nextFrontier.add(e.to);
        }
      }
    }

    frontier = nextFrontier;
    if (frontier.size === 0) break;
  }

  return Array.from(reachable).sort();
}

export function summarizeRoute(legs) {
  const totalPrice = legs.reduce((sum, l) => sum + l.price, 0);
  const totalDistance = legs.reduce((sum, l) => sum + (l.distance || 0), 0);
  const totalDurationMs = legs.reduce((sum, l) => sum + l.durationMs, 0);
  const companies = Array.from(new Set(legs.map((l) => l.companyName)));
  const path = legs.map((l) => `${l.from}→${l.to}`).join(" | ");

  return {
    id: makeId(),
    legs,
    path,
    companies,
    totalPrice,
    totalDistance,
    totalDurationMs,
  };
}

export function findRoutes({
  priceList,
  origin,
  destination,
  maxLegs = 5,
  maxResults = 50,
}) {
  if (!priceList || !origin || !destination) return [];
  if (origin === destination) return [];

  const routes = buildRoutes(priceList);
  const byFrom = new Map();
  for (const e of routes) {
    if (!byFrom.has(e.from)) byFrom.set(e.from, []);
    byFrom.get(e.from).push(e);
  }

  const results = [];

  function dfs(current, pathRoutes, visitedPlanets) {
    if (results.length >= maxResults) return;
    if (pathRoutes.length > maxLegs) return;

    if (current === destination) {
      results.push(summarizeRoute([...pathRoutes]));
      return;
    }

    const nextRoutes = byFrom.get(current) || [];
    for (const e of nextRoutes) {
      if (!e.to) continue;
      if (visitedPlanets.has(e.to)) continue;

      visitedPlanets.add(e.to);
      pathRoutes.push(e);
      dfs(e.to, pathRoutes, visitedPlanets);
      pathRoutes.pop();
      visitedPlanets.delete(e.to);
    }
  }

  dfs(origin, [], new Set([origin]));
  return results;
}
