import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Layout } from "./components/Layout";
import { AppointmentsPage } from "./pages/AppointmentsPage";
import { CreatePage } from "./pages/CreatePage";
import { DictionariesPage } from "./pages/DictionariesPage";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<AppointmentsPage />} />
          <Route path="/create" element={<CreatePage />} />
          <Route path="/dictionaries" element={<DictionariesPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}