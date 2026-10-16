// Convierte el árbol IVR a texto Mermaid flowchart TD con estilos de color y leyenda

const sanitize = (str) => String(str ?? '').replace(/"/g, "'").replace(/\n/g, ' ').replace(/[<>]/g, '')

const normalizeExts = (val) => {
  if (!val) return []
  if (Array.isArray(val)) return val.flatMap(e => String(e).split(',').map(s => s.trim())).filter(Boolean)
  return String(val).split(',').map(s => s.trim()).filter(Boolean)
}

export const MERMAID_NODE_STYLES = {
  menu: {
    label: 'Menú',
    fill: '#E3F2FD',
    stroke: '#1565C0',
    color: '#0D47A1',
  },
  timeout: {
    label: 'Sin dígito',
    fill: '#F3E5F5',
    stroke: '#6A1B9A',
    color: '#4A148C',
  },
  ring_group: {
    label: 'Grupo timbrado',
    fill: '#E8F5E9',
    stroke: '#2E7D32',
    color: '#1B5E20',
  },
  ring_single: {
    label: 'Extensión',
    fill: '#FFF3E0',
    stroke: '#E65100',
    color: '#BF360C',
  },
  voicemail: {
    label: 'Buzón de voz',
    fill: '#EFEBE9',
    stroke: '#4E342E',
    color: '#3E2723',
  },
  cadd: {
    label: 'CADD',
    fill: '#FFEBEE',
    stroke: '#C62828',
    color: '#B71C1C',
  },
}

function nodeLabel(n) {
  switch (n.type) {
    case 'menu':
      return `["Menu [${sanitize(n.digit)}] ${sanitize(n.label)}"]`
    case 'timeout':
      return `["Sin digito"]`
    case 'ring_group': {
      const exts = normalizeExts(n.extensions).join(', ')
      const rings = n.rings === 0 ? 'indefinido' : `${n.rings} timbrados`
      return `["Grupo: ${exts} - ${rings}"]`
    }
    case 'ring_single': {
      const rings = n.rings === 0 ? 'indefinido' : `${n.rings} timbrados`
      return `["Ext. ${sanitize(n.extension)} - ${rings}"]`
    }
    case 'voicemail':
      return n.email ? `["Buzon de voz: ${sanitize(n.email)}"]` : `["Buzon de voz"]`
    case 'cadd':
      return `["CADD: ${sanitize(n.destination)}"]`
    default:
      return `["${sanitize(n.type)}"]`
  }
}

function walk(node, lines, idMap) {
  if (!idMap.has(node.id)) idMap.set(node.id, `N${idMap.size}`)
  const sid = idMap.get(node.id)
  const nodeType = MERMAID_NODE_STYLES[node.type] ? node.type : 'menu'
  lines.push(`  ${sid}${nodeLabel(node)}:::type_${nodeType}`)

  if (node.children?.length) {
    node.children.forEach(child => {
      if (!idMap.has(child.id)) idMap.set(child.id, `N${idMap.size}`)
      lines.push(`  ${sid} --> ${idMap.get(child.id)}`)
      walk(child, lines, idMap)
    })
  }
}

export function treeToMermaid(tree, agencyName = '') {
  if (!tree?.length) return ''
  const idMap = new Map()
  const lines = ['flowchart TD']
  if (agencyName) lines.push(`  %% ${sanitize(agencyName)}`)

  // Definición de clases con fondos pastel y bordes correspondientes a React Flow
  lines.push('  %% Clases por tipo de nodo (colores pastel y alto contraste)')
  Object.entries(MERMAID_NODE_STYLES).forEach(([type, style]) => {
    lines.push(
      `  classDef type_${type} fill:${style.fill},stroke:${style.stroke},stroke-width:2px,color:${style.color};`
    )
  })

  // Árbol del IVR
  tree.forEach(root => walk(root, lines, idMap))

  // Subgrafo de Leyenda explicativa al pie del diagrama
  lines.push('')
  lines.push('  subgraph Leyenda ["Leyenda de Tipos de Nodo"]')
  lines.push('    direction LR')
  lines.push(
    '    L_menu["Menu"]:::type_menu ~~~ L_timeout["Sin digito"]:::type_timeout ~~~ L_group["Grupo timbrado"]:::type_ring_group ~~~ L_single["Extension"]:::type_ring_single ~~~ L_vm["Buzon"]:::type_voicemail ~~~ L_cadd["CADD"]:::type_cadd'
  )
  lines.push('  end')
  lines.push('  style Leyenda fill:#FAFAFA,stroke:#BDBDBD,stroke-dasharray: 4 4')

  return lines.join('\n')
}
