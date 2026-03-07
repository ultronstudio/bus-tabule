"use client";

import { useRouter } from "next/navigation";

const PRESET_STOPS = [
  "Nový Bydžov, Terminál HD",
  "Hradec Králové, Terminál HD",
  "Chlumec n.C., aut.st.",
  "Jičín, aut.nádr.",
  "Praha, Florenc, aut.nádr.",
];

export default function HomePage() {
  const router = useRouter();

  const navigateToStop = (stop: string) => {
    const targetStop = stop.trim();

    if (!targetStop) return;

    router.push(`/info?stanice=${encodeURIComponent(targetStop)}`);
  };

  return (
    <main className="landing-page">
      <section className="landing-card">
        <p className="landing-kicker">Odjezdová tabule</p>
        <h1>Vyberte zastávku</h1>
        <p className="landing-description">
          Vyberte jednu z připravených zastávek a pokračujte na informační tabuli.
        </p>

        <div className="quick-stops">
          <p className="quick-stops-title">Rychlý výběr</p>

          <div className="quick-stops-grid">
            {PRESET_STOPS.map((stop) => (
              <button
                key={stop}
                type="button"
                className="quick-stop-button"
                onClick={() => navigateToStop(stop)}
              >
                {stop}
              </button>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}