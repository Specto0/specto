import { BrowserRouter, Routes, Route } from "react-router-dom";
import Home from "./components/Home/Home";
import FilmesDetalhes from "./components/Detalhes/FilmesDetalhes";
import SeriesDetalhes from "./components/Detalhes/SeriesDetalhes"; 
import Filmes from "./components/Filmes/Filmes";       



export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/home" element={<Home />} />
        <Route path="/filme/:id" element={<FilmesDetalhes />} />
        <Route path="/serie/:id" element={<SeriesDetalhes />} />
        <Route path="/filmes" element={<Filmes />} />
        <Route path="/series" element={<Home />} />
        <Route path="/favoritos" element={<Home />} />
        <Route path="/perfil" element={<Home />} />
        <Route path="*" element={<Home />} />
      </Routes>
    </BrowserRouter>
  );
}
