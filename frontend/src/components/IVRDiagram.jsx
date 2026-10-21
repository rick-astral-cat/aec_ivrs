import { useEffect, useRef, useState } from 'react'
import mermaid from 'mermaid'
import { toPng } from 'html-to-image'
import jsPDF from 'jspdf'
import {
  Alert,
  Box,
  Button,
  ButtonGroup,
  Chip,
  CircularProgress,
  Divider,
  Tooltip,
  Typography,
} from '@mui/material'
import AccountTreeIcon from '@mui/icons-material/AccountTree'
import ContentCopyIcon from '@mui/icons-material/ContentCopy'
import DownloadIcon from '@mui/icons-material/Download'
import ImageIcon from '@mui/icons-material/Image'
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf'

import { treeToMermaid, MERMAID_NODE_STYLES } from './mermaidUtils'
import { normalizeTree } from './ivrUtils'
import { scheduleToLines } from './scheduleUtils'

mermaid.initialize({ startOnLoad: false, theme: 'default', securityLevel: 'loose' })

let _diagramId = 0

// Captura el SVG de Mermaid con alta fidelidad a PNG (2x retina)
async function captureMermaid(containerEl) {
  const svgEl = containerEl?.querySelector('svg')
  if (!svgEl) throw new Error('No se encontró el elemento SVG del diagrama Mermaid')

  const vb = svgEl.viewBox?.baseVal
  const bbox = svgEl.getBoundingClientRect()
  const w = Math.ceil((vb && vb.width > 0) ? vb.width : (bbox.width || 800))
  const h = Math.ceil((vb && vb.height > 0) ? vb.height : (bbox.height || 600))

  // Intento primario con html-to-image
  try {
    const dataUrl = await toPng(containerEl, {
      backgroundColor: '#ffffff',
      pixelRatio: 2,
      cacheBust: true,
      skipFonts: true,
    })
    if (dataUrl && dataUrl.length > 200) {
      return { dataUrl, width: w, height: h }
    }
  } catch (err) {
    console.warn('toPng fallback to XMLSerializer rasterizer:', err)
  }

  // Fallback nativo usando Canvas y XMLSerializer
  return new Promise((resolve, reject) => {
    try {
      const clonedSvg = svgEl.cloneNode(true)
      clonedSvg.setAttribute('width', `${w}`)
      clonedSvg.setAttribute('height', `${h}`)
      clonedSvg.style.maxWidth = 'none'

      const svgXml = new XMLSerializer().serializeToString(clonedSvg)
      const blob = new Blob([svgXml], { type: 'image/svg+xml;charset=utf-8' })
      const url = URL.createObjectURL(blob)
      const img = new Image()

      img.onload = () => {
        const canvas = document.createElement('canvas')
        const scale = 2
        canvas.width = w * scale
        canvas.height = h * scale
        const ctx = canvas.getContext('2d')
        ctx.fillStyle = '#ffffff'
        ctx.fillRect(0, 0, canvas.width, canvas.height)
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
        URL.revokeObjectURL(url)
        resolve({ dataUrl: canvas.toDataURL('image/png'), width: w, height: h })
      }

      img.onerror = () => {
        URL.revokeObjectURL(url)
        reject(new Error('No se pudo convertir el SVG a imagen'))
      }

      img.src = url
    } catch (e) {
      reject(e)
    }
  })
}

