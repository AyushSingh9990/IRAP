import mongoose from 'mongoose';
import { ROLE_VALUES } from '../constants/roles.js';

const roleDefinitionSchema = new mongoose.Schema(
  {
    role: { type: String, enum: ROLE_VALUES, required: true, unique: true, index: true },
    label: { type: String, required: true, trim: true, maxlength: 120 },
    description: { type: String, trim: true, maxlength: 600, default: '' },
    additionalPermissions: { type: [String], default: [] },
    active: { type: Boolean, default: true, index: true },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  },
  {
    timestamps: true,
    toJSON: {
      transform(_document, returned) {
        returned.id = returned._id?.toString();
        delete returned._id;
        delete returned.__v;
        return returned;
      },
    },
  },
);

const RoleDefinition =
  mongoose.models.RoleDefinition || mongoose.model('RoleDefinition', roleDefinitionSchema);

export default RoleDefinition;
