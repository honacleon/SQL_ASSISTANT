import { Suspense } from "react";
import { Routes, Route } from "react-router-dom";
import Home from "./components/home";
import DashboardPage from "./pages/DashboardPage";
import { ErrorBoundary } from "@/components/providers/ErrorBoundary";

function App() {
  return (
    <ErrorBoundary>
      <Suspense fallback={<p>Loading...</p>}>
        <>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/dashboard" element={<DashboardPage />} />
          </Routes>
        </>
      </Suspense>
    </ErrorBoundary>
  );
}

export default App;
