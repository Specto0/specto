import { useEffect } from "react";
import "./TrailerModal.css";

type TrailerModalProps = {
    isOpen: boolean;
    onClose: () => void;
    videoKey: string;
    title?: string;
};

export default function TrailerModal({
    isOpen,
    onClose,
    videoKey,
    title = "Trailer",
}: TrailerModalProps) {
    useEffect(() => {
        const handleEsc = (e: KeyboardEvent) => {
            if (e.key === "Escape") onClose();
        };
        if (isOpen) {
            document.addEventListener("keydown", handleEsc);
            document.body.style.overflow = "hidden"; // Prevent background scrolling
        }
        return () => {
            document.removeEventListener("keydown", handleEsc);
            document.body.style.overflow = "unset";
        };
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    return (
        <div className="trailer-modal-overlay" onClick={onClose} role="dialog" aria-modal="true">
            <div className="trailer-modal-content" onClick={(e) => e.stopPropagation()}>
                <button className="trailer-modal-close" onClick={onClose} aria-label="Fechar">
                    <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="24"
                        height="24"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                    >
                        <line x1="18" y1="6" x2="6" y2="18"></line>
                        <line x1="6" y1="6" x2="18" y2="18"></line>
                    </svg>
                </button>
                <div className="trailer-modal-video">
                    <iframe
                        src={`https://www.youtube.com/embed/${videoKey}?autoplay=1&rel=0`}
                        title={title}
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                    />
                </div>
            </div>
        </div>
    );
}
