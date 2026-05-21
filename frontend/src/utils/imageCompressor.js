/**
 * Compresses and resizes image files client-side using HTML5 Canvas.
 * This ensures high quality while reducing file size and bandwidth consumption
 * for mobile uploads.
 * 
 * @param {File} file - The original file selected by the user.
 * @param {number} maxWidth - Maximum allowed width of the compressed image.
 * @param {number} maxHeight - Maximum allowed height of the compressed image.
 * @param {number} quality - Output JPEG quality (0.0 to 1.0).
 * @returns {Promise<File>} A promise that resolves to the compressed/resized File.
 */
export const compressImage = (file, maxWidth = 1200, maxHeight = 1200, quality = 0.8) => {
  return new Promise((resolve, reject) => {
    // If the file is not an image (e.g. video, gif, etc.), skip compression
    if (!file.type.startsWith('image/') || file.type === 'image/gif') {
      return resolve(file);
    }

    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target.result;
      
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        // Calculate new dimensions while maintaining aspect ratio
        if (width > height) {
          if (width > maxWidth) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          return resolve(file); // Fallback to original if canvas context unavailable
        }

        // Draw image onto canvas with new dimensions
        ctx.drawImage(img, 0, 0, width, height);

        // Convert canvas back to Blob, then to File
        canvas.toBlob(
          (blob) => {
            if (!blob) {
              return resolve(file); // Fallback to original on compression error
            }
            const compressedFile = new File([blob], file.name, {
              type: file.type,
              lastModified: Date.now(),
            });
            resolve(compressedFile);
          },
          file.type,
          quality
        );
      };

      img.onerror = (err) => {
        console.error('Image loading error:', err);
        resolve(file); // Fallback to original
      };
    };

    reader.onerror = (err) => {
      console.error('File reading error:', err);
      resolve(file); // Fallback to original
    };
  });
};
