import { assertUploadedFileSignature } from '../utils/fileSignature.js';

export function validateUploadedFileSignature(request, _response, next) {
  try {
    assertUploadedFileSignature(request.file);
    next();
  } catch (error) {
    next(error);
  }
}
