import { Routes, Route } from 'react-router';
import Layout from './components/Layout';
import Home from './pages/Home';
import Methodology from './pages/Methodology';
import About from './pages/About';

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Home />} />
        <Route path="methodology" element={<Methodology />} />
        <Route path="about" element={<About />} />
      </Route>
    </Routes>
  );
}
