// Inject Cloudinary transform params into a URL for admin previews.
// Returns the URL unchanged for local files or non-Cloudinary URLs.
export function cloudinaryThumb(url, width = 300) {
  if (!url || !url.includes('res.cloudinary.com')) return url
  return url.replace('/upload/', `/upload/q_auto,f_auto,w_${width}/`)
}
