"use client";

import { useState } from "react";
import { Nav } from "./Nav";
import { deleteSaved } from "@/lib/storage";

export function PrivacyPage() {
  const [deleted, setDeleted] = useState(false);
  return (
    <div className="page">
      <div className="wrap">
        <Nav />
        <section className="tile prose">
          <h1>Privacy, in plain English</h1>
          <ul>
            <li>Your tax answers are saved only in this browser, on this device.</li>
            <li>We don't send your tax answers to any server.</li>
            <li>If you send feedback or ask for a deadline reminder, we store that message or your email address in a database in the EU. We use it only for that purpose, and you can ask us to delete it.</li>
            <li>We count visits with Cloudflare Web Analytics. It uses no cookies and doesn't track you across sites.</li>
            <li>We never ask for your DigiD, password or BSN.</li>
            <li>You file your return yourself, on Mijn Belastingdienst.</li>
            <li>You can delete your answers at any time with the button below.</li>
          </ul>
          <button
            className="btn btn-dark"
            onClick={() => {
              deleteSaved();
              setDeleted(true);
            }}
          >
            Delete my answers
          </button>
          {deleted && (
            <p role="status" className="muted">
              Done. Your answers are deleted from this browser.
            </p>
          )}
        </section>
      </div>
    </div>
  );
}
