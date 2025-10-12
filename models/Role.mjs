import mongoose from 'mongoose';

const { Schema, model } = mongoose;

const roleSchema = new Schema(
    {
        name: {
            type: String,
            required: true,
            unique: true,
            trim: true,
        },
        permissions: {
            type: [String],
            default: [],
        },
        description: {
            type: String,
            trim: true,
            default: '',
        },
        status: {
            type: String,
            enum: ['draft', 'published'],
            default: 'draft',
        },
    },
    {
        timestamps: true,
    }
);

const Role = model('Role', roleSchema);
export default Role;