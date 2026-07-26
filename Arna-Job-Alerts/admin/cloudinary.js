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

    const data = await response.json();

    console.log(data); // Keep this for testing

    return data.secure_url;
}