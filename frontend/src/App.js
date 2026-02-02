import "@/App.css";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import TradingDashboard from "./pages/TradingDashboard";
import { Toaster } from "./components/ui/sonner";

function App() {
  return (
    <div className="App min-h-screen bg-background">
      <div className="noise-overlay" />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<TradingDashboard />} />
        </Routes>
      </BrowserRouter>
      <Toaster position="top-right" theme="dark" />
    </div>
  );
}

export default App;
