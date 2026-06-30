const supabase= require ("../utils/supabase.js");

 const uploadImage = async (file) => {
  if (!supabase) {
    throw new Error(
      "Supabase is not configured. Set SUPABASE_URL and SUPABASE_ANON_KEY in Railway Variables."
    );
  }

  const fileName = `${Date.now()}-${file.originalname}`;

  const { error } = await supabase.storage
    .from("student-images")
    .upload(fileName, file.buffer, {
      contentType: file.mimetype,
      upsert: true,
    });

  if (error) {
    throw error;
  }

  const { data } = supabase.storage
    .from("student-images")
    .getPublicUrl(fileName);

  return data.publicUrl;
};
module.exports={
    uploadImage,
};
