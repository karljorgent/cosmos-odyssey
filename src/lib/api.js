const API_URL = "/api/api/v1.0/TravelPrices";

export async function fetchTravelPrices() {
  const res = await fetch(API_URL);

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`API ${res.status}: ${text.slice(0, 100)}`);
  }

  return res.json();
}
