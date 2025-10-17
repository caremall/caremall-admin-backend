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
            
            dashboard: {
                view: { type: Boolean, default: false }
            },

            
            warehouseManager: {
                create: { type: Boolean, default: false },
                view: { type: Boolean, default: false },
                edit: { type: Boolean, default: false },
                delete: { type: Boolean, default: false }
            },


            warehouse: {
                create: { type: Boolean, default: false },
                view: { type: Boolean, default: false },
                edit: { type: Boolean, default: false },
                delete: { type: Boolean, default: false }
            },

            
            location: {
                create: { type: Boolean, default: false },
                view: { type: Boolean, default: false },
                edit: { type: Boolean, default: false },
                delete: { type: Boolean, default: false }
            },

            
            orders: {
                view: { type: Boolean, default: false },
                update: { type: Boolean, default: false }
            },

            
            inventory: {
                overview: { type: Boolean, default: false },
                history: { type: Boolean, default: false },
                lowStockAlerts: { type: Boolean, default: false },
                damagedInventory: { type: Boolean, default: false },
                stockTransaction: { type: Boolean, default: false },
                stockAdjustment: { type: Boolean, default: false }
            },

            
            products: {
                create: { type: Boolean, default: false },
                view: { type: Boolean, default: false },
                edit: { type: Boolean, default: false },
                delete: { type: Boolean, default: false }
            },

            
            userManagement: {
                block: { type: Boolean, default: false },
                view: { type: Boolean, default: false }
            },

            
            websiteManagement: {
                manage: { type: Boolean, default: false }
            },

            
            admin: {
                create: { type: Boolean, default: false },
                view: { type: Boolean, default: false },
                edit: { type: Boolean, default: false },
                delete: { type: Boolean, default: false },
            },

            
            roles: {
                create: { type: Boolean, default: false },
                view: { type: Boolean, default: false },
                edit: { type: Boolean, default: false },
                delete: { type: Boolean, default: false },
            },

            
           
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