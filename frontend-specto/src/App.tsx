import { BrowserRouter, Routes, Route } from "react-router-dom";
import Home from "./components/Home/Home";
import LandingPage from "./components/LandingPage/LandingPage";
import FilmesDetalhes from "./components/Detalhes/FilmesDetalhes";
import SeriesDetalhes from "./components/Detalhes/SeriesDetalhes";
import Filmes from "./components/Filmes/Filmes";
import Series from "./components/Series/Series";
import Registar from "./components/Registar/Registar";
import Login from "./components/Login/Login";
import Perfil from "./components/Perfil/Perfil";
import PerfilEditar from "./components/Perfil/PerfilEditar";
import ForumList from "./components/Forum/ForumList";
import ForumTopicPage from "./components/Forum/ForumTopicPage";

import AdminDashboard from "./components/Admin/AdminDashboard";


import Footer from "./components/Footer/Footer";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LandingPage />} />
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
        <Route path="/forum" element={<ForumList />} />
        <Route path="/forum/:topicId" element={<ForumTopicPage />} />
        <Route path="/u/:userId" element={<Perfil />} />
        <Route path="/admin" element={<AdminDashboard />} />
        <Route path="*" element={<Home />} />
      </Routes>
      <Footer />
    </BrowserRouter>
  );
}
