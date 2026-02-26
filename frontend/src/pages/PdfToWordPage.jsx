import ToolPage from "../components/ToolPage";

export default function PdfToWordPage() {
    return (
        <ToolPage
            title="PDF to Word"
            description="Convert any PDF document into an editable Microsoft Word (.docx) file. Layout, tables, and images are preserved as best as possible."
            acceptTypes={{ "application/pdf": [".pdf"] }}
            multiple={false}
            dropLabel="Drop your PDF file here, or click to browse"
            endpoint="/api/convert/pdf-to-word"
            outputFilename="converted_document.docx"
            buttonLabel="Convert to Word"
        />
    );
}
