"use client";

import { useEffect, useState } from "react";

type Language = "cs" | "en";

type Departure = {
  linka: string;
  kam: string;
  cas: string;
  timeObj: Date;
  nastupiste: string;
  zpozdeni: number;
  carrier?: string;
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
      bus: "BUS",
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
      bus: "BUS",
      direction: "DIRECTION",
      platform: "PLATF.",
      departure: "DEPARTURE",
      delay: "DELAY",
    },
  },
};

export default function BoardPage() {
  const [departures, setDepartures] = useState<Departure[]>([]);
  const [now, setNow] = useState(() => new Date());
  const [loading, setLoading] = useState(true);
  const [station, setStation] = useState<string>("");
  const [language, setLanguage] = useState<Language>("cs");

  const activeTranslation = translations[language];

  const formatLineNumber = (line: string) => {
    if (!line) return "–";

    const [prefix] = line.split("/");

    return prefix.slice(-3);
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

        const out = new URLSearchParams();

        if (s) out.set("stanice", s);
        if (f) out.set("fc", f);

        if ([...out].length) {
          url += "?" + out.toString();
        }
      }

      const res = await fetch(url, { cache: "no-store" });
      const json = await res.json();

      if (json.stanice) {
        setStation(json.stanice);
      }

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
          <div className="clock-date">{formatCurrentDate(now)}</div>
          <div className="clock">{formatCurrentTime(now)}</div>
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
                <th>{activeTranslation.labels.bus}</th>
                <th>{activeTranslation.labels.direction}</th>
                <th>{activeTranslation.labels.platform}</th>
                <th>{activeTranslation.labels.departure}</th>
                <th>{activeTranslation.labels.delay}</th>
              </tr>
            </thead>

            <tbody>
              {departures.map((d, i) => (
                <tr key={i}>
                  <td className="line">{formatLineNumber(d.linka || d.carrier || "")}</td>

                  <td className="dir">{d.kam}</td>

                  <td className="plat">{d.nastupiste}</td>

                  <td className="time">{formatDepartureTime(d)}</td>

                  <td className={`delay ${d.zpozdeni > 5 ? "big" : ""}`}>
                    {d.zpozdeni > 0 ? `+${d.zpozdeni}` : ""}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}
