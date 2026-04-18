import { v2 as cloudinary } from "cloudinary";

cloudinary.config({
  cloud_name: process.env.CLOUD_NAME,
  api_key: process.env.API_KEY,
  api_secret: process.env.API_SECRET,
  secure: true,
});

export type CloudinaryResponse = {
  public_id: string;
  secure_url: string;
  [key: string]: unknown;
};

/**
 * Upload a file to Cloudinary
 * @param file - The file in base64 format or path
 * @param folder - The folder to store the file in
 */
export async function uploadToCloudinary(
  file: string,
  folder: string = "bizdhan"
): Promise<CloudinaryResponse> {
  return new Promise((resolve, reject) => {
    cloudinary.uploader.upload(
      file,
      {
        folder,
        resource_type: "auto",
      },
      (error, result) => {
        if (error) return reject(error);
        resolve(result as CloudinaryResponse);
      }
    );
  });
}

/**
 * Delete a file from Cloudinary
 * @param publicId - The public ID of the file to delete
 */
export async function deleteFromCloudinary(publicId: string) {
  return new Promise((resolve, reject) => {
    cloudinary.uploader.destroy(publicId, (error, result) => {
      if (error) return reject(error);
      resolve(result);
    });
  });
}

export { cloudinary };
export default cloudinary;
