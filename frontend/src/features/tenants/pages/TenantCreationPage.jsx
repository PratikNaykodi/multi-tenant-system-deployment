
import { useState } from "react";

function Detail({ label, value, copy }) {
    const [status, setStatus] = useState("");
    const [copying, setCopying] = useState(false);

    const text = String(value ?? "-");

    async function handleCopy() {
        setCopying(true);
        setStatus("");

        try {
            await copyText(text);
            setStatus("success");
        } catch (error) {
            console.error("Copy failed:", error);
            setStatus("error");
        } finally {
            setCopying(false);
        }
    }

    return (
        <div className="detail-row">
            <span>{label}</span>
            <strong>{text}</strong>

            {copy && (
                <button
                    type="button"
                    className={`copy-btn ${
                        status === "success"
                            ? "copy-btn-success"
                            : status === "error"
                            ? "copy-btn-error"
                            : ""
                    }`}
                    onClick={handleCopy}
                    disabled={copying}
                >
                    {copying
                        ? "Copying..."
                        : status === "success"
                        ? "✓ Copied!"
                        : status === "error"
                        ? "Try Again"
                        : "Copy"}
                </button>
            )}

            {status === "success" && (
                <small className="copy-feedback copy-feedback-success">
                    ✓ Copied to clipboard successfully!
                </small>
            )}

            {status === "error" && (
                <small className="copy-feedback copy-feedback-error">
                    ✗ Copy failed. Please select the text and copy manually.
                </small>
            )}
        </div>
    );
}
