/**
 * Enumeration representing the origin source of a media asset.
 */
export enum MediaSource {
  /** Uploaded manually or managed via Cloudinary */
  CLOUDINARY = 'cloudinary',
  /** Derived from Google OAuth profile picture */
  GOOGLE = 'google',
  /** Stored on local filesystem / server */
  LOCAL = 'local',
  /** Hosted on external URL / CDN */
  EXTERNAL = 'external',
}

