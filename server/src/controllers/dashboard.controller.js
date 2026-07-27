import {
  getDashboardOverview,
  updateAccountSettings,
} from '../services/dashboard.service.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const getOverview = asyncHandler(async (request, response) => {
  const overview = await getDashboardOverview(request.auth.userId);
  response.status(200).json(
    new ApiResponse({ message: 'Dashboard overview loaded.', data: { overview } }),
  );
});

export const updateAccount = asyncHandler(async (request, response) => {
  const account = await updateAccountSettings({
    userId: request.auth.userId,
    input: request.validated.body,
  });
  response.status(200).json(
    new ApiResponse({ message: 'Account settings updated.', data: { account } }),
  );
});
