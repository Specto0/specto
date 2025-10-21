import { BrowserRouter, Routes, Route } from "react-router-dom";
import Home from "./components/Home/Home";
import FilmesDetalhes from "./components/Detalhes/FilmesDetalhes";
import SeriesDetalhes from "./components/Detalhes/SeriesDetalhes"; 
import Filmes from "./components/Filmes/Filmes";       
import Series from "./components/Series/Series";
import Registar from "./components/Registar/Registar";



export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/home" element={<Home />} />
        <Route path="/filme/:id" element={<FilmesDetalhes />} />
        <Route path="/serie/:id" element={<SeriesDetalhes />} />
        <Route path="/filmes" element={<Filmes />} />
        <Route path="/series" element={<Series />} />
        <Route path="/favoritos" element={<Home />} />
        <Route path="/perfil" element={<Home />} />
        <Route path="/Registar" element={<Registar />} />
        <Route path="*" element={<Home />} />
        
      </Routes>
    </BrowserRouter>
  );
}
