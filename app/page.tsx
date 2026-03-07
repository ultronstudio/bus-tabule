"use client";

import { useRouter } from "next/navigation";

const PRESET_STOPS = [
  "Hradec Králové, Terminál HD",
  "Nový Bydžov, Terminál HD",
  "Chlumec nad Cidlinou, nám.",
  "Jičín, aut.st.",
  "Praha, Florenc",
];

export default function HomePage() {
  const router = useRouter();
  const currentYear = new Date().getFullYear();

  const navigateToStop = (stop: string) => {
    const targetStop = stop.trim();

    if (!targetStop) return;

    router.push(`/info?stanice=${encodeURIComponent(targetStop)}`);
  };

  return (
    <main className="landing-page">
      <div className="landing-shell">
        <section className="landing-card">
          <p className="landing-kicker">Odjezdová tabule</p>
          <h1>Vyberte zastávku</h1>
          <p className="landing-description">
            Vyberte jednu z připravených zastávek a pokračujte na informační
            tabuli.
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

        <footer className="landing-footer">
          <p>
            © Web v roce <span suppressHydrationWarning>{currentYear}</span>{" "}
            vytvořil{" "}
            <a
              href="https://petrvurm.cz/?utm_source=bus-tabule&utm_medium=website&utm_campaign=footer_credit"
              target="_blank"
              rel="noreferrer"
            >
              Petr Vurm
            </a>
          </p>
        </footer>
      </div>
    </main>
  );
}
