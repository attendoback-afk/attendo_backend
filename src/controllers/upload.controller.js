const { uploadImage }= require ("../services/upload.service.js");

 const uploadStudentImage = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        message: "No image uploaded",
      });
    }

    const imageUrl = await uploadImage(req.file);

   return res.status(200).json({
      success: true,
      imageUrl,
    });
  } catch (err) {
    console.error(err);

   return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};
module.exports={
    uploadStudentImage,
};