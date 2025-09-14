import Blog from "../../models/Blog.mjs";
import { uploadBase64Image } from "../../utils/uploadImage.mjs";

export const createBlog = async (req, res) => {
    const {
      title,
      imageUrl,
      category,
      description,
      author,
      status,
      tags,
      isFeatured,
      metaTitle,
      metaDescription,
      slug,
    } = req.body;

    const existingBlog = await Blog.findOne({ title: title.trim() });
    if (existingBlog) {
      return res
        .status(400)
        .json({ message: "Blog with this title already exists" });
    }

    let uploadedImageUrl=null;
    if(imageUrl){
      uploadedImageUrl=await uploadBase64Image(imageUrl,"blog-images/");
    }

    const newBlog = await Blog.create({
      title,
      imageUrl: uploadedImageUrl || imageUrl,
      category,
      description,
      author,
      status,
      tags,
      isFeatured,
      metaTitle,
      metaDescription,
      slug,
    });

    res.status(201).json({
      success: true,
      message: "Blog created successfully",
      data: newBlog,
    });
};

export const getAllBlogs = async (req, res) => {
  try {
    const { search = "", status } = req.query;

    const query = {
      ...(search && { title: { $regex: search, $options: "i" } }),
      ...(status && { status }),
    };


   const blogs= await Blog.find(query).sort({ createdAt: -1 })

    res.status(200).json({
      success: true,
      data: blogs,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};

export const getBlogById = async (req, res) => {
  try {
    const blog = await Blog.findById(req.params.id);
    if (!blog) {
      return res.status(404).json({ message: "Blog not found" });
    }
    res.status(200).json({ success: true, data: blog });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};

export const updateBlog = async (req, res) => {
  try {
    const {
      title,
      imageUrl,
      category,
      description,
      author,
      status,
      tags,
      isFeatured,
      metaTitle,
      metaDescription,
      slug,
    } = req.body;

    const blog = await Blog.findById(req.params.id);
    if (!blog) {
      return res.status(404).json({ message: "Blog not found" });
    }

    if(imageUrl&& typeof imageUrl === "string" && imageUrl.startsWith("data:")){
      const uploadedImageUrl=await uploadBase64Image(imageUrl,"blog-images/");
      blog.imageUrl=uploadedImageUrl;
    } else if(imageUrl){
      blog.imageUrl=imageUrl;
    }

    blog.title = title || blog.title;
    blog.category = category || blog.category;
    blog.description = description || blog.description;
    blog.author = author || blog.author;
    blog.status = status || blog.status;
    blog.tags = tags || blog.tags;
    blog.isFeatured = isFeatured ?? blog.isFeatured;
    blog.metaTitle = metaTitle || blog.metaTitle;
    blog.metaDescription = metaDescription || blog.metaDescription;
    blog.slug = slug || blog.slug;

    await blog.save();

    res.status(200).json({
      success: true,
      message: "Blog updated successfully",
      data: blog,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};

export const deleteBlog = async (req, res) => {
  try {
    const blog = await Blog.findByIdAndDelete(req.params.id);
    if (!blog) {
      return res.status(404).json({ message: "Blog not found" });
    }
    res.status(200).json({
      success: true,
      message: "Blog deleted successfully",
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};
