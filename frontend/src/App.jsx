import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import Navbar from "./components/Navbar";
import HomePage from "./pages/HomePage";
import PdfToWordPage from "./pages/PdfToWordPage";
import WordToPdfPage from "./pages/WordToPdfPage";
import MergePdfsPage from "./pages/MergePdfsPage";
import ImageToPdfPage from "./pages/ImageToPdfPage";

export default function App() {
  return (
    <BrowserRouter>
      <Toaster position="top-right" toastOptions={{ duration: 4000 }} />
      <Navbar />
      <main className="main-content">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/pdf-to-word" element={<PdfToWordPage />} />
          <Route path="/word-to-pdf" element={<WordToPdfPage />} />
          <Route path="/merge-pdfs" element={<MergePdfsPage />} />
          <Route path="/image-to-pdf" element={<ImageToPdfPage />} />
        </Routes>
      </main>
    </BrowserRouter>
  );
}
