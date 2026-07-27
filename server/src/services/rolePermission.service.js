import {
  AUDIT_ACTIONS,
  AUDIT_ENTITY_TYPES,
} from '../constants/auditActions.js';
import {
  getEffectivePermissions,
  PERMISSIONS,
  ROLE_PERMISSIONS,
} from '../constants/permissions.js';
import { ROLE_VALUES } from '../constants/roles.js';
import RoleDefinition from '../models/RoleDefinition.js';
import { ApiError } from '../utils/ApiError.js';
import { recordSuccessfulAudit } from './auditLog.service.js';

const roleLabels = Object.freeze({
  visitor: 'Visitor',
  applicant: 'Applicant',
  member: 'Professional member',
  training_provider: 'Training provider',
  organization: 'Organization',
  reviewer: 'Reviewer',
  content_manager: 'Content manager',
  finance_manager: 'Finance manager',
  support_agent: 'Support agent',
  super_admin: 'Super administrator',
});

function uniqueValidPermissions(values = []) {
  const allowed = new Set(Object.values(PERMISSIONS));
  return [...new Set(values.filter((value) => allowed.has(value)))];
}

export async function resolveUserPermissions(user) {
  if (!user) return [];
  const assignedRoles = user.roles || [];
  const definitions = await RoleDefinition.find({
    role: { $in: assignedRoles },
  }).select('role active additionalPermissions');

  const byRole = new Map(
    definitions.map((definition) => [definition.role, definition]),
  );
  const activeRoles = assignedRoles.filter(
    (role) => byRole.get(role)?.active !== false,
  );
  const configured = activeRoles.flatMap(
    (role) => byRole.get(role)?.additionalPermissions || [],
  );

  return getEffectivePermissions(activeRoles, [
    ...(user.additionalPermissions || []),
    ...configured,
  ]);
}

export async function listRoleDefinitions() {
  const definitions = await RoleDefinition.find({}).lean();
  const byRole = new Map(definitions.map((item) => [item.role, item]));

  return ROLE_VALUES.map((role) => {
    const stored = byRole.get(role);
    const basePermissions = ROLE_PERMISSIONS[role] || [];
    const configuredPermissions = uniqueValidPermissions(
      stored?.additionalPermissions || [],
    );

    return {
      id: stored?._id?.toString() || role,
      role,
      label: stored?.label || roleLabels[role] || role,
      description: stored?.description || '',
      active: stored?.active ?? true,
      basePermissions,
      additionalPermissions: configuredPermissions,
      effectivePermissions: [
        ...new Set([...basePermissions, ...configuredPermissions]),
      ],
      protected: role === 'super_admin',
      updatedAt: stored?.updatedAt || null,
    };
  });
}

export async function updateRoleDefinition({
  role,
  input,
  actor,
  context,
}) {
  if (role === 'super_admin' && input.active === false) {
    throw new ApiError(409, 'The super-administrator role cannot be disabled.');
  }

  const additionalPermissions = uniqueValidPermissions(
    input.additionalPermissions,
  ).filter((permission) => !(ROLE_PERMISSIONS[role] || []).includes(permission));

  const previous = await RoleDefinition.findOne({ role }).lean();
  const definition = await RoleDefinition.findOneAndUpdate(
    { role },
    {
      role,
      label: input.label,
      description: input.description,
      additionalPermissions,
      active: input.active,
      updatedBy: actor.userId,
    },
    { upsert: true, new: true, runValidators: true, setDefaultsOnInsert: true },
  );

  await recordSuccessfulAudit(
    {
      action: AUDIT_ACTIONS.ROLE_DEFINITION_UPDATED,
      actor,
      entityType: AUDIT_ENTITY_TYPES.ROLE_DEFINITION,
      entityId: role,
      previousValues: previous || {},
      reason: `Role definition updated for ${role}.`,
      context,
    },
    definition.toJSON(),
  );

  return definition.toJSON();
}
