const USE_R2 = !!(
  process.env.R2_ACCOUNT_ID &&
  process.env.R2_ACCESS_KEY_ID &&
  process.env.R2_SECRET_ACCESS_KEY
)

let s3 = null
if (USE_R2) {
  const { S3Client } = require('@aws-sdk/client-s3')
  s3 = new S3Client({
    region: 'auto',
    endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: process.env.R2_ACCESS_KEY_ID,
      secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
    },
  })
  console.log('[storage] R2 enabled — uploads going to Cloudflare R2')
} else {
  console.log('[storage] R2 not configured — uploads going to local disk')
}

module.exports = {
  USE_R2,
  s3,
  R2_BUCKET: process.env.R2_BUCKET_NAME || 'beacon-uploads',
  R2_PUBLIC_URL: (process.env.R2_PUBLIC_URL || '').replace(/\/$/, ''),
}
