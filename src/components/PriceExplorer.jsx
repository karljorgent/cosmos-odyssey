import React, { useEffect, useMemo, useState } from "react";
import { fetchTravelPrices } from "../lib/api";
import {
  loadPriceLists,
  upsertPriceListKeepLast15,
  deleteReservationsNotInPriceLists,
  loadReservations,
  saveReservations,
} from "../lib/storage";
import {
  findRoutes,
  getPlanetsFromPriceList,
  getCompaniesFromPriceList,
  getReachableDestinations,
  formatHours,
  formatMoney,
  buildRoutes,
} from "../lib/routes";

function isExpired(validUntilIso) {
  return Date.now() > new Date(validUntilIso).getTime();
}

function sortRoutes(routes, sortKey) {
  const copy = [...routes];
  if (sortKey === "price") copy.sort((a, b) => a.totalPrice - b.totalPrice);
  if (sortKey === "distance") copy.sort((a, b) => a.totalDistance - b.totalDistance);
  if (sortKey === "time") copy.sort((a, b) => a.totalDurationMs - b.totalDurationMs);
  return copy;
}

export default function PriceExplorer() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [priceLists, setPriceLists] = useState(() => loadPriceLists());
  const [reservations, setReservations] = useState(() => loadReservations());

  const activePriceList = useMemo(() => priceLists[0] || null, [priceLists]);

  const [origin, setOrigin] = useState("");
  const [destination, setDestination] = useState("");
  const [companyFilter, setCompanyFilter] = useState("");
  const [sortBy, setSortBy] = useState("price");
  const [selectedRouteId, setSelectedRouteId] = useState("");

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");

  async function refresh() {
    setError("");
    setLoading(true);
    try {
      const data = await fetchTravelPrices();
      const updatedLists = upsertPriceListKeepLast15(data);
      setPriceLists(updatedLists);

      const updatedRes = deleteReservationsNotInPriceLists(updatedLists);
      setReservations(updatedRes);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh();
    const id = setInterval(refresh, 60000);
    return () => clearInterval(id);
  }, []);

  const expired = activePriceList ? isExpired(activePriceList.validUntil) : false;

  const planets = useMemo(() => {
    if (!activePriceList) return [];
    return getPlanetsFromPriceList(activePriceList);
  }, [activePriceList]);

  const allCompanies = useMemo(() => {
    if (!activePriceList) return [];
    return getCompaniesFromPriceList(activePriceList);
  }, [activePriceList]);

  const destinationOptions = useMemo(() => {
    if (!activePriceList) return [];
    if (!origin) return planets;

    const reachable = getReachableDestinations(activePriceList, origin, 5);
    return reachable.length ? reachable : planets;
  }, [activePriceList, origin, planets]);

  useEffect(() => {
    if (destination && !destinationOptions.includes(destination)) {
      setDestination("");
    }
  }, [destination, destinationOptions]);

  useEffect(() => {
    setCompanyFilter("");
    setSelectedRouteId("");
  }, [origin, destination]);

  useEffect(() => {
    if (companyFilter && allCompanies.length > 0 && !allCompanies.includes(companyFilter)) {
      setCompanyFilter("");
    }
  }, [companyFilter, allCompanies]);

  const allRoutes = useMemo(() => {
    if (!activePriceList) return [];
    return findRoutes({ priceList: activePriceList, origin, destination, maxLegs: 5, maxResults: 50 });
  }, [activePriceList, origin, destination]);

  const filteredRoutes = useMemo(() => {
    let routes = allRoutes;

    if (companyFilter) {
      routes = routes.filter((r) => r.companies.includes(companyFilter));
    }

    return sortRoutes(routes, sortBy);
  }, [allRoutes, companyFilter, sortBy]);

  const selectedRoute = useMemo(() => {
    return filteredRoutes.find((r) => r.id === selectedRouteId) || null;
  }, [filteredRoutes, selectedRouteId]);

  const routeCount = useMemo(() => {
    if (!activePriceList) return 0;
    return buildRoutes(activePriceList).length;
  }, [activePriceList]);

  const canReserve =
    activePriceList &&
    selectedRoute &&
    firstName.trim() &&
    lastName.trim() &&
    !expired;

  function createReservation() {
    if (!activePriceList || !selectedRoute) return;

    if (isExpired(activePriceList.validUntil)) {
      alert("Price list expired, refresh");
      return;
    }

    const reservation = {
      id: crypto.randomUUID(),
      priceListId: activePriceList.id,
      priceListValidUntil: activePriceList.validUntil,
      createdAt: new Date().toISOString(),

      firstName: firstName.trim(),
      lastName: lastName.trim(),

      routes: selectedRoute.legs.map((l) => ({
        from: l.from,
        to: l.to,
        distance: l.distance,
        providerId: l.providerId,
        companyName: l.companyName,
        price: l.price,
        flightStart: l.flightStart,
        flightEnd: l.flightEnd,
      })),

      totalQuotedPrice: selectedRoute.totalPrice,
      totalQuotedTravelTimeMs: selectedRoute.totalDurationMs,
      transportationCompanyNames: selectedRoute.companies,
    };

    const next = [reservation, ...reservations];
    setReservations(next);
    saveReservations(next);

    alert("Reservation saved!");
    setSelectedRouteId("");
    setFirstName("");
    setLastName("");
  }

  return (
    <>
      <div className="card">
        <div className="row" style={{ justifyContent: "space-between" }}>
          <div>
            <h3>
              Active Price List
            </h3>
            {activePriceList ? (
              <div className="small">
                <div><b>ID:</b> {activePriceList.id}</div>
                <div><b>Valid until:</b> {new Date(activePriceList.validUntil).toString()}</div>
              </div>
            ) : (
              <p className="small">No price list loaded yet.</p>
            )}
          </div>

          <button onClick={refresh} disabled={loading}>
            {loading ? "Loading..." : "Refresh"}
          </button>
        </div>

        {error ? <p style={{ color: "red" }}>{error}</p> : null}
        {expired ? (
          <p style={{ color: "yellow" }}>
            This price list is expired - reservations are blocked until you refresh and get a new one.
          </p>
        ) : null}
      </div>

      <div className="card">
        <h3>Search routes</h3>
        <div className="row">
          <label>
            Origin
            <select value={origin} onChange={(e) => setOrigin(e.target.value)}>
              <option value="">Select</option>
              {planets.map((p) => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          </label>

          <label>
            Destination
            <select value={destination} onChange={(e) => setDestination(e.target.value)}>
              <option value="">Select</option>
              {planets.map((p) => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          </label>

          <label>
            Filter company
            <select value={companyFilter} onChange={(e) => setCompanyFilter(e.target.value)}>
              <option value="">All</option>
              {allCompanies.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </label>

          <label>
            Sort by
            <select value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
              <option value="price">Price</option>
              <option value="distance">Distance</option>
              <option value="time">Travel time</option>
            </select>
          </label>
        </div>

        <p className="small">
          Found routes: <b>{filteredRoutes.length}</b>
        </p>

        {filteredRoutes.length === 0 ? (
          <p className="small">Choose origin and destination to see route options.</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Select</th>
                <th>Path</th>
                <th>Companies</th>
                <th>Total price</th>
                <th>Total distance</th>
                <th>Total travel time</th>
              </tr>
            </thead>
            <tbody>
              {filteredRoutes.map((r) => (
                <tr key={r.id}>
                  <td>
                    <input
                      type="radio"
                      name="route"
                      checked={selectedRouteId === r.id}
                      onChange={() => setSelectedRouteId(r.id)}
                    />
                  </td>
                  <td className="small">
                    <div><b>{r.path}</b></div>
                    <div>
                      Legs: {r.legs.length}
                    </div>
                  </td>
                  <td className="small">{r.companies.join(", ")}</td>
                  <td>{formatMoney(r.totalPrice)}</td>
                  <td>{r.totalDistance.toLocaleString()}</td>
                  <td>{formatHours(r.totalDurationMs)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="card">
        <h3>Make reservation</h3>

        {!selectedRoute ? (
          <p className="small">Select a route above to reserve.</p>
        ) : (
          <>
            <p className="small">
              <b>Selected:</b> {selectedRoute.path} <br />
              <b>Total:</b> {formatMoney(selectedRoute.totalPrice)} - {formatHours(selectedRoute.totalDurationMs)} -{" "}
              {selectedRoute.totalDistance.toLocaleString()} km
            </p>

            <div className="row">
              <label>
                First name
                <input value={firstName} onChange={(e) => setFirstName(e.target.value)} />
              </label>

              <label>
                Last name
                <input value={lastName} onChange={(e) => setLastName(e.target.value)} />
              </label>

              <div style={{ alignSelf: "end" }}>
                <button onClick={createReservation} disabled={!canReserve}>
                  Reserve
                </button>
              </div>
            </div>

            {expired ? (
              <p className="small" style={{ color: "#ffd39a" }}>
                Reservation disabled: price list expired.
              </p>
            ) : null}
          </>
        )}
      </div>

      <div className="card">
        <h3>Your reservations</h3>
        <p className="small">
          Reservations are stored if price list stored.
        </p>

        {reservations.length === 0 ? (
          <p className="small">No reservations yet.</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Route(s)</th>
                <th>Companies</th>
                <th>Total quoted</th>
                <th>Travel time</th>
                <th>PriceList</th>
              </tr>
            </thead>
            <tbody>
              {reservations.map((r) => (
                <tr key={r.id}>
                  <td>{r.firstName} {r.lastName}</td>
                  <td className="small">
                    {r.routes.map((x, idx) => (
                      <div key={idx}>
                        {x.from}→{x.to} ({formatMoney(x.price)})
                      </div>
                    ))}
                  </td>
                  <td className="small">{r.transportationCompanyNames.join(", ")}</td>
                  <td>{formatMoney(r.totalQuotedPrice)}</td>
                  <td>{formatHours(r.totalQuotedTravelTimeMs)}</td>
                  <td className="small">
                    <div>{r.priceListId}</div>
                    <div>validUntil: {new Date(r.priceListValidUntil).toLocaleString()}</div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="card">
        <h3>Stored price lists (last 15)</h3>
        <ul className="small">
          {priceLists.map((p) => (
            <li key={p.id}>
              {p.id} | validUntil: {new Date(p.validUntil).toLocaleString()}
            </li>
          ))}
        </ul>
      </div>
    </>
  );
}
