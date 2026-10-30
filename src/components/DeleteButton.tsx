"use client";

import { useState } from "react";

/** F11: "Delete my answers" with a confirm step built into the page. */
export function DeleteButton({ onConfirm }: { onConfirm: () => void }) {
  const [asking, setAsking] = useState(false);
  if (!asking) {
    return (
      <button className="btn-link" onClick={() => setAsking(true)}>
        Delete my answers
      </button>
    );
  }
  return (
    <span className="confirm" role="group" aria-label="Confirm delete">
      <span>Delete all answers from this browser?</span>
      <button
        className="btn btn-dark btn-sm"
        onClick={() => {
          setAsking(false);
          onConfirm();
        }}
      >
        Yes, delete
      </button>
      <button className="btn btn-ghost btn-sm" onClick={() => setAsking(false)}>
        Cancel
      </button>
    </span>
  );
}
