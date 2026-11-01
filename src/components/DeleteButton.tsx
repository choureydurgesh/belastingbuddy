"use client";

import { useState } from "react";
import { useLang } from "@/lib/i18n";

/** F11: "Delete my answers" with a confirm step built into the page. */
export function DeleteButton({ onConfirm }: { onConfirm: () => void }) {
  const { t } = useLang();
  const [asking, setAsking] = useState(false);
  if (!asking) {
    return (
      <button className="btn-link" onClick={() => setAsking(true)}>
        {t("Delete my answers")}
      </button>
    );
  }
  return (
    <span className="confirm" role="group" aria-label={t("Delete all answers from this browser?")}>
      <span>{t("Delete all answers from this browser?")}</span>
      <button
        className="btn btn-dark btn-sm"
        onClick={() => {
          setAsking(false);
          onConfirm();
        }}
      >
        {t("Yes, delete")}
      </button>
      <button className="btn btn-ghost btn-sm" onClick={() => setAsking(false)}>
        {t("Cancel")}
      </button>
    </span>
  );
}
