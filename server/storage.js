const USE_CLOUDINARY = !!(
  process.env.CLOUDINARY_CLOUD_NAME &&
  process.env.CLOUDINARY_API_KEY &&
  process.env.CLOUDINARY_API_SECRET
)

let cloudinary = null

if (USE_CLOUDINARY) {
  cloudinary = require('cloudinary').v2
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key:    process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  })
  console.log('[storage] Cloudinary enabled')
} else {
  console.log('[storage] Cloudinary not configured — uploads going to local disk')
}

function uploadToCloudinary(buffer, options = {}) {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(options, (error, result) => {
      if (error) reject(error)
      else resolve(result)
    })
    stream.end(buffer)
  })
}

// Extracts the public_id from a Cloudinary URL so we can delete the file later.
// e.g. https://res.cloudinary.com/mycloud/image/upload/v123/beacon/photos/abc.jpg → beacon/photos/abc
function getCloudinaryPublicId(url) {
  const match = url.match(/\/upload\/(?:v\d+\/)?(.+?)(?:\.[^.]+)?$/)
  return match ? match[1] : null
}

module.exports = { USE_CLOUDINARY, cloudinary, uploadToCloudinary, getCloudinaryPublicId }
