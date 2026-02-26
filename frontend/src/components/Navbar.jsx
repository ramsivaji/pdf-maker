import { Link, useLocation } from "react-router-dom";
import { FileText } from "lucide-react";

export default function Navbar() {
    const location = useLocation();

    const links = [
        { to: "/", label: "🏠 Home" },
        { to: "/pdf-to-word", label: "PDF → Word" },
        { to: "/word-to-pdf", label: "Word → PDF" },
        { to: "/merge-pdfs", label: "Merge PDFs" },
        { to: "/image-to-pdf", label: "Image → PDF" },
    ];

    return (
        <nav className="navbar">
            <Link to="/" className="navbar__brand">
                <FileText size={24} />
                <span>PDF Maker</span>
            </Link>
            <div className="navbar__links">
                {links.map((link) => (
                    <Link
                        key={link.to}
                        to={link.to}
                        className={`navbar__link ${location.pathname === link.to ? "navbar__link--active" : ""}`}
                    >
                        {link.label}
                    </Link>
                ))}
            </div>
        </nav>
    );
}
