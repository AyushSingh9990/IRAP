import axiosInstance from './axiosInstance.js';

export async function listMyCourses(params = {}) {
  const response = await axiosInstance.get('/courses/self', { params });
  return response.data;
}

export async function createCourse(payload) {
  const response = await axiosInstance.post('/courses/self', payload);
  return response.data;
}

export async function getMyCourse(courseId) {
  const response = await axiosInstance.get(`/courses/self/${courseId}`);
  return response.data;
}

export async function updateMyCourse(courseId, payload) {
  const response = await axiosInstance.patch(
    `/courses/self/${courseId}`,
    payload,
  );
  return response.data;
}

export async function submitMyCourse(courseId) {
  const response = await axiosInstance.post(
    `/courses/self/${courseId}/submit`,
    { confirmation: 'SUBMIT' },
  );
  return response.data;
}

export async function listCourseDocuments(
  courseId,
  includeHistory = false,
) {
  const response = await axiosInstance.get(
    `/courses/self/${courseId}/documents`,
    {
      params: { includeHistory: String(includeHistory) },
    },
  );
  return response.data;
}

export async function uploadCourseDocument(
  courseId,
  formData,
  onUploadProgress,
) {
  const response = await axiosInstance.post(
    `/courses/self/${courseId}/documents`,
    formData,
    {
      onUploadProgress,
      timeout: 60000,
    },
  );
  return response.data;
}

export async function removeCourseDocument(documentId) {
  const response = await axiosInstance.delete(
    `/courses/documents/${documentId}`,
  );
  return response.data;
}

export async function getCourseDocumentBlob(
  documentId,
  disposition = 'inline',
) {
  try {
    const response = await axiosInstance.get(
      `/courses/documents/${documentId}/content`,
      {
        params: { disposition },
        responseType: 'blob',
        timeout: 60000,
      },
    );
    return response.data;
  } catch (error) {
    if (error?.response?.data instanceof Blob) {
      try {
        const text = await error.response.data.text();
        error.response.data = JSON.parse(text);
      } catch {
        // Preserve the original response when it is not JSON.
      }
    }
    throw error;
  }
}

export async function getCourseCertificateBlob(
  certificateId,
  download = false,
) {
  const response = await axiosInstance.get(
    `/courses/certificates/${certificateId}/pdf`,
    {
      params: { download: String(download) },
      responseType: 'blob',
      timeout: 60000,
    },
  );

  return response.data;
}

export async function getCoursePolicy() {
  const response = await axiosInstance.get('/courses/admin/policy');
  return response.data;
}

export async function saveCoursePolicy(payload) {
  const response = await axiosInstance.patch(
    '/courses/admin/policy',
    payload,
  );
  return response.data;
}

export async function listCourseReviewers() {
  const response = await axiosInstance.get('/courses/admin/reviewers');
  return response.data;
}

export async function listAdminCourses(params = {}) {
  const cleanParams = Object.fromEntries(
    Object.entries(params).filter(
      ([, value]) =>
        value !== '' &&
        value !== null &&
        value !== undefined &&
        value !== 'all',
    ),
  );

  const response = await axiosInstance.get('/courses/admin/queue', {
    params: cleanParams,
  });

  return response.data;
}

export async function getAdminCourse(courseId) {
  const response = await axiosInstance.get(`/courses/admin/${courseId}`);
  return response.data;
}

export async function assignCourseReviewer(courseId, payload) {
  const response = await axiosInstance.patch(
    `/courses/admin/${courseId}/assignment`,
    payload,
  );
  return response.data;
}

export async function saveCourseChecklist(courseId, payload) {
  const response = await axiosInstance.patch(
    `/courses/admin/${courseId}/checklist`,
    payload,
  );
  return response.data;
}

export async function addCourseReviewNote(courseId, payload) {
  const response = await axiosInstance.post(
    `/courses/admin/${courseId}/notes`,
    payload,
  );
  return response.data;
}

export async function requestCourseInformation(courseId, payload) {
  const response = await axiosInstance.post(
    `/courses/admin/${courseId}/request-information`,
    payload,
  );
  return response.data;
}

export async function approveCourse(courseId, payload) {
  const response = await axiosInstance.post(
    `/courses/admin/${courseId}/approve`,
    payload,
  );
  return response.data;
}

export async function rejectCourse(courseId, payload) {
  const response = await axiosInstance.post(
    `/courses/admin/${courseId}/reject`,
    payload,
  );
  return response.data;
}

export async function reviewCourseDocument(documentId, payload) {
  const response = await axiosInstance.patch(
    `/courses/admin/documents/${documentId}/review`,
    payload,
  );
  return response.data;
}

export async function updateCourseStatus(courseId, payload) {
  const response = await axiosInstance.post(
    `/courses/admin/${courseId}/status`,
    payload,
  );
  return response.data;
}

export async function verifyCourseCertificate(identifier) {
  const response = await axiosInstance.get(
    `/courses/verification/${encodeURIComponent(identifier)}`,
  );
  return response.data;
}
