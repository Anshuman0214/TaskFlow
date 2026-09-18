import { Route, Routes } from "react-router-dom";
import { StatusPage } from "./pages/StatusPage";

function App() {
  return (
    <Routes>
      <Route path="/" element={<StatusPage />} />
    </Routes>
  );
}

export default App;
