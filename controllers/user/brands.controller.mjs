import Brand from '../../models/Brand.mjs'


export const getAllBrands = async (req, res) => {
    try {
        const brands = await Brand.find()
        res.json(brands)
    } catch (error) {
        console.log(error);
        res.status(500).json({ message: 'Internal server error' })
    }
}