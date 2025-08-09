import Category from "../../models/Category.mjs";



export const getAllCategories = async (req, res) => {
    try {
        const categories = await Category.find()
        res.json(categories)
    } catch (error) {
        console.log(error);
        res.json({ message: 'Internal server error' })

    }
}