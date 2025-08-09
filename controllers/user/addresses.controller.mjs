import Address from '../../models/Address.mjs';


/**
 * @desc Add new address
 */
export const addAddress = async (req, res) => {
    try {
        const userId = req.user._id;
        const { isDefault, addressType } = req.body;

        // If isDefault, unset previous default of same type for this user
        if (isDefault) {
            await Address.updateMany(
                { user: userId, addressType },
                { $set: { isDefault: false } }
            );
        }

        const address = await Address.create({
            user: userId,
            fullName: req.body.fullName,
            phone: req.body.phone,
            alternatePhone: req.body.alternatePhone || '',
            addressLine1: req.body.addressLine1,
            addressLine2: req.body.addressLine2 || '',
            landmark: req.body.landmark || '',
            district: req.body.district,
            city: req.body.city,
            state: req.body.state,
            postalCode: req.body.postalCode,
            country: req.body.country || 'India',
            mapLocation: req.body.mapLocation || null,
            addressType,
            label: req.body.label || 'home',
            isDefault: !!isDefault,
        });

        res.status(201).json({ message: 'Address added', address });
    } catch (error) {
        console.error('Add Address Error:', error);
        res.status(500).json({ message: 'Failed to add address' });
    }
};


/**
 * @desc Get all addresses of logged-in user
 */
export const getUserAddresses = async (req, res) => {
    try {
        const userId = req.user._id;

        const addresses = await Address.find({ user: userId }).sort({ createdAt: -1 });

        res.status(200).json(addresses);
    } catch (error) {
        console.error('Get Addresses Error:', error);
        res.status(500).json({ message: 'Failed to fetch addresses' });
    }
};


/**
 * @desc Update an address
 */
export const updateAddress = async (req, res) => {
    try {
        const userId = req.user._id;
        const { id } = req.params;
        const { isDefault, addressType } = req.body;

        const address = await Address.findOne({ _id: id, user: userId });
        if (!address) return res.status(404).json({ message: 'Address not found' });

        if (isDefault) {
            await Address.updateMany(
                { user: userId, addressType },
                { $set: { isDefault: false } }
            );
        }

        Object.assign(address, {
            fullName: req.body.fullName ?? address.fullName,
            phone: req.body.phone ?? address.phone,
            alternatePhone: req.body.alternatePhone ?? address.alternatePhone,
            addressLine1: req.body.addressLine1 ?? address.addressLine1,
            addressLine2: req.body.addressLine2 ?? address.addressLine2,
            landmark: req.body.landmark ?? address.landmark,
            district: req.body.district ?? address.district,
            city: req.body.city ?? address.city,
            state: req.body.state ?? address.state,
            postalCode: req.body.postalCode ?? address.postalCode,
            country: req.body.country ?? address.country,
            mapLocation: req.body.mapLocation ?? address.mapLocation,
            addressType: addressType ?? address.addressType,
            label: req.body.label ?? address.label,
            isDefault: isDefault ?? address.isDefault,
        });

        await address.save();

        res.status(200).json({ message: 'Address updated', address });
    } catch (error) {
        console.error('Update Address Error:', error);
        res.status(500).json({ message: 'Failed to update address' });
    }
};


/**
 * @desc Delete an address
 */
export const deleteAddress = async (req, res) => {
    try {
        const userId = req.user._id;
        const { id } = req.params;

        const deleted = await Address.findOneAndDelete({ _id: id, user: userId });
        if (!deleted) return res.status(404).json({ message: 'Address not found' });

        res.status(200).json({ message: 'Address deleted' });
    } catch (error) {
        console.error('Delete Address Error:', error);
        res.status(500).json({ message: 'Failed to delete address' });
    }
};


/**
 * @desc Set an address as default
 */
export const setDefaultAddress = async (req, res) => {
    try {
        const userId = req.user._id;
        const { id } = req.params;

        const address = await Address.findOne({ _id: id, user: userId });
        if (!address) return res.status(404).json({ message: 'Address not found' });

        await Address.updateMany(
            { user: userId, addressType: address.addressType },
            { $set: { isDefault: false } }
        );

        address.isDefault = true;
        await address.save();

        res.status(200).json({ message: 'Default address set', address });
    } catch (error) {
        console.error('Set Default Address Error:', error);
        res.status(500).json({ message: 'Failed to set default address' });
    }
};
