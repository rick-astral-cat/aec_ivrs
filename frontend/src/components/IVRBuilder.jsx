import { useCallback, useEffect, useRef, useState } from 'react'
import {
  ReactFlow, Background, Controls, MiniMap,
  addEdge, useEdgesState, useNodesState, useReactFlow, ReactFlowProvider,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { Box, Button, ButtonGroup, CircularProgress, Divider, Tooltip, Typography } from '@mui/material'
import AccountTreeIcon from '@mui/icons-material/AccountTree'
import AddIcon from '@mui/icons-material/Add'
import SaveIcon from '@mui/icons-material/Save'
import CheckIcon from '@mui/icons-material/Check'
import ImageIcon from '@mui/icons-material/Image'
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf'

import { nodeTypes } from './IVRNodeTypes'
import NodeEditor from './NodeEditor'
import { flowToTree, makeNode, treeToFlow } from './ivrUtils'
import { useExportDiagram } from '../hooks/useExportDiagram'

const NODE_MENU = [
  { type: 'menu',        label: 'Menú' },
  { type: 'timeout',     label: 'Sin dígito' },
  { type: 'ring_group',  label: 'Grupo timbrado' },
  { type: 'ring_single', label: 'Extensión' },
  { type: 'voicemail',   label: 'Buzón' },
  { type: 'cadd',        label: 'CADD' },
]

function FlowCanvas({ ivr, agencyName, onSave, flowExportRef }) {
  const [nodes, setNodes, onNodesChange] = useNodesState([])
  const [edges, setEdges, onEdgesChange] = useEdgesState([])
  const [selected, setSelected] = useState(null)
  const [saveSuccess, setSaveSuccess] = useState(false)
  const { getViewport, getNodes } = useReactFlow()

  const canvasContainerRef = useRef(null)
  const lastSavedTreeJsonRef = useRef(null)

  const { exportPNG, exportPDF, exporting, capture } = useExportDiagram(
    canvasContainerRef, agencyName, getNodes
  )

  useEffect(() => {
    if (flowExportRef) {
      flowExportRef.current = { capture }
    }
  }, [flowExportRef, capture])

  useEffect(() => {
    const ivrJson = JSON.stringify(ivr ?? [])
    // Si la actualización proviene de nuestro propio onSave, evitamos resetear el canvas
    if (lastSavedTreeJsonRef.current === ivrJson) {
      return
    }

    const { nodes: n, edges: e } = treeToFlow(ivr ?? [])
    setNodes(n)
    setEdges(e)
  }, [ivr, setNodes, setEdges])

  const onConnect = useCallback(
    (params) => setEdges(eds => addEdge({ ...params, type: 'smoothstep' }, eds)),
    [setEdges]
  )

  const onNodeClick = useCallback((_, node) => setSelected(node), [])

  const addNode = (type) => {
    const { x, y, zoom } = getViewport()
    const canvasEl = document.querySelector('.react-flow__renderer')
    const rect = canvasEl?.getBoundingClientRect() ?? { width: 800, height: 520 }
    const centerX = (rect.width  / 2 - x) / zoom
    const centerY = (rect.height / 2 - y) / zoom

    const data = makeNode(type)
    setNodes(ns => [...ns, {
      id: data.id,
      type: 'ivrNode',
      position: { x: centerX - 110, y: centerY - 30 },
      data,
    }])
  }

  const updateSelected = (newData) => {
    setNodes(ns => ns.map(n => n.id === selected.id ? { ...n, data: newData } : n))
    setSelected(s => ({ ...s, data: newData }))
  }

  const deleteSelected = () => {
    setNodes(ns => ns.filter(n => n.id !== selected.id))
    setEdges(es => es.filter(e => e.source !== selected.id && e.target !== selected.id))
    setSelected(null)
  }

  const duplicateSelected = () => {
    if (!selected) return

    // ID único para el nodo copiado
    const newId = `${selected.data.type}_${Date.now()}`

    const newNode = {
      id: newId,
      type: 'ivrNode',
      position: {
        // Aparece al lado derecho del nodo original, ligeramente abajo
        x: selected.position.x + 260,
        y: selected.position.y + 40,
      },
      // Copia toda la información del nodo, con el nuevo id y sin hijos heredados
      data: { ...selected.data, id: newId, children: [] },
    }

    setNodes(ns => [...ns, newNode])
    // Seleccionar el nuevo nodo para poder editarlo de inmediato
    setSelected(newNode)
  }

  return (
    <>
      {/* Barra superior */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1, flexWrap: 'wrap' }}>
        <Typography variant="caption" color="text.secondary">Agregar:</Typography>
        <ButtonGroup size="small" variant="outlined">
          {NODE_MENU.map(({ type, label }) => (
            <Button key={type} startIcon={<AddIcon />} onClick={() => addNode(type)}>
              {label}
            </Button>
          ))}
        </ButtonGroup>
        <Box sx={{ flexGrow: 1 }} />

        <ButtonGroup size="small" variant="outlined">
          <Tooltip title="Exportar diagrama completo como PNG">
            <span>
              <Button
                startIcon={exporting ? <CircularProgress size={14} /> : <ImageIcon />}
                onClick={exportPNG}
                disabled={exporting}
              >
                PNG
              </Button>
            </span>
          </Tooltip>
          <Tooltip title="Exportar diagrama completo como PDF">
            <span>
              <Button
                startIcon={exporting ? <CircularProgress size={14} /> : <PictureAsPdfIcon />}
                onClick={exportPDF}
                disabled={exporting}
              >
                PDF
              </Button>
            </span>
          </Tooltip>
        </ButtonGroup>

        <Button
          variant="contained"
          size="small"
          color={saveSuccess ? 'success' : 'primary'}
          startIcon={saveSuccess ? <CheckIcon /> : <SaveIcon />}
          onClick={async () => {
            const currentNodes = (getNodes && getNodes().length > 0) ? getNodes() : nodes
            const tree = flowToTree(currentNodes, edges)
            lastSavedTreeJsonRef.current = JSON.stringify(tree)
            await onSave(tree)
            setSaveSuccess(true)
            setTimeout(() => setSaveSuccess(false), 2000)
          }}
        >
          {saveSuccess ? '¡Guardado!' : 'Guardar IVR'}
        </Button>
      </Box>

      {/* Canvas */}
      <Box
        ref={canvasContainerRef}
        sx={{
          height: 520,
          border: '1px solid',
          borderColor: 'divider',
          borderRadius: 2,
          overflow: 'hidden',
        }}
      >
        <ReactFlow
          nodes={nodes}
          edges={edges}
          nodeTypes={nodeTypes}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onNodeClick={onNodeClick}
          fitView
        >
          <Background />
          <Controls />
          <MiniMap zoomable pannable />
        </ReactFlow>
      </Box>

      <NodeEditor
        node={selected}
        onChange={updateSelected}
        onDelete={deleteSelected}
        onDuplicate={duplicateSelected}
        onClose={() => setSelected(null)}
      />
    </>
  )
}

export default function IVRBuilder({ ivr, agencyName, onSave, flowExportRef }) {
  return (
    <Box sx={{ mt: 3 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
        <AccountTreeIcon color="primary" />
        <Typography variant="subtitle1" fontWeight={600}>IVR Builder</Typography>
      </Box>
      <Divider sx={{ mb: 1 }} />
      <ReactFlowProvider>
        <FlowCanvas ivr={ivr} agencyName={agencyName} onSave={onSave} flowExportRef={flowExportRef} />
      </ReactFlowProvider>
    </Box>
  )
}
