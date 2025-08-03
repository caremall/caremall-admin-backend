import Offer from '../models/Offer.mjs';

export const createOffer = async (req, res) => {
  try {
    let { offerTitle, offerType, offerPeriod, createdBy, status, notes } = req.body;

    const titleConflict = await Offer.findOne({ offerTitle });
    if (titleConflict) {
      return res.status(200).json({ message: 'An offer with the same title already exists.' });
    }

    await Offer.create({
      offerTitle,
      offerType,
      offerPeriod,
      createdBy,
      status,
      notes,
    });

    res.status(201).json({ message: 'Offer created', success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to create offer' });
  }
};

export const getAllOffers = async (req, res) => {
  try {
    const { page = 1, limit = 10, status, offerType, search = '' } = req.query;
    const filter = {};

    if (status) filter.status = status;
    if (offerType) filter.offerType = offerType;
    if (search) filter.offerTitle = { $regex: search, $options: 'i' };

    const skip = (page - 1) * limit;

    const [offers, total] = await Promise.all([
      Offer.find(filter).skip(skip).limit(Number(limit)).sort({ createdAt: -1 }),
      Offer.countDocuments(filter),
    ]);

    res.status(200).json({
      data: offers,
      meta: {
        total,
        page: Number(page),
        limit: Number(limit),
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const getOfferById = async (req, res) => {
  try {
    const offer = await Offer.findById(req.params.id);
    if (!offer) return res.status(404).json({ message: 'Offer not found' });
    res.json(offer);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const updateOffer = async (req, res) => {
  try {
    const { id } = req.params;
    const offer = await Offer.findById(id);
    if (!offer) return res.status(404).json({ message: 'Offer not found' });

    const {
      offerTitle,
      offerType,
      offerPeriod,
      createdBy,
      status,
      notes,
    } = req.body;

    if (offerTitle && offerTitle !== offer.offerTitle) {
      const titleConflict = await Offer.findOne({ offerTitle, _id: { $ne: id } });
      if (titleConflict) {
        return res.status(200).json({ message: 'Another offer with this title already exists.' });
      }
      offer.offerTitle = offerTitle;
    }

    offer.offerType = offerType ?? offer.offerType;
    offer.offerPeriod = offerPeriod ?? offer.offerPeriod;
    offer.createdBy = createdBy ?? offer.createdBy;
    offer.status = status ?? offer.status;
    offer.notes = notes ?? offer.notes;

    await offer.save();

    res.status(200).json({ message: 'Offer updated successfully', success: true });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

export const deleteOffer = async (req, res) => {
  try {
    const { id } = req.params;
    const offer = await Offer.findById(id);
    if (!offer) return res.status(404).json({ message: 'Offer not found' });

    await offer.deleteOne();
    res.status(200).json({ message: 'Offer deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
