import { BrowserRouter, Routes, Route } from "react-router-dom";
import Home from "./components/Home/Home";
import FilmesDetalhes from "./components/Detalhes/FilmesDetalhes";
import SeriesDetalhes from "./components/Detalhes/SeriesDetalhes";        


export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/filme/:id" element={<FilmesDetalhes />} />
        <Route path="/serie/:id" element={<SeriesDetalhes />} />
      </Routes>
    </BrowserRouter>
  );
}
