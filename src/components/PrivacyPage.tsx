"use client";

import { useState } from "react";
import { Nav } from "./Nav";
import { deleteSaved } from "@/lib/storage";
import { T } from "@/lib/i18n";

export function PrivacyPage() {
  const [deleted, setDeleted] = useState(false);
  return (
    <div className="page">
      <div className="wrap">
        <Nav />
        <section className="tile prose">
          <h1><T>Privacy, in plain English</T></h1>
          <ul>
            <li><T>Your tax answers are saved only in this browser, on this device.</T></li>
            <li><T>We don't send your tax answers to any server.</T></li>
            <li><T>If you send feedback or ask for a deadline reminder, we store that message or your email address in a database in the EU. We use it only for that purpose, and you can ask us to delete it.</T></li>
            <li><T>We count visits with Cloudflare Web Analytics. It uses no cookies and doesn't track you across sites.</T></li>
            <li><T>We never ask for your DigiD, password or BSN.</T></li>
            <li><T>You file your return yourself, on Mijn Belastingdienst.</T></li>
            <li><T>You can delete your answers at any time with the button below.</T></li>
          </ul>
          <button
            className="btn btn-dark"
            onClick={() => {
              deleteSaved();
              setDeleted(true);
            }}
          >
            <T>Delete my answers</T>
          </button>
          {deleted && (
            <p role="status" className="muted">
              <T>Done. Your answers are deleted from this browser.</T>
            </p>
          )}
        </section>
      </div>
    </div>
  );
}
