import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Alert, Box, Button, Chip, CircularProgress, IconButton, Paper, Tooltip, Typography,
} from '@mui/material'
import { DataGrid, useGridApiRef } from '@mui/x-data-grid'
import { esES } from '@mui/x-data-grid/locales'
import AddIcon from '@mui/icons-material/Add'
import EditIcon from '@mui/icons-material/Edit'
import DeleteIcon from '@mui/icons-material/Delete'
import ContentCopyIcon from '@mui/icons-material/ContentCopy'
import VisibilityIcon from '@mui/icons-material/Visibility'
import { getAgencies, getAgency, deleteAgency, createAgency } from '../api/agencies'
import { PERMISSIONS } from '../auth/permissions'
import { usePermission } from '../hooks/usePermission'
import {
  IVR_STATUS, SCHEDULE_STATUS, buildAgencyCopy, ivrStatus, loadGridState,
  regionOptions, saveGridState, scheduleParts, scheduleStatus,
} from '../components/agencies/agencyGridUtils'

const LOCALE_TEXT = esES.components.MuiDataGrid.defaultProps.localeText
const PAGE_SIZE_OPTIONS = [10, 25, 50, 100]

// Estado inicial cuando no hay uno guardado en la sesión.
const DEFAULT_GRID_STATE = {
  pagination: { paginationModel: { page: 0, pageSize: 25 } },
  sorting: { sortModel: [{ field: 'name', sort: 'asc' }] },
  columns: { columnVisibilityModel: { after_hours_mailbox: false } },
}

const SCHEDULE_CHIP_COLOR = {
  [SCHEDULE_STATUS.INCOMPLETE]: 'warning',
  [SCHEDULE_STATUS.NONE]: 'default',
}

function ScheduleCell({ row }) {
  const status = scheduleStatus(row)
  if (status !== SCHEDULE_STATUS.CONFIGURED) {
    return <Chip label={status} size="small" color={SCHEDULE_CHIP_COLOR[status]} variant="outlined" />
  }
  // Cada grupo "L–V 08:00-14:00, 16:00-19:00" en su propio chip.
  return (
    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
      {scheduleParts(row).map((part, i) => (
        <Chip key={i} label={part} size="small" color="success" variant="outlined" />
      ))}
    </Box>
  )
}

