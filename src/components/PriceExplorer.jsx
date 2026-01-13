import { useEffect, useMemo, useState } from "react";
import { fetchTravelPrices } from "../lib/api";
import {
  loadPriceLists,
  upsertPriceListKeepLast15,
} from "../lib/storage";

export default function PriceExplorer() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [priceLists, setPriceLists] = useState(() => loadPriceLists());

  const activePriceList = useMemo(() => priceLists[0] || null, [priceLists]);

  async function refresh() {
    setError("");
    setLoading(true);
    try {
      const data = await fetchTravelPrices();
      const updatedLists = upsertPriceListKeepLast15(data);
      setPriceLists(updatedLists);
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
      </div>

      <div className="card">
        <h3>Stored Price Lists</h3>
        <p className="small">
          Last 15 lists from local storage
        </p>
        <ul className="small">
          {priceLists.map((p) => (
            <li key={p.id}>
              {p.id} — validUntil: {new Date(p.validUntil).toLocaleString()}
            </li>
          ))}
        </ul>
      </div>
    </>
  );
}
