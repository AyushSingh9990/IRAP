import {
  getDirectoryProfile,
  listDirectoryProfiles,
  listSelfDirectoryProfiles,
  updateSelfDirectoryProfile,
} from '../services/directory.service.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiResponse } from '../utils/ApiResponse.js';

export const listDirectory = asyncHandler(async (request, response) => {
  const result = await listDirectoryProfiles({
    directoryType: request.validated.params.directoryType,
    filters: request.validated.query,
  });

  response.status(200).json(
    new ApiResponse({
      message: 'Directory profiles loaded successfully.',
      data: { profiles: result.profiles },
      meta: result.meta,
    }),
  );
});

export const directoryProfile = asyncHandler(async (request, response) => {
  const profile = await getDirectoryProfile({
    directoryType: request.validated.params.directoryType,
    slug: request.validated.params.slug,
  });

  response.status(200).json(
    new ApiResponse({
      message: 'Public profile loaded successfully.',
      data: { profile },
    }),
  );
});

export const selfDirectoryProfiles = asyncHandler(async (request, response) => {
  const profiles = await listSelfDirectoryProfiles(request.auth.userId);

  response.status(200).json(
    new ApiResponse({
      message: 'Public-profile settings loaded successfully.',
      data: { profiles },
    }),
  );
});

export const saveSelfDirectoryProfile = asyncHandler(
  async (request, response) => {
    const profile = await updateSelfDirectoryProfile({
      ownerId: request.auth.userId,
      membershipId: request.validated.params.membershipId,
      input: request.validated.body,
    });

    response.status(200).json(
      new ApiResponse({
        message: 'Public profile saved successfully.',
        data: { profile },
      }),
    );
  },
);
