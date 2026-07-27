import axiosInstance from './axiosInstance.js';

export async function listPaymentPlans(applicationType = '', purpose = '') {
  const params = {};

  if (applicationType) {
    params.applicationType = applicationType;
  }

  if (purpose) {
    params.purpose = purpose;
  }

  const response = await axiosInstance.get('/payments/plans', {
    params,
  });

  return response.data;
}

export async function requestPaymentQuote(payload) {
  const response = await axiosInstance.post('/payments/quote', payload);

  return response.data;
}

export async function initializePayment(payload) {
  const response = await axiosInstance.post('/payments/initialize', payload);

  return response.data;
}

export async function confirmRazorpayPayment(payload) {
  const response = await axiosInstance.post(
    '/payments/verify/razorpay',
    payload,
  );

  return response.data;
}

export async function syncStripePayment(paymentId) {
  const response = await axiosInstance.post('/payments/sync/stripe', {
    paymentId,
  });

  return response.data;
}

export async function submitOfflinePayment(payload) {
  const response = await axiosInstance.post('/payments/offline', payload);

  return response.data;
}

export async function listPaymentHistory() {
  const response = await axiosInstance.get('/payments/history');

  return response.data;
}

export async function getReceiptBlob(paymentId) {
  try {
    const response = await axiosInstance.get(
      `/payments/${paymentId}/receipt`,
      {
        responseType: 'blob',
      },
    );

    return response.data;
  } catch (error) {
    const responseData = error?.response?.data;

    // Axios returns API error JSON as a Blob when responseType is "blob".
    // Decode it so the Payments page can display the real server message
    // instead of only "Request failed with status code 500".
    if (responseData instanceof Blob) {
      try {
        const text = await responseData.text();
        const parsed = JSON.parse(text);
        error.response.data = parsed;
      } catch {
        // Preserve the original Axios error when the response is not JSON.
      }
    }

    throw error;
  }
}

export async function listAdminPayments(params = {}) {
  const cleanParams = {};

  if (
    typeof params.status === 'string' &&
    params.status.trim() &&
    params.status !== 'all'
  ) {
    cleanParams.status = params.status.trim();
  }

  if (
    typeof params.provider === 'string' &&
    params.provider.trim() &&
    params.provider !== 'all'
  ) {
    cleanParams.provider = params.provider.trim();
  }

  if (
    typeof params.search === 'string' &&
    params.search.trim()
  ) {
    cleanParams.search = params.search.trim();
  }

  const page = Number(params.page);

  if (Number.isInteger(page) && page > 0) {
    cleanParams.page = page;
  }

  const limit = Number(params.limit);

  if (Number.isInteger(limit) && limit > 0) {
    cleanParams.limit = limit;
  }

  const response = await axiosInstance.get(
    '/payments/admin/payments',
    {
      params: cleanParams,
    },
  );

  return response.data;
}

export async function reviewOfflinePayment(paymentId, payload) {
  const response = await axiosInstance.patch(
    `/payments/admin/payments/${paymentId}/offline-review`,
    payload,
  );

  return response.data;
}

export async function createPaymentRefund(paymentId, payload) {
  const response = await axiosInstance.post(
    `/payments/admin/payments/${paymentId}/refunds`,
    payload,
  );

  return response.data;
}

export async function listBillingConfiguration(resource) {
  const response = await axiosInstance.get(
    `/payments/admin/config/${resource}`,
  );

  return response.data;
}

export async function createBillingConfiguration(resource, payload) {
  const response = await axiosInstance.post(
    `/payments/admin/config/${resource}`,
    payload,
  );

  return response.data;
}

export async function updateBillingConfiguration(
  resource,
  itemId,
  payload,
) {
  const response = await axiosInstance.patch(
    `/payments/admin/config/${resource}/${itemId}`,
    payload,
  );

  return response.data;
}