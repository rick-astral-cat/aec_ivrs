import { BrowserRouter, Routes, Route, Link } from 'react-router-dom'
import AgenciesPage from './pages/AgenciesPage'
import AgencyDetailPage from './pages/AgencyDetailPage'
import './App.css'

export default function App() {
  return (
    <BrowserRouter>
      <nav>
        <Link to="/">Agencias</Link>
      </nav>
      <main>
        <Routes>
          <Route path="/" element={<AgenciesPage />} />
          <Route path="/agencies/:id" element={<AgencyDetailPage />} />
        </Routes>
      </main>
    </BrowserRouter>
  )
}
