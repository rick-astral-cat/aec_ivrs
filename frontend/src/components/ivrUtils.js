// Convierte el árbol IVR (JSON del backend) a nodos y edges de React Flow
// y viceversa.

const NODE_WIDTH = 220
const NODE_HEIGHT = 60
const H_GAP = 60
const V_GAP = 80

// ── helpers ───────────────────────────────────────────────────────────────────
export const normalizeExtensions = (val) => {
  if (!val) return []
  if (Array.isArray(val)) return val.flatMap(e => String(e).split(',').map(s => s.trim())).filter(Boolean)
  return String(val).split(',').map(s => s.trim()).filter(Boolean)
}

// ── árbol → flow ──────────────────────────────────────────────────────────────
export function treeToFlow(tree) {
  if (!tree?.length) return { nodes: [], edges: [] }
  const nodes = []
  const edges = []
  let xCursor = 0

  const walk = (nodeData, parentId, depth) => {
    const id = nodeData.id
    const defaultX = xCursor
    const defaultY = depth * (NODE_HEIGHT + V_GAP)
    xCursor += NODE_WIDTH + H_GAP

    // Si el nodo ya tiene posición guardada (x, y), se respeta; si no, se usa el layout calculado
    const hasSavedPosition =
      nodeData.position &&
      typeof nodeData.position.x === 'number' &&
      typeof nodeData.position.y === 'number'

    const position = hasSavedPosition
      ? { x: nodeData.position.x, y: nodeData.position.y }
      : { x: defaultX, y: defaultY }

    nodes.push({
      id,
      type: 'ivrNode',
      position,
      data: {
        ...nodeData,
        ...(nodeData.type === 'ring_group' && { extensions: normalizeExtensions(nodeData.extensions) }),
      },
    })

    if (parentId) {
      edges.push({ id: `${parentId}-${id}`, source: parentId, target: id, type: 'smoothstep' })
    }

    if (nodeData.children?.length) {
      nodeData.children.forEach(child => walk(child, id, depth + 1))
    }
  }

  tree.forEach(root => walk(root, null, 0))
  return { nodes, edges }
}

// ── flow → árbol ──────────────────────────────────────────────────────────────
export function flowToTree(nodes, edges) {
  const childrenMap = {}
  const hasParent = new Set()

  edges.forEach(e => {
    if (!childrenMap[e.source]) childrenMap[e.source] = []
    childrenMap[e.source].push(e.target)
    hasParent.add(e.target)
  })

  // Preservar la posición { x, y } actual de cada nodo en el árbol JSON
  const nodeMap = Object.fromEntries(
    nodes.map(n => [
      n.id,
      {
        ...n.data,
        position: n.position
          ? { x: Math.round(n.position.x), y: Math.round(n.position.y) }
          : undefined,
      },
    ])
  )

  const build = (id) => {
    const data = { ...nodeMap[id] }
    if (data.type === 'ring_group') data.extensions = normalizeExtensions(data.extensions)
    const childIds = childrenMap[id] || []
    if (childIds.length) data.children = childIds.map(build)
    else delete data.children
    return data
  }

  return nodes
    .filter(n => !hasParent.has(n.id))
    .map(n => build(n.id))
}

// ── normaliza árbol completo (para datos crudos del backend) ─────────────────
export function normalizeTree(tree) {
  if (!tree?.length) return []
  const walkNode = (n) => ({
    ...n,
    ...(n.type === 'ring_group' && { extensions: normalizeExtensions(n.extensions) }),
    ...(n.children?.length && { children: n.children.map(walkNode) }),
  })
  return tree.map(walkNode)
}

// ── factory de nodo nuevo ─────────────────────────────────────────────────────
let _counter = 1
export function makeNode(type) {
  const id = `${type}_${Date.now()}_${_counter++}`
  const base = { id, type, children: [] }
  switch (type) {
    case 'menu':        return { ...base, digit: '', label: '' }
    case 'timeout':     return { ...base, label: 'Sin dígito' }
    case 'ring_group':  return { ...base, extensions: [], rings: 3 }
    case 'ring_single': return { ...base, extension: '', rings: 5 }
    case 'voicemail':   return { ...base, email: '' }
    case 'cadd':        return { ...base, destination: '' }
    default:            return base
  }
}
