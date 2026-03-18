import { S3Client, PutObjectCommand, DeleteObjectCommand, ListObjectsV2Command, GetObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'

const bucket = process.env.S3_BUCKET || 'lenart-photos'

const s3 = new S3Client({
  endpoint: process.env.S3_ENDPOINT || 'http://localhost:9000',
  region: process.env.S3_REGION || 'us-east-1',
  credentials: {
    accessKeyId: process.env.S3_ACCESS_KEY || 'lenart',
    secretAccessKey: process.env.S3_SECRET_KEY || 'lenartminio'
  },
  forcePathStyle: true
})

export interface BlobObject {
  key: string
  size: number
  lastModified: Date | undefined
  url: string
}

export async function blobPut(key: string, body: Buffer | Uint8Array, contentType: string): Promise<BlobObject> {
  await s3.send(new PutObjectCommand({
    Bucket: bucket,
    Key: key,
    Body: body,
    ContentType: contentType
  }))

  return {
    key,
    size: body.length,
    lastModified: new Date(),
    url: getBlobUrl(key)
  }
}

export async function blobList(prefix?: string): Promise<BlobObject[]> {
  const result = await s3.send(new ListObjectsV2Command({
    Bucket: bucket,
    Prefix: prefix
  }))

  return (result.Contents || []).map(obj => ({
    key: obj.Key!,
    size: obj.Size || 0,
    lastModified: obj.LastModified,
    url: getBlobUrl(obj.Key!)
  }))
}

export async function blobDelete(key: string): Promise<void> {
  await s3.send(new DeleteObjectCommand({
    Bucket: bucket,
    Key: key
  }))
}

export async function blobGet(key: string): Promise<Buffer | null> {
  try {
    const result = await s3.send(new GetObjectCommand({
      Bucket: bucket,
      Key: key
    }))
    const bytes = await result.Body?.transformToByteArray()
    return bytes ? Buffer.from(bytes) : null
  } catch {
    return null
  }
}

export async function blobPresignedUrl(key: string, expiresIn = 3600): Promise<string> {
  return getSignedUrl(s3, new GetObjectCommand({
    Bucket: bucket,
    Key: key
  }), { expiresIn })
}

export function getBlobUrl(key: string): string {
  const endpoint = process.env.S3_PUBLIC_URL || process.env.S3_ENDPOINT || 'http://localhost:9000'
  return `${endpoint}/${bucket}/${key}`
}
