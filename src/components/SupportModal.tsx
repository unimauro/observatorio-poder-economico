import { useEffect } from 'react'

export const YAPE_QR = 'https://unimauro.github.io/salariosperu/yape.png'
export const YAPE_NUMERO = '940 584 307'

export default function SupportModal({
  open,
  onClose,
}: {
  open: boolean
  onClose: () => void
}) {
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [open, onClose])

  if (!open) return null

  return (
    <div className="apoyo-overlay" onClick={onClose} role="dialog" aria-modal="true">
      <div className="apoyo-modal" onClick={(e) => e.stopPropagation()}>
        <button className="apoyo-cerrar" onClick={onClose} aria-label="Cerrar">
          ✕
        </button>

        <div className="apoyo-modal-head">
          <span className="kicker">apoya el proyecto</span>
          <h3>Gracias por sostener esto 🙌</h3>
          <p>
            Es <strong>open source</strong> y gratuito. Tu aporte mantiene el hosting y el ETL
            corriendo. Escanea el QR con Yape o usa el número.
          </p>
        </div>

        <div className="apoyo-qr">
          <img src={YAPE_QR} alt={`Yape QR — ${YAPE_NUMERO}`} loading="lazy" />
        </div>

        <div className="apoyo-yape">
          <b>Yape · {YAPE_NUMERO}</b>
          <span>Carlos Cárdenas Fernández</span>
        </div>

        <div className="apoyo-botones">
          <a
            className="apoyo-btn"
            href="https://buymeacoffee.com/unimauro"
            target="_blank"
            rel="noopener noreferrer"
          >
            ☕ Buy me a coffee
          </a>
          <a
            className="apoyo-btn"
            href="https://wa.me/51940584307"
            target="_blank"
            rel="noopener noreferrer"
          >
            💬 WhatsApp
          </a>
        </div>
      </div>
    </div>
  )
}
