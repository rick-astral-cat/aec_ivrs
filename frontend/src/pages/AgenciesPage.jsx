import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { getAgencies, deleteAgency } from '../api/agencies'

export default function AgenciesPage() {
  const [agencies, setAgencies] = useState([])

  const load = () => getAgencies().then(r => setAgencies(r.data))

  useEffect(() => { load() }, [])

  const handleDelete = async (id) => {
    if (!confirm('¿Eliminar agencia?')) return
    await deleteAgency(id)
    load()
  }

  return (
    <div>
      <h1>Agencias Dalton</h1>
      <Link to="/agencies/new">+ Nueva agencia</Link>
      <table>
        <thead>
          <tr>
            <th>Nombre</th><th>Abrev.</th><th>Región</th><th>Acciones</th>
          </tr>
        </thead>
        <tbody>
          {agencies.map(a => (
            <tr key={a.id}>
              <td>{a.name}</td>
              <td>{a.abbreviation}</td>
              <td>{a.region}</td>
              <td>
                <Link to={`/agencies/${a.id}`}>Ver / Editar</Link>
                {' '}
                <button onClick={() => handleDelete(a.id)}>Eliminar</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
