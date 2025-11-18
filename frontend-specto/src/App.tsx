import { BrowserRouter, Routes, Route } from "react-router-dom";
import Home from "./components/Home/Home";
import FilmesDetalhes from "./components/Detalhes/FilmesDetalhes";
import SeriesDetalhes from "./components/Detalhes/SeriesDetalhes"; 
import Filmes from "./components/Filmes/Filmes";       
import Series from "./components/Series/Series";
import Registar from "./components/Registar/Registar";
import Login from "./components/Login/Login";
import Perfil from "./components/Perfil/Perfil";
import PerfilEditar from "./components/Perfil/PerfilEditar";



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
        <Route path="/perfil" element={<Perfil />} />
        <Route path="/perfil/editar" element={<PerfilEditar />} />
        <Route path="/register" element={<Registar />} />
        <Route path="/login" element={<Login />} />
        <Route path="*" element={<Home />} />
        
      </Routes>
    </BrowserRouter>
  );
}
