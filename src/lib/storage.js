const PRICE_LISTS_KEY = "cosmos.priceLists";

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

