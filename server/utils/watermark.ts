import sharp from 'sharp'
import { inArray } from 'drizzle-orm'
import { settings } from '~~/server/database/schema'
import { db } from '~~/server/utils/db'

export const WATERMARK_S3_KEY = 'settings/watermark.png'

async function getWatermarkSettings() {
  const rows = await db.select().from(settings)
    .where(inArray(settings.key, ['watermark_size', 'watermark_spacing', 'watermark_opacity', 'watermark_mode']))
  const map = Object.fromEntries(rows.map(r => [r.key, r.value]))
  return {
    sizePct: Number(map.watermark_size ?? 15) / 100,
    spacingPct: Number(map.watermark_spacing ?? 60) / 100,
    opacityPct: Number(map.watermark_opacity ?? 40) / 100,
    mode: (map.watermark_mode ?? 'grid') as 'grid' | 'centered'
  }
}

/**
 * Apply watermark as a repeating grid over the image.
 * Size, spacing and opacity are read from the settings table.
 * Returns original buffer if no watermark is configured.
 */
export async function applyWatermark(imageBuffer: Buffer | Uint8Array): Promise<Buffer> {
  const watermark = await blobGet(WATERMARK_S3_KEY)
  if (!watermark) return Buffer.from(imageBuffer)

  const { sizePct, spacingPct, opacityPct, mode } = await getWatermarkSettings()

  const image = sharp(imageBuffer)
  const metadata = await image.metadata()
  const imgWidth = metadata.width || 1920
  const imgHeight = metadata.height || 1080

  if (mode === 'centered') {
    // Centered mode: size based on the smaller image dimension so the watermark
    // fills a large portion of the image regardless of orientation
    const targetDim = Math.round(Math.min(imgWidth, imgHeight) * sizePct)

    const centeredWm = await sharp(watermark)
      .resize({ width: targetDim, height: targetDim, fit: 'inside', withoutEnlargement: false })
      .ensureAlpha()
      .composite([{
        input: Buffer.from([0, 0, 0, Math.round(255 * opacityPct)]),
        raw: { width: 1, height: 1, channels: 4 },
        tile: true,
        blend: 'dest-in'
      }])
      .toBuffer()

    const wmMeta = await sharp(centeredWm).metadata()
    const wmW = wmMeta.width || 1
    const wmH = wmMeta.height || 1
    const left = Math.round((imgWidth - wmW) / 2)
    const top = Math.round((imgHeight - wmH) / 2)

    return image
      .composite([{ input: centeredWm, left, top, blend: 'over' }])
      .jpeg({ quality: 95 })
      .toBuffer()
  }

  // Grid mode: repeating watermark pattern
  const wmWidth = Math.round(imgWidth * sizePct)

  const resizedWatermark = await sharp(watermark)
    .resize({ width: wmWidth, withoutEnlargement: true })
    .ensureAlpha()
    .composite([{
      input: Buffer.from([0, 0, 0, Math.round(255 * opacityPct)]),
      raw: { width: 1, height: 1, channels: 4 },
      tile: true,
      blend: 'dest-in'
    }])
    .toBuffer()

  const wmMeta = await sharp(resizedWatermark).metadata()
  const wmW = wmMeta.width || 1
  const wmH = wmMeta.height || 1

  // Build a transparent tile (watermark + spacing)
  const spacingX = Math.round(wmW * spacingPct)
  const spacingY = Math.round(wmH * spacingPct)
  const tileW = wmW + spacingX
  const tileH = wmH + spacingY

  const tile = await sharp({
    create: {
      width: tileW,
      height: tileH,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 }
    }
  })
    .composite([{ input: resizedWatermark, left: 0, top: 0 }])
    .png()
    .toBuffer()

  // Repeat tile across the image
  const cols = Math.ceil(imgWidth / tileW) + 1
  const rows = Math.ceil(imgHeight / tileH) + 1
  const overlayW = cols * tileW
  const overlayH = rows * tileH

  const tiles: sharp.OverlayOptions[] = []
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      tiles.push({
        input: tile,
        left: col * tileW,
        top: row * tileH
      })
    }
  }

  const overlay = await sharp({
    create: {
      width: overlayW,
      height: overlayH,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 }
    }
  })
    .composite(tiles)
    .extract({ left: 0, top: 0, width: imgWidth, height: imgHeight })
    .png()
    .toBuffer()

  return image
    .composite([{ input: overlay, blend: 'over' }])
    .jpeg({ quality: 95 })
    .toBuffer()
}
