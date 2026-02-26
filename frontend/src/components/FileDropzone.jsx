import { useDropzone } from "react-dropzone";
import { UploadCloud } from "lucide-react";

/**
 * Reusable drag-and-drop file upload zone component.
 * Props:
 *  - onDrop: function called with accepted files
 *  - accept: object, e.g. { "application/pdf": [".pdf"] }
 *  - multiple: boolean
 *  - label: string shown inside the zone
 */
export default function FileDropzone({ onDrop, accept, multiple = false, label }) {
    const { getRootProps, getInputProps, isDragActive, acceptedFiles } = useDropzone({
        onDrop,
        accept,
        multiple,
    });

    return (
        <div
            {...getRootProps()}
            className={`dropzone ${isDragActive ? "dropzone--active" : ""}`}
        >
            <input {...getInputProps()} />
            <UploadCloud size={48} strokeWidth={1.5} className="dropzone__icon" />
            {isDragActive ? (
                <p className="dropzone__text dropzone__text--active">Drop the files here!</p>
            ) : (
                <>
                    <p className="dropzone__text">{label || "Drag & drop files here, or click to browse"}</p>
                    <p className="dropzone__subtext">Files will be deleted from our server immediately after download.</p>
                </>
            )}
            {acceptedFiles.length > 0 && (
                <ul className="dropzone__file-list">
                    {acceptedFiles.map((file) => (
                        <li key={file.path} className="dropzone__file-item">
                            📄 {file.name} <span>({(file.size / 1024 / 1024).toFixed(2)} MB)</span>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
}
