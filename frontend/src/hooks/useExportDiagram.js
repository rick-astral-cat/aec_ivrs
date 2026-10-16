import { useCallback, useState } from 'react'
import { toPng } from 'html-to-image'
import jsPDF from 'jspdf'

const PADDING = 40
const NODE_W  = 240
const NODE_H  = 100
const EDGE_STROKE       = '#b1b1b7'
const EDGE_STROKE_WIDTH = '1.5'

function getBoundingBox(nodes) {
  if (!nodes.length) return { minX: 0, minY: 0, width: 800, height: 520 }

  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
  for (const node of nodes) {
    const x = node.position.x
    const y = node.position.y
    const w = node.measured?.width  ?? node.width  ?? NODE_W
    const h = node.measured?.height ?? node.height ?? NODE_H
    if (x     < minX) minX = x
    if (y     < minY) minY = y
    if (x + w > maxX) maxX = x + w
    if (y + h > maxY) maxY = y + h
  }
  return { minX, minY, width: maxX - minX, height: maxY - minY }
}

/**
 * Inyecta stroke directamente en los paths de edges del clon.
 * Necesario porque html-to-image clona sin el ancestro .react-flow
 * que define las CSS custom properties del stroke.
 */
function fixEdgesInClone(clonedEl) {
  clonedEl.querySelectorAll('.react-flow__edge-path').forEach(path => {
    path.setAttribute('stroke', EDGE_STROKE)
    path.setAttribute('stroke-width', EDGE_STROKE_WIDTH)
    path.setAttribute('fill', 'none')
  })

  clonedEl.querySelectorAll('.react-flow__edges svg').forEach(svg => {
    svg.style.overflow = 'visible'
  })
}

async function captureFullDiagram(containerEl, nodes) {
  const flowEl     = containerEl.querySelector('.react-flow')
  const viewportEl = containerEl.querySelector('.react-flow__viewport')

  if (!flowEl || !viewportEl) throw new Error('No se encontraron elementos de ReactFlow')

  const bbox    = getBoundingBox(nodes)
  const imgW    = Math.ceil(bbox.width  + PADDING * 2)
  const imgH    = Math.ceil(bbox.height + PADDING * 2)

  // Transform: mover el viewport para que el nodo más a la izquierda/arriba
  // quede en (PADDING, PADDING) — escala 1 siempre
  const tx = PADDING - bbox.minX
  const ty = PADDING - bbox.minY

  const origTransform = viewportEl.style.transform
  viewportEl.style.transform = `translate(${tx}px, ${ty}px) scale(1)`

  await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)))

  try {
    return await toPng(flowEl, {
      skipFonts: true,
      pixelRatio: 2,
      backgroundColor: '#ffffff',
      cacheBust: true,
      width:  imgW,
      height: imgH,
      style: {
        width:  `${imgW}px`,
        height: `${imgH}px`,
      },
      filter: node => {
        const cls = node?.classList
        if (!cls) return true
        return !(cls.contains('react-flow__controls') ||
                 cls.contains('react-flow__minimap')  ||
                 cls.contains('react-flow__attribution'))
      },
      onClone: (_doc, clonedEl) => {
        fixEdgesInClone(clonedEl)
      },
    })
  } finally {
    viewportEl.style.transform = origTransform
  }
}

export function useExportDiagram(containerRef, agencyName, getNodes) {
  const [exporting, setExporting] = useState(false)

  const capture = useCallback(async () => {
    const el    = containerRef.current
    const nodes = getNodes()
    if (!el)           throw new Error('Contenedor no encontrado')
    if (!nodes.length) throw new Error('No hay nodos en el diagrama')

    const bbox = getBoundingBox(nodes)
    const imgW = Math.ceil(bbox.width  + PADDING * 2)
    const imgH = Math.ceil(bbox.height + PADDING * 2)

    const dataUrl = await captureFullDiagram(el, nodes)
    return { dataUrl, imgW, imgH }
  }, [containerRef, getNodes])

  const exportPNG = useCallback(async () => {
    setExporting(true)
    try {
      const { dataUrl } = await capture()
      const link = document.createElement('a')
      link.download = `ivr_${(agencyName ?? 'diagrama').replace(/\s+/g, '_')}.png`
      link.href = dataUrl
      link.click()
    } finally {
      setExporting(false)
    }
  }, [capture, agencyName])

  const exportPDF = useCallback(async () => {
    setExporting(true)
    try {
      const { dataUrl, imgW, imgH } = await capture()

      const MARGIN       = 24
      const TITLE_HEIGHT = 28
      const pdfW = 841.89
      const pdfH = 595.28

      const pdf = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' })

      const name = agencyName ?? 'Diagrama IVR'
      pdf.setFontSize(13)
      pdf.setFont('helvetica', 'bold')
      pdf.text(`IVR — ${name}`, pdfW / 2, MARGIN + 10, { align: 'center' })

      const availW = pdfW - MARGIN * 2
      const availH = pdfH - MARGIN * 2 - TITLE_HEIGHT
      const scale  = Math.min(availW / imgW, availH / imgH)
      const fImgW  = imgW * scale
      const fImgH  = imgH * scale
      const imgX   = (pdfW - fImgW) / 2
      const imgY   = MARGIN + TITLE_HEIGHT

      pdf.addImage(dataUrl, 'PNG', imgX, imgY, fImgW, fImgH)
      pdf.save(`ivr_${name.replace(/\s+/g, '_')}.pdf`)
    } finally {
      setExporting(false)
    }
  }, [capture, agencyName])

  return { exportPNG, exportPDF, exporting, capture }
}
