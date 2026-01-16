const PRICE_LISTS_KEY = "cosmos.priceLists";
const RESERVATIONS_KEY = "cosmos.reservations";

export function loadPriceLists() {
  try {
    return JSON.parse(localStorage.getItem(PRICE_LISTS_KEY)) || [];
  } catch {
    return [];
  }
}

export function savePriceLists(priceLists) {
  localStorage.setItem(PRICE_LISTS_KEY, JSON.stringify(priceLists));
}

export function upsertPriceListKeepLast15(newList) {
  const all = loadPriceLists();
  const filtered = all.filter((p) => p.id !== newList.id);
  const merged = [newList, ...filtered];
  const trimmed = merged.slice(0, 15);
  savePriceLists(trimmed);
  return trimmed;
}

export function loadReservations() {
  try {
    return JSON.parse(localStorage.getItem(RESERVATIONS_KEY)) || [];
  } catch {
    return [];
  }
}

export function saveReservations(reservations) {
  localStorage.setItem(RESERVATIONS_KEY, JSON.stringify(reservations));
}

export function deleteReservationsNotInPriceLists(priceLists) {
  const keepIds = new Set(priceLists.map((p) => p.id));
  const allRes = loadReservations();
  const kept = allRes.filter((r) => keepIds.has(r.priceListId));
  saveReservations(kept);
  return kept;
}
