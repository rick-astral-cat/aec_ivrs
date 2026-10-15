import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Box, Button, Chip, IconButton, Paper, Table, TableBody,
  TableCell, TableContainer, TableHead, TableRow, Tooltip, Typography,
} from '@mui/material'
import AddIcon from '@mui/icons-material/Add'
import EditIcon from '@mui/icons-material/Edit'
import DeleteIcon from '@mui/icons-material/Delete'
import { getAgencies, deleteAgency } from '../api/agencies'

export default function AgenciesPage() {
  const [agencies, setAgencies] = useState([])
  const navigate = useNavigate()

  const load = () => getAgencies().then(r => setAgencies(r.data))
  useEffect(() => { load() }, [])

  const handleDelete = async (id) => {
    if (!confirm('¿Eliminar agencia?')) return
    await deleteAgency(id)
    load()
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
        <Typography variant="h5" fontWeight={600}>Agencias</Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => navigate('/agencies/new')}
        >
          Nueva agencia
        </Button>
      </Box>

      <TableContainer component={Paper} elevation={0} sx={{ border: '1px solid', borderColor: 'divider' }}>
        <Table size="small">
          <TableHead>
            <TableRow sx={{ bgcolor: 'grey.50' }}>
              <TableCell><strong>Nombre</strong></TableCell>
              <TableCell><strong>Abrev.</strong></TableCell>
              <TableCell><strong>Región</strong></TableCell>
              <TableCell><strong>Horario</strong></TableCell>
              <TableCell><strong>IVR</strong></TableCell>
              <TableCell align="right"><strong>Acciones</strong></TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {agencies.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} align="center" sx={{ py: 4, color: 'text.secondary' }}>
                  No hay agencias registradas
                </TableCell>
              </TableRow>
            )}
            {agencies.map(a => (
              <TableRow key={a.id} hover>
                <TableCell>{a.name}</TableCell>
                <TableCell>
                  <Chip label={a.abbreviation} size="small" variant="outlined" />
                </TableCell>
                <TableCell>{a.region}</TableCell>
                <TableCell>
                  {a.has_schedule
                    ? <Chip label={a.business_hours} size="small" color="success" variant="outlined" />
                    : <Chip label="Sin horario" size="small" variant="outlined" />}
                </TableCell>
                <TableCell>
                  {a.ivr
                    ? <Chip label="Configurado" size="small" color="primary" />
                    : <Chip label="Sin IVR" size="small" />}
                </TableCell>
                <TableCell align="right">
                  <Tooltip title="Editar">
                    <IconButton size="small" onClick={() => navigate(`/agencies/${a.id}`)}>
                      <EditIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Eliminar">
                    <IconButton size="small" color="error" onClick={() => handleDelete(a.id)}>
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  )
}
