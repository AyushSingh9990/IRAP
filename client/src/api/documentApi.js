import axiosInstance from './axiosInstance.js';

export async function listDocuments(params = {}) {
  const response = await axiosInstance.get('/documents', { params });
  return response.data;
}

export async function uploadDocument(formData, onUploadProgress) {
  const response = await axiosInstance.post('/documents', formData, {
    onUploadProgress,
    timeout: 60000,
  });
  return response.data;
}

export async function replaceDocument(documentId, formData, onUploadProgress) {
  const response = await axiosInstance.post(
    `/documents/${documentId}/replace`,
    formData,
    {
      onUploadProgress,
      timeout: 60000,
    },
  );
  return response.data;
}

export async function removeDocument(documentId) {
  const response = await axiosInstance.delete(`/documents/${documentId}`);
  return response.data;
}

export async function getDocumentBlob(documentId, disposition = 'inline') {
  try {
    const response = await axiosInstance.get(`/documents/${documentId}/content`, {
      params: { disposition },
      responseType: 'blob',
      timeout: 60000,
    });
    return response.data;
  } catch (error) {
    if (error?.response?.data instanceof Blob) {
      try {
        const text = await error.response.data.text();
        error.response.data = JSON.parse(text);
      } catch {
        // Preserve the original Axios error when the response is not JSON.
      }
    }
    throw error;
  }
}

export async function listDocumentReviewQueue(params = {}) {
  const response = await axiosInstance.get('/documents/review-queue', { params });
  return response.data;
}

export async function reviewDocument(documentId, payload) {
  const response = await axiosInstance.patch(
    `/documents/${documentId}/review`,
    payload,
  );
  return response.data;
}
