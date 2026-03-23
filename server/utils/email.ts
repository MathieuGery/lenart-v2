import { Resend } from 'resend'

let resend: Resend | null = null

function getResend() {
  if (!resend) {
    const apiKey = process.env.RESEND_API_KEY
    if (!apiKey) throw new Error('RESEND_API_KEY is not set')
    resend = new Resend(apiKey)
  }
  return resend
}

interface OrderConfirmationData {
  to: string
  firstName: string
  orderId: string
  photoCount: number
  totalCents: number
  formulaName: string | null
  filenames: string[]
  cashPayment: boolean
  isFree: boolean
}

export async function sendOrderConfirmationEmail(data: OrderConfirmationData) {
  const r = getResend()
  const orderRef = data.orderId.slice(0, 8).toUpperCase()
  const totalFormatted = (data.totalCents / 100).toFixed(2)

  let paymentInfo: string
  if (data.isFree) {
    paymentInfo = 'Votre commande est offerte, aucun paiement requis.'
  } else if (data.cashPayment) {
    paymentInfo = 'Paiement en espèces au stand.'
  } else {
    paymentInfo = 'Paiement en ligne sécurisé.'
  }

  const filesListHtml = data.filenames.map(f =>
    `<li style="padding:3px 0;color:#374151;font-size:13px;font-family:monospace">${f}</li>`
  ).join('')

  const html = `
<!DOCTYPE html>
<html lang="fr">
<head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#f9fafb">
  <div style="max-width:560px;margin:0 auto;padding:40px 24px">
    <div style="background:#ffffff;border-radius:12px;padding:32px;border:1px solid #e5e7eb">
      <h1 style="font-size:20px;font-weight:600;margin:0 0 8px;color:#111">
        Merci pour votre commande, ${data.firstName} !
      </h1>
      <p style="font-size:14px;color:#6b7280;margin:0 0 24px">
        Votre commande <strong style="color:#111">#${orderRef}</strong> a bien été enregistrée.
      </p>

      <div style="background:#f9fafb;border-radius:8px;padding:16px;margin-bottom:24px">
        <table style="width:100%;font-size:14px;border-collapse:collapse">
          ${data.formulaName ? `<tr>
            <td style="padding:4px 0;color:#6b7280">Formule</td>
            <td style="padding:4px 0;text-align:right;font-weight:500">${data.formulaName}</td>
          </tr>` : ''}
          <tr>
            <td style="padding:4px 0;color:#6b7280">Photos</td>
            <td style="padding:4px 0;text-align:right;font-weight:500">${data.photoCount}</td>
          </tr>
          <tr>
            <td style="padding:8px 0 4px;color:#6b7280;border-top:1px solid #e5e7eb">Total</td>
            <td style="padding:8px 0 4px;text-align:right;font-weight:600;font-size:16px;border-top:1px solid #e5e7eb">${data.isFree ? 'Offert' : `${totalFormatted} €`}</td>
          </tr>
        </table>
      </div>

      ${data.filenames.length
        ? `<div style="margin-bottom:24px">
        <p style="font-size:13px;font-weight:600;color:#111;margin:0 0 8px">Photos commandées :</p>
        <ul style="margin:0;padding:0 0 0 16px;list-style:none">
          ${filesListHtml}
        </ul>
      </div>`
        : ''}

      <p style="font-size:13px;color:#6b7280;margin:0 0 4px">
        ${paymentInfo}
      </p>

      <hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0 16px">
      <p style="font-size:12px;color:#9ca3af;margin:0;text-align:center">
        Len'art Photographie
      </p>
    </div>
  </div>
</body>
</html>`

  const { error } = await r.emails.send({
    from: 'Len\'art <contact@len-art.fr>',
    to: [data.to],
    subject: `Confirmation de commande #${orderRef}`,
    html
  })

  if (error) {
    console.error('[Resend] Failed to send order confirmation:', error)
  }
}

interface PhotosReadyData {
  to: string
  firstName: string
  orderId: string
  downloadLink: string
  photoCount: number
}

export async function sendPhotosReadyEmail(data: PhotosReadyData) {
  const r = getResend()
  const orderRef = data.orderId.slice(0, 8).toUpperCase()

  const html = `
<!DOCTYPE html>
<html lang="fr">
<head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#f9fafb">
  <div style="max-width:560px;margin:0 auto;padding:40px 24px">
    <div style="background:#ffffff;border-radius:12px;padding:32px;border:1px solid #e5e7eb">
      <h1 style="font-size:20px;font-weight:600;margin:0 0 8px;color:#111">
        Vos photos sont prêtes, ${data.firstName} !
      </h1>
      <p style="font-size:14px;color:#6b7280;margin:0 0 24px">
        Les ${data.photoCount} photo${data.photoCount > 1 ? 's' : ''} de votre commande <strong style="color:#111">#${orderRef}</strong> sont disponibles au téléchargement.
      </p>

      <div style="text-align:center;margin-bottom:24px">
        <a href="${data.downloadLink}" style="display:inline-block;background:#111;color:#fff;font-size:14px;font-weight:600;padding:12px 32px;border-radius:8px;text-decoration:none">
          Télécharger mes photos
        </a>
      </div>

      <p style="font-size:12px;color:#9ca3af;margin:0 0 4px;text-align:center">
        Si le bouton ne fonctionne pas, copiez ce lien dans votre navigateur :
      </p>
      <p style="font-size:11px;color:#9ca3af;margin:0;text-align:center;word-break:break-all">
        ${data.downloadLink}
      </p>

      <hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0 16px">
      <p style="font-size:12px;color:#9ca3af;margin:0;text-align:center">
        Len'art Photographie
      </p>
    </div>
  </div>
</body>
</html>`

  const { error } = await r.emails.send({
    from: 'Len\'art <contact@len-art.fr>',
    to: [data.to],
    subject: `Vos photos sont prêtes ! — Commande #${orderRef}`,
    html
  })

  if (error) {
    console.error('[Resend] Failed to send photos ready email:', error)
    throw new Error('Échec de l\'envoi de l\'e-mail')
  }
}
