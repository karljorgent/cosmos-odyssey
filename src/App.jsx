import PriceExplorer from "./components/PriceExplorer";

export default function App() {
  return (
    <div className="container">
      <header className="header">
        <h1>Cosmos Odyssey</h1>
        <p>Solar System Travel Deals</p>
      </header>

      <main>
        <PriceExplorer />
      </main>

      <footer className="footer">
        <small>Data from Cosmos Odyssey API</small>
      </footer>
    </div>
  );
}