export default function AgenciesPage() {
  const [agencies, setAgencies] = useState([])
  const [loaded, setLoaded] = useState(false)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(null)
  const [copyingId, setCopyingId] = useState(null)
  const [initialState] = useState(() => loadGridState() ?? DEFAULT_GRID_STATE)
  const apiRef = useGridApiRef()
  const navigate = useNavigate()
  const canCreate = usePermission(PERMISSIONS.AGENCIES_CREATE)
  const canUpdate = usePermission(PERMISSIONS.AGENCIES_UPDATE)
  const canDelete = usePermission(PERMISSIONS.AGENCIES_DELETE)

  const fetchAgencies = useCallback(() => getAgencies()
    .then(r => { setAgencies(r.data); setLoadError(null); setLoaded(true) })
    .catch(() => setLoadError('No se pudieron cargar las agencias.'))
    .finally(() => setLoading(false)), [])

  // Recarga tras eliminar o al reintentar (la carga inicial ya arranca en loading).
  const load = useCallback(() => {
    setLoading(true)
    return fetchAgencies()
  }, [fetchAgencies])

  useEffect(() => { fetchAgencies() }, [fetchAgencies])

  // Guarda filtros, orden y página al salir de la vista (p. ej. al abrir el
  // detalle de una agencia) o al recargar la pestaña.
  // Antes de la primera carga no se guarda nada, para no pisar el estado
  // guardado con el del grid vacío.
  const loadedRef = useRef(false)
  useEffect(() => { loadedRef.current = loaded }, [loaded])
  useLayoutEffect(() => {
    const save = () => {
      if (loadedRef.current && apiRef.current?.exportState) {
        saveGridState(apiRef.current.exportState())
      }
    }
    window.addEventListener('beforeunload', save)
    return () => {
      window.removeEventListener('beforeunload', save)
      save()
    }
  }, [apiRef])

  const handleDelete = useCallback(async (id) => {
    if (!confirm('¿Eliminar agencia?')) return
    try {
      await deleteAgency(id)
      load()
    } catch (err) {
      alert(err.response?.status === 403
        ? 'No tienes permiso para eliminar agencias.'
        : 'No se pudo eliminar la agencia.')
    }
  }, [load])

  // El listado no trae el árbol IVR: la copia se arma desde el detalle completo.
  const handleCopy = useCallback(async (id) => {
    setCopyingId(id)
    try {
      const { data: agency } = await getAgency(id)
      const { data } = await createAgency(buildAgencyCopy(agency))
      navigate(`/agencies/${data.id}`)
    } catch (err) {
      alert(err.response?.status === 403
        ? 'No tienes permiso para crear agencias.'
        : 'No se pudo copiar la agencia. Revisa que no exista ya una copia con las mismas siglas.')
    } finally {
      setCopyingId(null)
    }
  }, [navigate])

  const regions = useMemo(() => regionOptions(agencies), [agencies])

  const columns = useMemo(() => [
    { field: 'name', headerName: 'Nombre', flex: 1.5, minWidth: 200 },
    {
      field: 'abbreviation', headerName: 'Siglas', width: 120,
      renderCell: ({ value }) => <Chip label={value} size="small" variant="outlined" />,
    },
    {
      field: 'region', headerName: 'Región', width: 110,
      type: 'singleSelect', valueOptions: regions,
    },
    { field: 'phone_ranges', headerName: 'Rangos', flex: 1, minWidth: 180 },
    {
      field: 'schedule', headerName: 'Horario', flex: 1.5, minWidth: 220,
      type: 'singleSelect', valueOptions: Object.values(SCHEDULE_STATUS),
      valueGetter: (_value, row) => scheduleStatus(row),
      renderCell: ({ row }) => <ScheduleCell row={row} />,
    },
    { field: 'after_hours_mailbox', headerName: 'Buzón fuera de horario', flex: 1, minWidth: 180 },
    {
      field: 'ivr', headerName: 'IVR', width: 130,
      type: 'singleSelect', valueOptions: Object.values(IVR_STATUS),
      valueGetter: (_value, row) => ivrStatus(row),
      renderCell: ({ value }) => (value === IVR_STATUS.CONFIGURED
        ? <Chip label={value} size="small" color="primary" />
        : <Chip label={value} size="small" />),
    },
    {
      field: 'actions', headerName: 'Acciones', align: 'right', headerAlign: 'right',
      width: 40 + 34 * (1 + Number(canCreate) + Number(canDelete)),
      sortable: false, filterable: false, hideable: false, disableColumnMenu: true,
      disableExport: true,
      renderCell: ({ row }) => (
        <Box onClick={e => e.stopPropagation()}>
          <Tooltip title={canUpdate ? 'Editar' : 'Ver'}>
            <IconButton size="small" onClick={() => navigate(`/agencies/${row.id}`)}>
              {canUpdate ? <EditIcon fontSize="small" /> : <VisibilityIcon fontSize="small" />}
            </IconButton>
          </Tooltip>
          {canCreate && (
            <Tooltip title="Copiar agencia">
              <span>
                <IconButton
                  size="small"
                  disabled={copyingId !== null}
                  onClick={() => handleCopy(row.id)}
                >
                  {copyingId === row.id
                    ? <CircularProgress size={16} />
                    : <ContentCopyIcon fontSize="small" />}
                </IconButton>
              </span>
            </Tooltip>
          )}
          {canDelete && (
            <Tooltip title="Eliminar">
              <IconButton size="small" color="error" onClick={() => handleDelete(row.id)}>
                <DeleteIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          )}
        </Box>
      ),
    },
  ], [regions, canCreate, canUpdate, canDelete, copyingId, navigate, handleCopy, handleDelete])

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
        <Typography variant="h5" fontWeight={600}>Agencias</Typography>
        {canCreate && (
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => navigate('/agencies/new')}
          >
            Nueva agencia
          </Button>
        )}
      </Box>

      {loadError && (
        <Alert
          severity="error"
          sx={{ mb: 2 }}
          action={<Button color="inherit" size="small" onClick={load}>Reintentar</Button>}
        >
          {loadError}
        </Alert>
      )}

      <Paper elevation={0} sx={{ border: '1px solid', borderColor: 'divider' }}>
        <DataGrid
          // Se monta de nuevo tras la primera carga para aplicar el estado
          // guardado (página, filtros) ya con las filas disponibles.
          key={loaded ? 'ready' : 'loading'}
          apiRef={apiRef}
          rows={agencies}
          columns={columns}
          loading={loading}
          initialState={loaded ? initialState : DEFAULT_GRID_STATE}
          pageSizeOptions={PAGE_SIZE_OPTIONS}
          localeText={{ ...LOCALE_TEXT, noRowsLabel: 'No hay agencias registradas' }}
          showToolbar
          slotProps={{
            toolbar: { printOptions: { disableToolbarButton: true } },
          }}
          getRowHeight={() => 'auto'}
          autoHeight
          disableRowSelectionOnClick
          sx={{
            border: 0,
            '& .MuiDataGrid-cell': { py: 1, display: 'flex', alignItems: 'center' },
            '& .MuiDataGrid-columnHeaders': { bgcolor: 'grey.50' },
            '& .MuiDataGrid-columnHeaderTitle': { fontWeight: 600 },
          }}
        />
      </Paper>
    </Box>
  )
}
