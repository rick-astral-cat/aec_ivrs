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
    const x = xCursor
    const y = depth * (NODE_HEIGHT + V_GAP)
    xCursor += NODE_WIDTH + H_GAP

    nodes.push({
      id,
      type: 'ivrNode',
      position: { x, y },
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

  const nodeMap = Object.fromEntries(nodes.map(n => [n.id, n.data]))

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
    case 'voicemail':   return { ...base }
    case 'cadd':        return { ...base, destination: '' }
    default:            return base
  }
}
