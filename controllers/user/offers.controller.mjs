import Offer from '../../models/offerManagement.mjs';

// Get active published offers with a valid duration
export const getPublishedOffersWithDuration = async (req, res) => {
    try {
        const currentDate = new Date();

        const offers = await Offer.find({
            offerStatus: 'published',
            offerRedeemTimePeriod: {
                $exists: true,
                $type: 'array',
                $size: 2
            },
            'offerRedeemTimePeriod.0': { $lte: currentDate }, // start date <= now
            'offerRedeemTimePeriod.1': { $gte: currentDate }  // end date >= now
        });

        res.status(200).json(offers);
    } catch (error) {
        console.error('Error fetching offers:', error);
        res.status(500).json({
            success: false,
            message: 'Server error while fetching offers',
            error: error.message
        });
    }
};
