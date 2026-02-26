import axios from "axios";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 300000, // 5 minutes — large file conversions may take time
});

/**
 * Generic helper: uploads files and downloads the resulting converted file.
 * @param {string} endpoint - The API endpoint path (e.g. '/api/convert/pdf-to-word')
 * @param {File[]} files - Array of file objects to upload
 * @param {string} outputFilename - The name to save the downloaded file as
 * @param {function} onProgress - Callback to report upload progress (0-100)
 */
export async function convertFile(endpoint, files, outputFilename, onProgress) {
  const formData = new FormData();

  if (files.length === 1) {
    formData.append("file", files[0]);
  } else {
    files.forEach((file) => formData.append("files", file));
  }

  const response = await api.post(endpoint, formData, {
    responseType: "blob",
    headers: { "Content-Type": "multipart/form-data" },
    onUploadProgress: (progressEvent) => {
      if (progressEvent.total) {
        const percent = Math.round((progressEvent.loaded * 100) / progressEvent.total);
        onProgress && onProgress(percent);
      }
    },
  });

  // Trigger browser download
  const url = window.URL.createObjectURL(new Blob([response.data]));
  const link = document.createElement("a");
  link.href = url;
  link.setAttribute("download", outputFilename);
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
}
