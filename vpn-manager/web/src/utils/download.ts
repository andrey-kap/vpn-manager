/**
 * Utility function for downloading files from Blob data
 * Handles creating temporary link, triggering download, and cleanup
 */

import toast from 'react-hot-toast';

/**
 * Downloads a Blob as a file with the specified filename
 * @param data - The Blob data to download
 * @param filename - The name of the file to save
 */
export function downloadBlob(data: Blob, filename: string): void {
  try {
    const url = URL.createObjectURL(data);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  } catch (error) {
    console.error('Download failed:', error);
    toast.error('Failed to download file');
  }
}
