/**
 * Client-side image processing:
 * - CR2/CR3: full RAW decoding via LibRaw (WebAssembly) → JPEG
 * - JPG/PNG: resize + compress via Canvas
 */

const MAX_DIMENSION = 2560 // 2K (WQHD)

export function isRawFile(name: string): boolean {
  return /\.(cr2|cr3)$/i.test(name)
}

type ProgressFn = (pct: number) => void

/**
 * Decode a RAW file (CR2/CR3) to a full-resolution JPEG blob
 * using LibRaw compiled to WebAssembly. Runs in a Web Worker.
 */
async function decodeRawFile(file: File, onProgress?: ProgressFn): Promise<Blob> {
  onProgress?.(5)
  const { default: LibRaw } = await import('libraw-wasm')
  const raw = new LibRaw()

  onProgress?.(10)
  const buffer = await file.arrayBuffer()

  onProgress?.(15)
  await raw.open(new Uint8Array(buffer), {
    useCameraWb: true,
    outputColor: 1, // sRGB
    outputBps: 8,
    userQual: 3, // AHD interpolation
  })

  onProgress?.(40)
  const result = await raw.imageData()
  const { width, height, data } = result

  onProgress?.(60)
  // data is RGB (3 bytes/pixel) — convert to RGBA for Canvas
  const rgba = new Uint8ClampedArray(width * height * 4)
  for (let i = 0, j = 0; i < data.length; i += 3, j += 4) {
    rgba[j] = data[i]
    rgba[j + 1] = data[i + 1]
    rgba[j + 2] = data[i + 2]
    rgba[j + 3] = 255
  }

  onProgress?.(70)
  const imgData = new ImageData(rgba, width, height)
  const canvas = new OffscreenCanvas(width, height)
  const ctx = canvas.getContext('2d')!
  ctx.putImageData(imgData, 0, 0)

  onProgress?.(80)
  return await canvas.convertToBlob({ type: 'image/jpeg', quality: 0.98 })
}

/**
 * Resize + compress an image blob to JPEG.
 * Longest side capped at MAX_DIMENSION, then quality is reduced
 * iteratively until the file fits within MAX_FILE_SIZE.
 */
async function compressImage(blob: Blob, quality: number, maxFileSizeKb: number, onProgress?: ProgressFn): Promise<Blob> {
  const maxBytes = maxFileSizeKb * 1024
  onProgress?.(85)
  const bitmap = await createImageBitmap(blob)

  let { width, height } = bitmap
  const longest = Math.max(width, height)
  if (longest > MAX_DIMENSION) {
    const scale = MAX_DIMENSION / longest
    width = Math.round(width * scale)
    height = Math.round(height * scale)
  }

  const canvas = new OffscreenCanvas(width, height)
  const ctx = canvas.getContext('2d')!
  ctx.drawImage(bitmap, 0, 0, width, height)
  bitmap.close()

  onProgress?.(90)
  let q = quality / 100
  let result = await canvas.convertToBlob({ type: 'image/jpeg', quality: q })

  while (result.size > maxBytes && q > 0.1) {
    q -= 0.05
    result = await canvas.convertToBlob({ type: 'image/jpeg', quality: q })
  }

  onProgress?.(100)
  return result
}

/**
 * Full pipeline with progress callback (0–100):
 * - CR2/CR3 → LibRaw decode (full res) → resize 2K → compress ≤ 500 Ko
 * - JPG/PNG → resize 2K → compress ≤ 500 Ko
 */
export async function processImageFile(
  file: File,
  quality: number,
  maxFileSizeKb: number,
  onProgress?: ProgressFn
): Promise<File> {
  let blob: Blob

  if (isRawFile(file.name)) {
    blob = await decodeRawFile(file, onProgress)
  } else {
    onProgress?.(10)
    blob = file
  }

  try {
    const compressed = await compressImage(blob, quality, maxFileSizeKb, onProgress)
    const name = file.name.replace(/\.(cr2|cr3)$/i, '.jpg')
    return new File([compressed], name, { type: 'image/jpeg' })
  } catch {
    if (!isRawFile(file.name)) return file
    throw new Error(`Impossible de traiter ${file.name}`)
  }
}
