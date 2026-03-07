"use client";

import { useRouter } from "next/navigation";

type SampleType = "bus" | "vlak" | "metro" | "tramvaj";

type SampleOption = {
  type: SampleType;
  station: string;
  label: string;
  fc?: string;
};

type CitySample = {
  city: string;
  regionNote?: string;
  options: SampleOption[];
};

const CITY_SAMPLES: CitySample[] = [
  {
    city: "Praha",
    regionNote: "Praha + sídlo Středočeského kraje",
    options: [
      { type: "bus", label: "BUS", station: "Praha, Florenc" },
      { type: "vlak", label: "VLAK", station: "Praha hl.n." },
      { type: "metro", label: "METRO", station: "Hlavní nádraží" },
      { type: "tramvaj", label: "TRAMVAJ", station: "Hlavní nádraží" },
    ],
  },
  {
    city: "Brno",
    options: [
      { type: "bus", label: "BUS", station: "Brno, ÚAN Zvonařka" },
      { type: "vlak", label: "VLAK", station: "Brno hl.n." },
      { type: "tramvaj", label: "TRAMVAJ", station: "Brno, ÚAN Zvonařka" },
    ],
  },
  {
    city: "Ostrava",
    options: [
      { type: "bus", label: "BUS", station: "Ostrava, ÚAN" },
      { type: "vlak", label: "VLAK", station: "Ostrava hl.n." },
      { type: "tramvaj", label: "TRAMVAJ", station: "Ostrava, Karolina" },
    ],
  },
  {
    city: "Plzeň",
    options: [
      { type: "bus", label: "BUS", station: "Plzeň,,CAN" },
      { type: "vlak", label: "VLAK", station: "Plzeň hl.n." },
      {
        type: "tramvaj",
        label: "TRAMVAJ",
        station: "Plzeň, Sady Pětatřicátníků",
      },
    ],
  },
  {
    city: "Liberec",
    options: [
      { type: "bus", label: "BUS", station: "Liberec, aut.nádr." },
      { type: "vlak", label: "VLAK", station: "Liberec" },
      { type: "tramvaj", label: "TRAMVAJ", station: "Liberec, Fügnerova" },
    ],
  },
  {
    city: "Hradec Králové",
    options: [
      { type: "bus", label: "BUS", station: "Hradec Králové, Terminál HD" },
      { type: "vlak", label: "VLAK", station: "Hradec Králové hl.n." },
    ],
  },
  {
    city: "Pardubice",
    options: [
      { type: "bus", label: "BUS", station: "Pardubice,,Masarykovo nám." },
      { type: "vlak", label: "VLAK", station: "Pardubice hl.n." },
    ],
  },
  {
    city: "Jihlava",
    options: [
      { type: "bus", label: "BUS", station: "Jihlava, aut.nádr." },
      { type: "vlak", label: "VLAK", station: "Jihlava" },
    ],
  },
  {
    city: "Karlovy Vary",
    options: [
      { type: "bus", label: "BUS", station: "Karlovy Vary, terminál" },
      { type: "vlak", label: "VLAK", station: "Karlovy Vary" },
    ],
  },
  {
    city: "Ústí nad Labem",
    options: [
      { type: "bus", label: "BUS", station: "Ústí nad Labem,,Mírové náměstí" },
      { type: "vlak", label: "VLAK", station: "Ústí nad Labem hl.n." },
    ],
  },
  {
    city: "České Budějovice",
    options: [
      { type: "bus", label: "BUS", station: "České Budějovice, aut.nádr." },
      { type: "vlak", label: "VLAK", station: "České Budějovice" },
    ],
  },
  {
    city: "Olomouc",
    options: [
      { type: "bus", label: "BUS", station: "Olomouc,,aut.nádr." },
      { type: "vlak", label: "VLAK", station: "Olomouc hl.n." },
      { type: "tramvaj", label: "TRAMVAJ", station: "Olomouc, Náměstí Hrdinů" },
    ],
  },
  {
    city: "Zlín",
    options: [
      { type: "bus", label: "BUS", station: "Zlín, autobusové nádraží" },
      { type: "vlak", label: "VLAK", station: "Zlín střed" },
    ],
  },
];

export default function HomePage() {
  const router = useRouter();
  const currentYear = new Date().getFullYear();

  const navigateToStop = (option: SampleOption) => {
    const targetStop = option.station.trim();

    if (!targetStop) return;

    const params = new URLSearchParams({
      stanice: targetStop,
      typ: option.type,
    });

    if (option.fc) {
      params.set("fc", option.fc);
    }

    router.push(`/info?${params.toString()}`);
  };

  return (
    <main className="landing-page">
      <div className="landing-shell">
        <section className="landing-card">
          <p className="landing-kicker">Odjezdová tabule</p>
          <h1>Vyberte krajské město</h1>
          <p className="landing-description">
            Připravené ukázky pokrývají všech 14 krajů. U každého krajského
            města jsou k dispozici jen typy dopravy, které tam dávají smysl.
          </p>

          <div className="quick-stops city-samples">
            <p className="quick-stops-title">Ukázkové výběry</p>

            <div className="city-samples-grid">
              {CITY_SAMPLES.map((sample) => (
                <section key={sample.city} className="city-sample-card">
                  <div className="city-sample-header">
                    <h2>{sample.city}</h2>
                    {sample.regionNote ? (
                      <p className="city-sample-note">{sample.regionNote}</p>
                    ) : null}
                  </div>

                  <div className="city-sample-buttons">
                    {sample.options.map((option) => (
                      <button
                        key={`${sample.city}-${option.type}`}
                        type="button"
                        className="quick-stop-button transport-button"
                        onClick={() => navigateToStop(option)}
                      >
                        <span className="transport-button-type">{option.label}</span>
                        <span className="transport-button-station">{option.station}</span>
                      </button>
                    ))}
                  </div>
                </section>
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
