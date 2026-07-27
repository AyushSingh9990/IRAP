import mongoose from 'mongoose';
import { environment } from '../config/environment.js';
import {
  beginEmailChange,
  beginPasswordReset,
  changePassword,
  completeEmailChange,
  completeTwoFactorLogin,
  listUserSessions,
  loginUser,
  registerUser,
  resendVerification,
  resetPassword,
  revokeAllUserSessions,
  revokeSessionByToken,
  revokeUserSession,
  rotateRefreshSession,
  serializeUser,
  verifyEmailToken,
} from '../services/auth.service.js';
import { ApiError } from '../utils/ApiError.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { asyncHandler } from '../utils/asyncHandler.js';

function cookieOptions(maxAge, path = '/') {
  return {
    httpOnly: true,
    secure: environment.cookie.secure,
    sameSite: environment.cookie.sameSite,
    domain: environment.cookie.domain,
    path,
    maxAge,
  };
}

function setAuthCookies(response, accessToken, refreshToken) {
  response.cookie(
    environment.cookie.accessName,
    accessToken,
    cookieOptions(environment.jwt.accessMaxAgeMs),
  );
  response.cookie(
    environment.cookie.refreshName,
    refreshToken,
    cookieOptions(environment.jwt.refreshMaxAgeMs, '/api/v1/auth'),
  );
}

function clearAuthCookies(response) {
  response.clearCookie(environment.cookie.accessName, cookieOptions(0));
  response.clearCookie(
    environment.cookie.refreshName,
    cookieOptions(0, '/api/v1/auth'),
  );
}

function developmentData(value) {
  if (!environment.isProduction && value?.developmentUrl) {
    return { developmentUrl: value.developmentUrl };
  }
  return {};
}

export const register = asyncHandler(async (request, response) => {
  const result = await registerUser({ input: request.validated.body, ip: request.ip });
  response.status(201).json(
    new ApiResponse({
      message: 'Registration received. Check your email for the verification link.',
      data: developmentData(result),
    }),
  );
});

export const verifyEmail = asyncHandler(async (request, response) => {
  await verifyEmailToken(request.validated.body.token);
  response.status(200).json(
    new ApiResponse({ message: 'Your email address has been verified. You can now log in.' }),
  );
});

export const resendEmailVerification = asyncHandler(async (request, response) => {
  const result = await resendVerification({
    email: request.validated.body.email,
    ip: request.ip,
  });
  response.status(200).json(
    new ApiResponse({
      message: 'If the account requires verification, a new email has been sent.',
      data: developmentData(result),
    }),
  );
});

export const login = asyncHandler(async (request, response) => {
  const result = await loginUser({
    ...request.validated.body,
    ip: request.ip,
    userAgent: request.get('user-agent'),
  });
  if (result.requiresTwoFactor) {
    response.status(202).json(
      new ApiResponse({
        message: 'Enter the verification code sent to your email address.',
        data: {
          requiresTwoFactor: true,
          challenge: result.challenge,
          ...(!environment.isProduction && result.developmentCode
            ? { developmentCode: result.developmentCode }
            : {}),
        },
      }),
    );
    return;
  }

  setAuthCookies(response, result.accessToken, result.refreshToken);
  response.status(200).json(
    new ApiResponse({ message: 'Login successful.', data: { user: result.user } }),
  );
});

export const verifyTwoFactor = asyncHandler(async (request, response) => {
  const result = await completeTwoFactorLogin({
    ...request.validated.body,
    ip: request.ip,
    userAgent: request.get('user-agent'),
  });
  setAuthCookies(response, result.accessToken, result.refreshToken);
  response.status(200).json(
    new ApiResponse({
      message: 'Login verification successful.',
      data: { user: result.user },
    }),
  );
});

export const refresh = asyncHandler(async (request, response) => {
  const refreshToken = request.cookies[environment.cookie.refreshName];
  if (!refreshToken) throw new ApiError(401, 'Your session has expired. Please log in again.');

  const result = await rotateRefreshSession({
    refreshToken,
    ip: request.ip,
    userAgent: request.get('user-agent'),
  });
  setAuthCookies(response, result.accessToken, result.refreshToken);
  response.status(200).json(
    new ApiResponse({ message: 'Session refreshed.', data: { user: result.user } }),
  );
});

export const logout = asyncHandler(async (request, response) => {
  if (environment.authEnabled && mongoose.connection.readyState === 1) {
    await revokeSessionByToken(
      request.cookies[environment.cookie.refreshName],
      'logout',
    );
  }
  clearAuthCookies(response);
  response.status(200).json(new ApiResponse({ message: 'Logout successful.' }));
});

export const logoutAll = asyncHandler(async (request, response) => {
  await revokeAllUserSessions(request.auth.userId, 'logout_all');
  clearAuthCookies(response);
  response.status(200).json(
    new ApiResponse({ message: 'You have been logged out on all devices.' }),
  );
});

export const forgotPassword = asyncHandler(async (request, response) => {
  const result = await beginPasswordReset({
    email: request.validated.body.email,
    ip: request.ip,
  });
  response.status(200).json(
    new ApiResponse({
      message: 'If an eligible account exists, password-reset instructions have been sent.',
      data: developmentData(result),
    }),
  );
});

export const completePasswordReset = asyncHandler(async (request, response) => {
  await resetPassword(request.validated.body);
  clearAuthCookies(response);
  response.status(200).json(
    new ApiResponse({ message: 'Your password has been reset. Log in using the new password.' }),
  );
});

export const me = asyncHandler(async (request, response) => {
  response.status(200).json(
    new ApiResponse({
      message: 'Account loaded successfully.',
      data: { user: await serializeUser(request.auth.user) },
    }),
  );
});

export const requestEmailChange = asyncHandler(async (request, response) => {
  const result = await beginEmailChange({
    userId: request.auth.userId,
    ...request.validated.body,
    ip: request.ip,
  });
  response.status(200).json(
    new ApiResponse({
      message: 'Check the new email address for a confirmation link.',
      data: developmentData(result),
    }),
  );
});

export const verifyEmailChange = asyncHandler(async (request, response) => {
  await completeEmailChange(request.validated.body.token);
  clearAuthCookies(response);
  response.status(200).json(
    new ApiResponse({
      message: 'Your email address has been changed. Log in using the new address.',
    }),
  );
});

export const updatePassword = asyncHandler(async (request, response) => {
  await changePassword({ userId: request.auth.userId, ...request.validated.body });
  clearAuthCookies(response);
  response.status(200).json(
    new ApiResponse({
      message: 'Password changed successfully. Log in again on this device.',
    }),
  );
});

export const sessions = asyncHandler(async (request, response) => {
  const data = await listUserSessions(request.auth.userId, request.auth.sessionId);
  response.status(200).json(
    new ApiResponse({ message: 'Active sessions loaded.', data: { sessions: data } }),
  );
});

export const revokeSession = asyncHandler(async (request, response) => {
  await revokeUserSession(request.auth.userId, request.validated.params.sessionId);
  response.status(200).json(new ApiResponse({ message: 'Session revoked.' }));
});
