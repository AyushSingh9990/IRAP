import { v2 as cloudinary } from 'cloudinary';
import { environment } from './environment.js';

let configured = false;

export function getCloudinaryClient() {
  if (!environment.documentStorage.cloudinaryConfigured) {
    throw new Error(
      'Cloudinary document storage is selected, but Cloudinary credentials are incomplete.',
    );
  }

  if (!configured) {
    cloudinary.config({
      cloud_name: environment.documentStorage.cloudName,
      api_key: environment.documentStorage.apiKey,
      api_secret: environment.documentStorage.apiSecret,
      secure: true,
    });
    configured = true;
  }

  return cloudinary;
}