export default function IVRDiagram({ ivr, agencyName, agency, flowExportRef }) {
  const containerRef = useRef(null)
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState(null)
  const [exportingPng, setExportingPng] = useState(false)
  const [exportingPdf, setExportingPdf] = useState(false)

  const mermaidText = treeToMermaid(normalizeTree(ivr), agencyName)

  useEffect(() => {
    if (!mermaidText || !containerRef.current) return
    setError(null)
    const id = `mermaid-${++_diagramId}`

    mermaid.render(id, mermaidText)
      .then(({ svg }) => {
        if (containerRef.current) containerRef.current.innerHTML = svg
      })
      .catch(() => setError('No se pudo renderizar el diagrama. Verifica que el IVR esté bien conectado.'))
  }, [mermaidText])

  const handleCopy = () => {
    navigator.clipboard.writeText(mermaidText)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleDownloadMd = () => {
    const blob = new Blob([mermaidText], { type: 'text/markdown' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${agencyName ?? 'ivr'}_diagram.md`
    a.click()
    URL.revokeObjectURL(url)
  }

  // Exportar Mermaid a imagen PNG
  const handleExportPng = async () => {
    if (!containerRef.current) return
    setExportingPng(true)
    try {
      const { dataUrl } = await captureMermaid(containerRef.current)
      const link = document.createElement('a')
      const safeName = (agency?.name || agencyName || 'diagrama').replace(/\s+/g, '_')
      link.download = `mermaid_${safeName}.png`
      link.href = dataUrl
      link.click()
    } catch (err) {
      console.error(err)
      alert('Error al exportar la imagen del diagrama.')
    } finally {
      setExportingPng(false)
    }
  }

  // Exportar PDF completo con ficha técnica de la agencia + AMBOS diagramas (ReactFlow + Mermaid)
  const handleExportPdf = async () => {
    if (!containerRef.current) return
    setExportingPdf(true)
    try {
      // 1. Capturar diagrama interactivo de React Flow si está disponible
      let flowCapture = null
      if (flowExportRef?.current?.capture) {
        try {
          flowCapture = await flowExportRef.current.capture()
        } catch (err) {
          console.warn('No se pudo capturar diagrama de React Flow:', err)
        }
      }

      // 2. Capturar diagrama Mermaid
      const { dataUrl: mermaidDataUrl, width: mermaidW, height: mermaidH } =
        await captureMermaid(containerRef.current)

      // Dimensiones A4 vertical (portrait): 595.28 x 841.89 pt
      const pdf = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4' })
      const pageW = 595.28
      const pageH = 841.89
      const margin = 32

      // ── PÁGINA 1: Encabezado Dalton y Datos Generales ──
      pdf.setFillColor(200, 16, 46) // Rojo Dalton #C8102E
      pdf.rect(0, 0, pageW, 60, 'F')

      pdf.setTextColor(255, 255, 255)
      pdf.setFont('helvetica', 'bold')
      pdf.setFontSize(16)
      pdf.text('AEC IVRS — DALTON IVR MANAGER', margin, 28)

      pdf.setFont('helvetica', 'normal')
      pdf.setFontSize(9.5)
      pdf.text('Ficha Técnica de Agencia y Flujos IVR (Avaya Enterprise Cloud)', margin, 45)

      // Tarjeta de Datos Generales de la Agencia
      const cardY = 75
      const cardW = pageW - margin * 2

      // ── Preparar textos de campos variables para medir la altura necesaria ──
      const fmtPhone = (digits) => {
        const d = String(digits).replace(/\D/g, '')
        if (d.length !== 10) return d || '—'
        return `${d.slice(0, 2)}-${d.slice(2, 6)}-${d.slice(6)}`
      }
      const formatPhoneRangesText = (raw) => {
        if (!raw) return 'No especificado'
        return String(raw)
          .split('|').map(r => r.trim()).filter(Boolean)
          .map(r => {
            const [from = '', to = ''] = r.split('-')
            return to ? `${fmtPhone(from)} al ${fmtPhone(to)}` : fmtPhone(from)
          })
          .join('\n')
      }

      let hoursText
      if (!agency?.has_schedule) {
        hoursText = 'Sin horario configurado'
      } else {
        const hLines = scheduleToLines(agency?.business_hours)
        hoursText = hLines.length ? hLines.join('\n') : 'Horario incompleto'
      }
      const mailboxText = agency?.after_hours_mailbox || 'No asignado'
      const phoneRangesText = formatPhoneRangesText(agency?.phone_ranges)

      // Contar líneas de la columna 2 (la que puede crecer) para altura dinámica.
      // Buzón (1) + Horario (líneas) + Rangos (líneas) + etiquetas.
      const countLines = (txt) => String(txt).split('\n')
        .reduce((acc, seg) => acc + Math.max(1, Math.ceil(seg.length / 46)), 0)
      const col2Lines = 1 /* buzón */ + countLines(hoursText) + countLines(phoneRangesText)
      // La columna 1 siempre tiene 4 líneas. La tarjeta se ajusta al máximo.
      const contentLines = Math.max(4, col2Lines)
      const cardH = Math.max(105, 34 + contentLines * 13 + 10)

      pdf.setFillColor(248, 250, 252)
      pdf.setDrawColor(226, 232, 240)
      pdf.setLineWidth(0.8)
      pdf.roundedRect(margin, cardY, cardW, cardH, 4, 4, 'FD')

      // Título de la tarjeta
      pdf.setTextColor(200, 16, 46)
      pdf.setFont('helvetica', 'bold')
      pdf.setFontSize(10.5)
      pdf.text('DATOS GENERALES DE LA AGENCIA', margin + 12, cardY + 18)

      pdf.setDrawColor(200, 16, 46)
      pdf.setLineWidth(1)
      pdf.line(margin + 12, cardY + 22, margin + 200, cardY + 22)

      const col1X = margin + 12
      const row1Y = cardY + 38
      const lineH = 15

      // Dibuja "label valor" y devuelve la altura total consumida (soporta
      // valores que se envuelven en varias líneas sin encimarse con el siguiente).
      const drawField = (label, val, x, y, maxW = 220) => {
        pdf.setFont('helvetica', 'bold')
        pdf.setFontSize(8.5)
        pdf.setTextColor(80, 80, 80)
        pdf.text(label, x, y)

        const labelWidth = pdf.getTextWidth(label)
        pdf.setFont('helvetica', 'normal')
        pdf.setTextColor(20, 20, 20)
        const cleanVal = String(val ?? 'No especificado')
        const lines = pdf.splitTextToSize(cleanVal, maxW - labelWidth)
        pdf.text(lines, x + labelWidth + 4, y)
        // Altura usada: al menos una línea (lineH); líneas extra suman ~11pt c/u
        return Math.max(lineH, lines.length * 11)
      }

      drawField('Agencia: ', agency?.name || agencyName || 'N/A', col1X, row1Y, 230)
      drawField('Abreviatura: ', agency?.abbreviation || 'N/A', col1X, row1Y + lineH, 230)
      drawField('Región: ', agency?.region || 'N/A', col1X, row1Y + lineH * 2, 230)
      drawField(
        'Emisión: ',
        new Date().toLocaleDateString('es-MX', { year: 'numeric', month: 'long', day: 'numeric' }),
        col1X,
        row1Y + lineH * 3,
        230
      )

      const col2X = margin + 250

      // Posicionamiento secuencial: cada campo arranca debajo del anterior,
      // usando la altura real que consumió (evita el sobremontado).
      // hoursText, mailboxText y phoneRangesText se calcularon arriba.
      let cursorY = row1Y
      cursorY += drawField('Buzón fuera horario: ', mailboxText, col2X, cursorY, 250)
      cursorY += drawField('Horario: ', hoursText, col2X, cursorY, 250)
      cursorY += drawField('Rangos telefónicos: ', phoneRangesText, col2X, cursorY, 250)

      // ── DIAGRAMA 1: React Flow (Página 1) ──
      if (flowCapture?.dataUrl) {
        const diag1TitleY = cardY + cardH + 18
        pdf.setTextColor(26, 26, 26)
        pdf.setFont('helvetica', 'bold')
        pdf.setFontSize(10.5)
        pdf.text('1. DIAGRAMA DE NODOS (REACT FLOW)', margin, diag1TitleY)

        pdf.setDrawColor(226, 232, 240)
        pdf.setLineWidth(0.8)
        pdf.line(margin, diag1TitleY + 5, pageW - margin, diag1TitleY + 5)

        const availW1 = pageW - margin * 2
        const availH1 = pageH - (diag1TitleY + 15) - 35 // espacio restante antes del footer
        const scale1 = Math.min(availW1 / flowCapture.imgW, availH1 / flowCapture.imgH, 1)

        const fW1 = flowCapture.imgW * scale1
        const fH1 = flowCapture.imgH * scale1
        const posX1 = margin + (availW1 - fW1) / 2
        const posY1 = diag1TitleY + 15

        pdf.addImage(flowCapture.dataUrl, 'PNG', posX1, posY1, fW1, fH1, undefined, 'FAST')

        // ── PÁGINA 2: Diagrama de Flujo Lógico (Mermaid) ──
        const isMermaidWide = mermaidW > mermaidH * 1.25
        pdf.addPage('a4', isMermaidWide ? 'landscape' : 'portrait')
        const p2W = isMermaidWide ? 841.89 : 595.28
        const p2H = isMermaidWide ? 595.28 : 841.89

        // Banner superior página 2
        pdf.setFillColor(200, 16, 46)
        pdf.rect(0, 0, p2W, 40, 'F')
        pdf.setTextColor(255, 255, 255)
        pdf.setFont('helvetica', 'bold')
        pdf.setFontSize(12)
        pdf.text('2. AEC IVRS — DIAGRAMA DE FLUJO LÓGICO (MERMAID)', margin, 24)

        const availW2 = p2W - margin * 2
        const availH2 = p2H - 55 - 35
        const scale2 = Math.min(availW2 / mermaidW, availH2 / mermaidH, 1)
        const fW2 = mermaidW * scale2
        const fH2 = mermaidH * scale2
        const posX2 = margin + (availW2 - fW2) / 2
        const posY2 = 55 + (availH2 - fH2) / 2

        pdf.addImage(mermaidDataUrl, 'PNG', posX2, posY2, fW2, fH2, undefined, 'FAST')
      } else {
        // Fallback: solo diagrama Mermaid en Página 1
        const diagTitleY = cardY + cardH + 20
        pdf.setTextColor(26, 26, 26)
        pdf.setFont('helvetica', 'bold')
        pdf.setFontSize(10.5)
        pdf.text('ESTRUCTURA DEL FLUJO IVR (DIAGRAMA MERMAID)', margin, diagTitleY)

        pdf.setDrawColor(226, 232, 240)
        pdf.setLineWidth(0.8)
        pdf.line(margin, diagTitleY + 5, pageW - margin, diagTitleY + 5)

        const availW = pageW - margin * 2
        const availH = pageH - (diagTitleY + 15) - 35
        const scale = Math.min(availW / mermaidW, availH / mermaidH, 1)

        const fW = mermaidW * scale
        const fH = mermaidH * scale
        const posX = margin + (availW - fW) / 2
        const posY = diagTitleY + 15

        pdf.addImage(mermaidDataUrl, 'PNG', posX, posY, fW, fH, undefined, 'FAST')
      }

      // Numeración de páginas y membrete confidencial en todas las páginas
      const totalPages = pdf.internal.getNumberOfPages()
      for (let i = 1; i <= totalPages; i++) {
        pdf.setPage(i)
        const curW = pdf.internal.pageSize.getWidth()
        const curH = pdf.internal.pageSize.getHeight()
        pdf.setFontSize(7.5)
        pdf.setTextColor(150, 150, 150)
        pdf.setFont('helvetica', 'normal')
        pdf.text(
          `AEC IVRS — Dalton IVR Manager • Documento Confidencial • Página ${i} de ${totalPages}`,
          curW / 2,
          curH - 14,
          { align: 'center' }
        )
      }

      const safeName = (agency?.name || agencyName || 'agencia').replace(/\s+/g, '_')
      pdf.save(`ficha_tecnica_${safeName}.pdf`)
    } catch (err) {
      console.error(err)
      alert('Error al generar la ficha técnica en PDF.')
    } finally {
      setExportingPdf(false)
    }
  }

  if (!ivr?.length) return null

  return (
    <Box sx={{ mt: 3 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1, flexWrap: 'wrap' }}>
        <AccountTreeIcon color="primary" />
        <Typography variant="subtitle1" fontWeight={600} sx={{ flexGrow: 1 }}>
          Diagrama IVR (Mermaid)
        </Typography>

        <ButtonGroup size="small" variant="outlined">
          <Tooltip title="Copiar código fuente Mermaid">
            <Button startIcon={<ContentCopyIcon />} onClick={handleCopy}>
              {copied ? '¡Copiado!' : 'Copiar Mermaid'}
            </Button>
          </Tooltip>
          <Tooltip title="Descargar código Mermaid como archivo .md">
            <Button startIcon={<DownloadIcon />} onClick={handleDownloadMd}>
              Descargar .md
            </Button>
          </Tooltip>
          <Tooltip title="Exportar diagrama Mermaid como imagen PNG">
            <span>
              <Button
                startIcon={exportingPng ? <CircularProgress size={14} /> : <ImageIcon />}
                onClick={handleExportPng}
                disabled={exportingPng || exportingPdf}
              >
                PNG
              </Button>
            </span>
          </Tooltip>
          <Tooltip title="Exportar Ficha Técnica en PDF con datos completos de la agencia y diagrama">
            <span>
              <Button
                variant="contained"
                startIcon={exportingPdf ? <CircularProgress size={14} color="inherit" /> : <PictureAsPdfIcon />}
                onClick={handleExportPdf}
                disabled={exportingPng || exportingPdf}
                sx={{ bgcolor: 'secondary.main', color: '#fff', '&:hover': { bgcolor: '#000' } }}
              >
                Ficha PDF
              </Button>
            </span>
          </Tooltip>
        </ButtonGroup>
      </Box>
      <Divider sx={{ mb: 1.5 }} />

      {/* Leyenda visual de tipos de nodo con colores correspondientes */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 1,
          mb: 2,
          flexWrap: 'wrap',
          bgcolor: 'grey.50',
          px: 1.5,
          py: 1,
          borderRadius: 1.5,
          border: '1px solid',
          borderColor: 'divider',
        }}
      >
        <Typography variant="caption" fontWeight={700} color="text.secondary" sx={{ mr: 0.5 }}>
          Leyenda de colores:
        </Typography>
        {Object.entries(MERMAID_NODE_STYLES).map(([type, style]) => (
          <Chip
            key={type}
            label={style.label}
            size="small"
            sx={{
              bgcolor: style.fill,
              color: style.color,
              border: `1.5px solid ${style.stroke}`,
              fontWeight: 600,
              fontSize: '0.75rem',
            }}
          />
        ))}
      </Box>

      {error ? (
        <Alert severity="warning">{error}</Alert>
      ) : (
        <Box
          ref={containerRef}
          sx={{
            border: '1px solid',
            borderColor: 'divider',
            borderRadius: 2,
            p: 2,
            bgcolor: 'background.paper',
            overflowX: 'auto',
            '& svg': { maxWidth: '100%', height: 'auto', display: 'block' },
          }}
        />
      )}
    </Box>
  )
}
