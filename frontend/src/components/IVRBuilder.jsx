import { useCallback, useEffect, useState } from 'react'
import {
  ReactFlow, Background, Controls, MiniMap,
  addEdge, useEdgesState, useNodesState, useReactFlow, ReactFlowProvider,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { Box, Button, ButtonGroup, Divider, Typography } from '@mui/material'
import AccountTreeIcon from '@mui/icons-material/AccountTree'
import AddIcon from '@mui/icons-material/Add'
import SaveIcon from '@mui/icons-material/Save'

import { nodeTypes } from './IVRNodeTypes'
import NodeEditor from './NodeEditor'
import { flowToTree, makeNode, treeToFlow } from './ivrUtils'

const NODE_MENU = [
  { type: 'menu',        label: 'Menú' },
  { type: 'timeout',     label: 'Sin dígito' },
  { type: 'ring_group',  label: 'Grupo timbrado' },
  { type: 'ring_single', label: 'Extensión' },
  { type: 'voicemail',   label: 'Buzón' },
  { type: 'cadd',        label: 'CADD' },
]

// Componente interno: tiene acceso a useReactFlow dentro del Provider
function FlowCanvas({ ivr, onSave }) {
  const [nodes, setNodes, onNodesChange] = useNodesState([])
  const [edges, setEdges, onEdgesChange] = useEdgesState([])
  const [selected, setSelected] = useState(null)
  const { screenToFlowPosition, getViewport } = useReactFlow()

  useEffect(() => {
    const { nodes: n, edges: e } = treeToFlow(ivr ?? [])
    setNodes(n)
    setEdges(e)
  }, [ivr])

  const onConnect = useCallback(
    (params) => setEdges(eds => addEdge({ ...params, type: 'smoothstep' }, eds)),
    [setEdges]
  )

  const onNodeClick = useCallback((_, node) => setSelected(node), [])

  const addNode = (type) => {
    // Calcula el centro visible del canvas en coordenadas del flow
    const { x, y, zoom } = getViewport()
    const canvasEl = document.querySelector('.react-flow__renderer')
    const rect = canvasEl?.getBoundingClientRect() ?? { width: 800, height: 520 }
    const centerX = (rect.width / 2 - x) / zoom
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

  return (
    <>
      {/* Barra de agregar nodos */}
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
        <Button variant="contained" size="small" startIcon={<SaveIcon />} onClick={() => onSave(flowToTree(nodes, edges))}>
          Guardar IVR
        </Button>
      </Box>

      {/* Canvas */}
      <Box sx={{ height: 520, border: '1px solid', borderColor: 'divider', borderRadius: 2, overflow: 'hidden' }}>
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
        onClose={() => setSelected(null)}
      />
    </>
  )
}

export default function IVRBuilder({ ivr, onSave }) {
  return (
    <Box sx={{ mt: 3 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
        <AccountTreeIcon color="primary" />
        <Typography variant="subtitle1" fontWeight={600}>IVR Builder</Typography>
      </Box>
      <Divider sx={{ mb: 1 }} />
      <ReactFlowProvider>
        <FlowCanvas ivr={ivr} onSave={onSave} />
      </ReactFlowProvider>
    </Box>
  )
}
