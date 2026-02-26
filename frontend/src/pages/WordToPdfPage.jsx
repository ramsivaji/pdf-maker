import ToolPage from "../components/ToolPage";

export default function WordToPdfPage() {
    return (
        <ToolPage
            title="Word to PDF"
            description="Convert your Microsoft Word (.docx) files to a professional PDF document. Uses LibreOffice for perfect formatting."
            acceptTypes={{
                "application/vnd.openxmlformats-officedocument.wordprocessingml.document": [".docx"],
                "application/msword": [".doc"],
            }}
            multiple={false}
            dropLabel="Drop your Word (.docx) file here, or click to browse"
            endpoint="/api/convert/word-to-pdf"
            outputFilename="converted_document.pdf"
            buttonLabel="Convert to PDF"
        />
    );
}
