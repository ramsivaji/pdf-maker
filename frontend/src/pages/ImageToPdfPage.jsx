import ToolPage from "../components/ToolPage";

export default function ImageToPdfPage() {
    return (
        <ToolPage
            title="Image to PDF"
            description="Convert one or multiple images (JPG, PNG, WebP, BMP) into a single PDF document. Perfect for scanning or sharing photos as a document."
            acceptTypes={{
                "image/jpeg": [".jpg", ".jpeg"],
                "image/png": [".png"],
                "image/webp": [".webp"],
                "image/bmp": [".bmp"],
                "image/tiff": [".tiff", ".tif"],
            }}
            multiple={true}
            dropLabel="Drop your image files here, or click to browse"
            endpoint="/api/convert/image-to-pdf"
            outputFilename="converted_images.pdf"
            buttonLabel="Convert to PDF"
        />
    );
}
