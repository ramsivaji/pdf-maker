import { Link } from "react-router-dom";
import { FileText, FileType, Combine, Image } from "lucide-react";

const tools = [
    {
        icon: FileType,
        title: "PDF to Word",
        description: "Convert PDF documents into editable .docx Word files.",
        to: "/pdf-to-word",
        color: "#4F8EF7",
    },
    {
        icon: FileText,
        title: "Word to PDF",
        description: "Convert .docx Word documents into professional PDFs.",
        to: "/word-to-pdf",
        color: "#F76A4F",
    },
    {
        icon: Combine,
        title: "Merge PDFs",
        description: "Combine multiple PDF files into one single document.",
        to: "/merge-pdfs",
        color: "#A44FF7",
    },
    {
        icon: Image,
        title: "Image to PDF",
        description: "Turn JPG, PNG, and other images into a PDF document.",
        to: "/image-to-pdf",
        color: "#4FC8A4",
    },
];

export default function HomePage() {
    return (
        <>
            <div className="home-page">
                <div className="home-page__hero">
                    <h1 className="home-page__title">
                        Your Free Online <span className="gradient-text">PDF Maker</span> Toolbox
                    </h1>
                    <p className="home-page__subtitle">
                        Fast, secure, and private. Files are processed on the server and deleted immediately after download.
                    </p>
                </div>

                <div className="tools-grid">
                    {tools.map((tool) => {
                        const Icon = tool.icon;
                        return (
                            <Link to={tool.to} key={tool.to} className="tool-card">
                                <div className="tool-card__icon-wrap" style={{ "--card-color": tool.color }}>
                                    <Icon size={32} color={tool.color} strokeWidth={1.5} />
                                </div>
                                <h2 className="tool-card__title">{tool.title}</h2>
                                <p className="tool-card__description">{tool.description}</p>
                                <span className="tool-card__cta">Use Tool →</span>
                            </Link>
                        );
                    })}
                </div>
            </div>

            <footer className="home-footer">
                © 2026 PDF Maker. All rights reserved — Kaisarlla Rama Sivaji
            </footer>
        </>
    );
}

