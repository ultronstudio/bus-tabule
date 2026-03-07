"use client";

import { useEffect, useState } from "react";

type Language = "cs" | "en";
type TransportType = "vse" | "bus" | "vlak";
type ResolvedTransportKind = Exclude<TransportType, "vse"> | "metro" | "tramvaj";

type Departure = {
  linka: string;
  kam: string;
  cas: string;
  timeObj: Date;
  nastupiste: string;
  zpozdeni: number;
  carrier?: string;
  dopravniTyp?: ResolvedTransportKind;
};

const LANGUAGE_ROTATION_MS = 15000;

const translations: Record<
  Language,
  {
    locale: string;
    labels: {
      loading: string;
      noDepartures: string;
      bus: string;
      direction: string;
      platform: string;
      departure: string;
      delay: string;
    };
  }
> = {
  cs: {
    locale: "cs-CZ",
    labels: {
      loading: "Načítám data…",
      noDepartures: "Žádné spoje k dispozici",
      bus: "LINKA",
      direction: "SMĚR",
      platform: "NÁST.",
      departure: "ODJEZD",
      delay: "ZPOŽD.",
    },
  },
  en: {
    locale: "en-US",
    labels: {
      loading: "Loading data…",
      noDepartures: "No departures available",
      bus: "LINE NO.",
      direction: "DIRECTION",
      platform: "PLATF.",
      departure: "DEPARTURE",
      delay: "DELAY",
    },
  },
};

export default function BoardPage() {
  const [departures, setDepartures] = useState<Departure[]>([]);
  const [now, setNow] = useState<Date | null>(null);
  const [loading, setLoading] = useState(true);
  const [station, setStation] = useState<string>("");
  const [language, setLanguage] = useState<Language>("cs");
  const [transportType, setTransportType] = useState<TransportType>("vse");
  const [mounted, setMounted] = useState(false);

  const activeTranslation = translations[language];

  const formatLineNumber = (line: string) => {
    if (!line) return "–";

    const [prefix] = line.split("/");

    return prefix.slice(-3);
  };

  const getColumnTitle = () => {
    if (transportType === "vlak") return "VLAK";

    return "BUS";
  };

  const getLineTypeLabel = (departure: Departure) => {
    if (transportType !== "vse") return null;

    if (departure.dopravniTyp === "bus") return "BUS";
    if (departure.dopravniTyp === "vlak") return "VLAK";
    if (departure.dopravniTyp === "metro") return "METRO";
    if (departure.dopravniTyp === "tramvaj") return "TRAMVAJ";

    return null;
  };

  const formatCurrentDate = (date: Date) => {
    return new Intl.DateTimeFormat(activeTranslation.locale, {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    }).format(date);
  };

  const formatCurrentTime = (date: Date) => {
    return new Intl.DateTimeFormat(activeTranslation.locale, {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    }).format(date);
  };

  const formatDepartureTime = (departure: Departure) => {
    if (!(departure.timeObj instanceof Date) || Number.isNaN(departure.timeObj.getTime())) {
      return departure.cas;
    }

    return new Intl.DateTimeFormat(activeTranslation.locale, {
      hour: "2-digit",
      minute: "2-digit",
    }).format(departure.timeObj);
  };

  const fetchDepartures = async () => {
    setLoading(true);

    try {
      let url = "/api/odjezdy";

      if (typeof window !== "undefined") {
        const params = new URLSearchParams(window.location.search);
        const s = params.get("stanice") || "Nový Bydžov, Terminál HD";
        const f = params.get("fc");
        const typ = params.get("typ");

        const out = new URLSearchParams();

        if (s) out.set("stanice", s);
        if (f) out.set("fc", f);
        if (typ === "bus" || typ === "vlak" || typ === "vse") {
          out.set("typ", typ);
        }

        if ([...out].length) {
          url += "?" + out.toString();
        }
      }

      const res = await fetch(url, { cache: "no-store" });
      const json = await res.json();

      if (json.stanice) {
        setStation(json.stanice);
      }

      setTransportType(
        json.typ === "bus" || json.typ === "vlak" || json.typ === "vse"
          ? json.typ
          : "vse"
      );

      const now = new Date();

      const parsed = json.data
        .map((d: any) => {
          const cas = d.cas.split("\n")[0].trim();
          const depTime = d.date ? new Date(d.date) : new Date();

          if (!d.date) {
            const [h, m] = cas.split(":").map(Number);

            depTime.setHours(h, m, 0, 0);

            if (depTime < now) {
              depTime.setDate(depTime.getDate() + 1);
            }
          }

          return {
            linka: d.linka,
            kam: d.kam.replace(/,,/g, " "),
            cas,
            timeObj: depTime,
            nastupiste: d.nastupiste,
            zpozdeni: d.zpozdeni ?? 0,
            dopravniTyp:
              d.dopravniTyp === "bus" ||
              d.dopravniTyp === "vlak" ||
              d.dopravniTyp === "metro" ||
              d.dopravniTyp === "tramvaj"
                ? d.dopravniTyp
                : undefined,
          };
        })
        .sort((a: any, b: any) => a.timeObj - b.timeObj)
        .slice(0, 6);

      setDepartures(parsed);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setMounted(true);
    setNow(new Date());
    fetchDepartures();

    const interval = setInterval(fetchDepartures, 15000);
    const clock = setInterval(() => {
      setNow(new Date());
    }, 1000);
    const languageRotation = setInterval(() => {
      setLanguage((currentLanguage) => (currentLanguage === "cs" ? "en" : "cs"));
    }, LANGUAGE_ROTATION_MS);

    return () => {
      clearInterval(interval);
      clearInterval(clock);
      clearInterval(languageRotation);
    };
  }, []);

  return (
    <main className="board" lang={language === "cs" ? "cs" : "en"}>
      <header className="header">
        <h1>{station || activeTranslation.labels.loading}</h1>

        <div className="clock-wrapper">
          {loading && <div className="spinner small"></div>}
          <div className="clock-date">{mounted && now ? formatCurrentDate(now) : ""}</div>
          <div className="clock">{mounted && now ? formatCurrentTime(now) : ""}</div>
        </div>
      </header>

      {loading && departures.length === 0 ? (
        <div className="initial-loading">{activeTranslation.labels.loading}</div>
      ) : departures.length === 0 ? (
        <div className="initial-loading">{activeTranslation.labels.noDepartures}</div>
      ) : (
        <div className="table-wrapper">
          <table className="board-table">
            <thead>
              <tr>
                <th>{getColumnTitle()}</th>
                <th>{activeTranslation.labels.direction}</th>
                <th>{activeTranslation.labels.platform}</th>
                <th>{activeTranslation.labels.departure}</th>
                <th>{activeTranslation.labels.delay}</th>
              </tr>
            </thead>

            <tbody>
              {departures.map((d, i) => {
                const lineTypeLabel = getLineTypeLabel(d);

                return (
                  <tr key={i}>
                    <td className="line line-cell">
                      <span className="line-value">
                        {formatLineNumber(d.linka || d.carrier || "")}
                      </span>

                      {lineTypeLabel ? (
                        <span className="line-type">{lineTypeLabel}</span>
                      ) : null}
                    </td>

                    <td className="dir">{d.kam}</td>

                    <td className="plat">{d.nastupiste}</td>

                    <td className="time">{formatDepartureTime(d)}</td>

                    <td className={`delay ${d.zpozdeni > 5 ? "big" : ""}`}>
                      {d.zpozdeni > 0 ? `+${d.zpozdeni}` : ""}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}
