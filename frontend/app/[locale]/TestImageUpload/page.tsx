"use client";

import { uploadToFirebase } from "@/lib/firebase/uploadtofirebase";
import { useState } from "react";

const ACCEPTED_TYPES = ["image/png", "image/jpeg", "image/webp", "image/gif"];
const MAX_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB

export default function Page() {
  const [uploadProgress, setUploadProgress] = useState(0);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [fileUrl, setFileUrl] = useState<string>("");
  const [error, setError] = useState<string | null>(null);

  const validateFile = (file: File): string | null => {
    if (!ACCEPTED_TYPES.includes(file.type)) {
      return "Unsupported file type. Please upload PNG, JPEG, WebP or GIF.";
    }
    if (file.size > MAX_SIZE_BYTES) {
      return `File is too large. Maximum size is ${MAX_SIZE_BYTES / 1024 / 1024} MB.`;
    }
    return null;
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!imageFile) {
      setError("No image selected.");
      return;
    }

    const validationError = validateFile(imageFile);
    if (validationError) {
      setError(validationError);
      return;
    }

    setError(null);

    try {
      const url = await uploadToFirebase(imageFile);
      setFileUrl(url || "");
      setImageFile(null);
      setUploadProgress(0);
    } catch (uploadError) {
      setError(
        uploadError instanceof Error
          ? `Upload failed: ${uploadError.message}`
          : "Upload failed. Please try again."
      );
    }
  };

  return (
    <div className="w-full h-screen flex items-center justify-center bg-lumen-background">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm flex flex-col gap-3 items-center bg-lumen-card border border-lumen-border rounded-lg text-lumen-text p-4 shadow"
      >
        <h1 className="text-lg font-semibold text-lumen-text">Upload your image</h1>
        <input
          type="file"
          id="imageFile"
          accept={ACCEPTED_TYPES.join(",")}
          aria-describedby={error ? "upload-error" : undefined}
          onChange={(e) => {
            const file = e.target.files?.[0] ?? null;
            setImageFile(file);
            setUploadProgress(0);
            setFileUrl("");
            setError(null);
            if (file) {
              const validationError = validateFile(file);
              if (validationError) setError(validationError);
            }
          }}
          className="w-full p-2 rounded border border-lumen-border bg-lumen-background text-lumen-text file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-lumen-primary file:text-lumen-text hover:file:bg-lumen-hover"
        />

        {error && (
          <p id="upload-error" role="alert" className="w-full text-sm text-red-400">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={!imageFile}
          className="w-full p-2 rounded text-lumen-text bg-lumen-primary hover:bg-lumen-hover transition-colors disabled:opacity-50"
        >
          Upload Image
        </button>

        {uploadProgress > 0 && uploadProgress < 100 && (
          <p role="status">Uploading… {uploadProgress}%</p>
        )}

        {fileUrl && (
          <p className="text-sm break-all">
            Uploaded:{" "}
            <a href={fileUrl} target="_blank" rel="noopener noreferrer" className="underline">
              {fileUrl}
            </a>
          </p>
        )}
      </form>
    </div>
  );
}