import ToolPage from "../components/ToolPage";

export default function MergePdfsPage() {
    return (
        <ToolPage
            title="Merge PDFs"
            description="Combine multiple PDF files into one single document. Upload 2 to 20 PDF files — they will be merged in the order you select them."
            acceptTypes={{ "application/pdf": [".pdf"] }}
            multiple={true}
            dropLabel="Drop 2 or more PDF files here, or click to browse"
            endpoint="/api/convert/merge-pdfs"
            outputFilename="merged_document.pdf"
            buttonLabel="Merge PDFs"
        />
    );
}
