import {
  AUDIT_ACTIONS,
  AUDIT_ENTITY_TYPES,
} from '../constants/auditActions.js';
import { ROLES } from '../constants/roles.js';
import RefreshSession from '../models/RefreshSession.js';
import RoleDefinition from '../models/RoleDefinition.js';
import User from '../models/User.js';
import { ApiError } from '../utils/ApiError.js';
import { recordSuccessfulAudit } from './auditLog.service.js';
import { resolveUserPermissions } from './rolePermission.service.js';

function escapeRegex(value) {
  return String(value || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function serialize(user, permissions = []) {
  return {
    id: user.id,
    displayName: user.displayName || user.fullName,
    firstName: user.firstName,
    lastName: user.lastName,
    email: user.email,
    accountStatus: user.accountStatus,
    emailVerified: Boolean(user.emailVerifiedAt),
    roles: user.roles,
    additionalPermissions: user.additionalPermissions,
    effectivePermissions: permissions,
    twoFactorEnforced: Boolean(user.twoFactor?.enforcedByAdmin),
    lastLoginAt: user.lastLoginAt,
    createdAt: user.createdAt,
  };
}

export async function listAdminUsers({ status, role, search, page, limit }) {
  const query = {};
  if (status) query.accountStatus = status;
  if (role) query.roles = role;
  if (search) {
    const expression = new RegExp(escapeRegex(search), 'i');
    query.$or = [
      { email: expression },
      { displayName: expression },
      { firstName: expression },
      { lastName: expression },
    ];
  }

  const skip = (page - 1) * limit;
  const [users, total] = await Promise.all([
    User.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit),
    User.countDocuments(query),
  ]);
  const items = [];
  for (const user of users) {
    items.push(serialize(user, await resolveUserPermissions(user)));
  }
  return {
    items,
    meta: { page, limit, total, pages: Math.max(1, Math.ceil(total / limit)) },
  };
}

export async function updateAdminUser({ userId, input, actor, context }) {
  const user = await User.findById(userId);
  if (!user) throw new ApiError(404, 'User account not found.');

  if (user.id === actor.userId && input.accountStatus !== 'active') {
    throw new ApiError(409, 'You cannot disable or suspend your own active administrator session.');
  }

  const inactiveAssignedRoles = await RoleDefinition.find({
    role: { $in: input.roles },
    active: false,
  }).distinct('role');
  if (inactiveAssignedRoles.length) {
    throw new ApiError(
      409,
      `Inactive roles cannot be assigned: ${inactiveAssignedRoles.join(', ')}.`,
    );
  }

  const losingActiveSuperAdmin =
    user.roles.includes(ROLES.SUPER_ADMIN) &&
    (!input.roles.includes(ROLES.SUPER_ADMIN) || input.accountStatus !== 'active');
  if (losingActiveSuperAdmin) {
    const otherSuperAdmins = await User.countDocuments({
      _id: { $ne: user._id },
      roles: ROLES.SUPER_ADMIN,
      accountStatus: 'active',
    });
    if (!otherSuperAdmins) {
      throw new ApiError(409, 'At least one active super administrator must remain.');
    }
  }

  const previousStatus = user.accountStatus;
  const previous = serialize(user, await resolveUserPermissions(user));
  user.accountStatus = input.accountStatus;
  user.roles = [...new Set(input.roles)];
  user.additionalPermissions = [...new Set(input.additionalPermissions)];
  user.twoFactor.enforcedByAdmin = input.twoFactorEnforced;
  user.twoFactor.updatedAt = new Date();
  if (input.accountStatus === 'active' && previousStatus === 'locked') {
    user.failedLoginAttempts = 0;
    user.lockUntil = null;
  }
  await user.save();

  await RefreshSession.updateMany(
    { user: user._id, revokedAt: null },
    { revokedAt: new Date(), revocationReason: 'Administrator updated account access.' },
  );

  const next = serialize(user, await resolveUserPermissions(user));
  await recordSuccessfulAudit(
    {
      action: AUDIT_ACTIONS.USER_ADMIN_UPDATED,
      actor,
      entityType: AUDIT_ENTITY_TYPES.USER,
      entityId: user.id,
      subjectUser: user._id,
      previousValues: previous,
      reason: input.reason,
      context,
    },
    next,
  );
  return next;
}
