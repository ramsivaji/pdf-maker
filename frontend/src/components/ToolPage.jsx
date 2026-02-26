import { useState, useCallback } from "react";
import { CheckCircle, AlertCircle, Loader } from "lucide-react";
import toast from "react-hot-toast";
import FileDropzone from "./FileDropzone";
import { convertFile } from "../services/api";

/**
 * Generic tool page wrapper component.
 * Props:
 *  - title: page title (e.g. "PDF to Word")
 *  - description: brief description of what the tool does
 *  - acceptTypes: object for react-dropzone accept prop
 *  - multiple: boolean, allow multiple files
 *  - dropLabel: label shown inside the dropzone
 *  - endpoint: API endpoint string
 *  - outputFilename: name for the downloaded file
 *  - buttonLabel: convert button text
 */
export default function ToolPage({
    title,
    description,
    acceptTypes,
    multiple = false,
    dropLabel,
    endpoint,
    outputFilename,
    buttonLabel = "Convert",
}) {
    const [files, setFiles] = useState([]);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [status, setStatus] = useState("idle"); // idle | uploading | processing | done | error
    const [errorMsg, setErrorMsg] = useState("");

    const onDrop = useCallback((acceptedFiles) => {
        setFiles(acceptedFiles);
        setStatus("idle");
        setErrorMsg("");
        setUploadProgress(0);
    }, []);

    const handleConvert = async () => {
        if (files.length === 0) {
            toast.error("Please select at least one file first.");
            return;
        }

        setStatus("uploading");
        setUploadProgress(0);
        setErrorMsg("");

        try {
            await convertFile(endpoint, files, outputFilename, (percent) => {
                setUploadProgress(percent);
                if (percent === 100) {
                    setStatus("processing");
                }
            });
            setStatus("done");
            toast.success("Conversion complete! Your file is downloading.");
        } catch (err) {
            setStatus("error");
            const msg =
                err?.response?.data instanceof Blob
                    ? await err.response.data.text().then((t) => {
                        try {
                            return JSON.parse(t).detail;
                        } catch {
                            return t;
                        }
                    })
                    : err?.message || "An unexpected error occurred.";
            setErrorMsg(msg);
            toast.error("Conversion failed. See error below.");
        }
    };

    const handleReset = () => {
        setFiles([]);
        setStatus("idle");
        setErrorMsg("");
        setUploadProgress(0);
    };

    return (
        <div className="tool-page">
            <div className="tool-page__header">
                <h1 className="tool-page__title">{title}</h1>
                <p className="tool-page__description">{description}</p>
            </div>

            <div className="tool-page__card">
                <FileDropzone onDrop={onDrop} accept={acceptTypes} multiple={multiple} label={dropLabel} />

                {/* Upload Progress Bar */}
                {(status === "uploading" || status === "processing") && (
                    <div className="progress-container">
                        {status === "uploading" && (
                            <>
                                <div className="progress-bar">
                                    <div className="progress-bar__fill" style={{ width: `${uploadProgress}%` }} />
                                </div>
                                <p className="progress-text">Uploading... {uploadProgress}%</p>
                            </>
                        )}
                        {status === "processing" && (
                            <div className="processing-indicator">
                                <Loader size={20} className="spin" />
                                <p className="progress-text">Processing your file, please wait...</p>
                            </div>
                        )}
                    </div>
                )}

                {/* Success */}
                {status === "done" && (
                    <div className="status-banner status-banner--success">
                        <CheckCircle size={20} />
                        <span>Done! Your file was downloaded successfully.</span>
                    </div>
                )}

                {/* Error */}
                {status === "error" && (
                    <div className="status-banner status-banner--error">
                        <AlertCircle size={20} />
                        <span>{errorMsg}</span>
                    </div>
                )}

                <div className="tool-page__actions">
                    <button
                        className="btn btn--primary"
                        onClick={handleConvert}
                        disabled={files.length === 0 || status === "uploading" || status === "processing"}
                    >
                        {status === "uploading" || status === "processing" ? (
                            <><Loader size={16} className="spin" /> Converting...</>
                        ) : (
                            buttonLabel
                        )}
                    </button>

                    {(files.length > 0 || status === "done" || status === "error") && (
                        <button className="btn btn--secondary" onClick={handleReset}>
                            Clear / New File
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}
