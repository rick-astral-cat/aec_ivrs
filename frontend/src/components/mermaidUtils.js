// Convierte el árbol IVR a texto Mermaid flowchart TD

const sanitize = (str) => String(str ?? '').replace(/"/g, "'").replace(/\n/g, ' ').replace(/[<>]/g, '')

const normalizeExts = (val) => {
  if (!val) return []
  if (Array.isArray(val)) return val.flatMap(e => String(e).split(',').map(s => s.trim())).filter(Boolean)
  return String(val).split(',').map(s => s.trim()).filter(Boolean)
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
      return `["Buzon de voz"]`
    case 'cadd':
      return `["CADD: ${sanitize(n.destination)}"]`
    default:
      return `["${sanitize(n.type)}"]`
  }
}

function walk(node, lines, idMap) {
  if (!idMap.has(node.id)) idMap.set(node.id, `N${idMap.size}`)
  const sid = idMap.get(node.id)
  lines.push(`  ${sid}${nodeLabel(node)}`)

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
  tree.forEach(root => walk(root, lines, idMap))
  return lines.join('\n')
}
