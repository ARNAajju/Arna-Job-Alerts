export async function uploadThumbnail(file) {

    const formData = new FormData();

    formData.append("file", file);
    formData.append("upload_preset", "arnajobs");

    const response = await fetch(
        "https://api.cloudinary.com/v1_1/gsizcmtb/image/upload",
        {
            method: "POST",
            body: formData
        }
    );

    let data;

    try {
        data = await response.json();
    } catch (error) {
        throw new Error("Image upload failed. Invalid response from Cloudinary.");
    }

    console.log(data); // Keep this for testing

    if (!response.ok || !data || !data.secure_url) {
        const message =
            data?.error?.message ||
            "Image upload failed. Please try again.";
        throw new Error(message);
    }

    return data.secure_url;
}
