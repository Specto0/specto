import "./LoadingSpinner.css";

interface LoadingSpinnerProps {
  color?: string;
  size?: "small" | "medium" | "large";
  fullscreen?: boolean;
}

export default function LoadingSpinner({
  color = "#3b82f6",
  size = "medium",
  fullscreen = false,
}: LoadingSpinnerProps) {
  return (
    <div
      className={`loading-spinner-container${
        fullscreen ? " loading-spinner-container--fullscreen" : ""
      }`}
    >
      <div className="loading-spinner-wrapper">
        <div className={`loading-spinner loading-spinner--${size}`}>
          <div
            className="spinner-ring spinner-ring-1"
            style={{ borderTopColor: color }}
          ></div>
          <div
            className="spinner-ring spinner-ring-2"
            style={{ borderTopColor: color }}
          ></div>
          <div
            className="spinner-ring spinner-ring-3"
            style={{ borderTopColor: color }}
          ></div>
        </div>
        <p className="loading-text">Specto</p>
        <p
          className="loading-text loading-text-subtitle"
          style={{ fontSize: "0.75rem" }}
        >
          Stream Without Limits
        </p>
      </div>
    </div>
  );
}
