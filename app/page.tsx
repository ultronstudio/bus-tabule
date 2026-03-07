"use client";

import { useEffect, useState } from "react";

type Departure = {
  linka: string;
  kam: string;
  cas: string;
  nastupiste: string;
  zpozdeni: number;
  carrier?: string;
};

export default function BoardPage() {
  const [departures, setDepartures] = useState<Departure[]>([]);
  const [time, setTime] = useState("");
  const [currentDate, setCurrentDate] = useState("");
  const [loading, setLoading] = useState(true);
  const [station, setStation] = useState<string>("");

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

    const updateClock = () => {
      const now = new Date();

      setTime(now.toLocaleTimeString("cs-CZ"));
      setCurrentDate(
        now.toLocaleDateString("cs-CZ", {
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
        }),
      );
    };

    updateClock();
    const clock = setInterval(() => {
      updateClock();
    }, 1000);

    return () => {
      clearInterval(interval);
      clearInterval(clock);
    };
  }, []);

  return (
    <main className="board">
      <header className="header">
        <h1>{station || "Načítám data…"}</h1>

        <div className="clock-wrapper">
          {loading && <div className="spinner small"></div>}
          <div className="clock-date">{currentDate}</div>
          <div className="clock">{time}</div>
        </div>
      </header>

      {loading && departures.length === 0 ? (
        <div className="initial-loading">Načítám data…</div>
      ) : departures.length === 0 ? (
        <div className="initial-loading">Žádné spoje k dispozici</div>
      ) : (
        <div className="table-wrapper">
          <table className="board-table">
            <thead>
              <tr>
                <th>LINKA</th>
                <th>SMĚR</th>
                <th>NÁST.</th>
                <th>ODJEZD</th>
                <th>ZPOŽD.</th>
              </tr>
            </thead>

            <tbody>
              {departures.map((d, i) => (
                <tr key={i}>
                  <td className="line">{d.linka || d.carrier || "–"}</td>

                  <td className="dir">{d.kam}</td>

                  <td className="plat">{d.nastupiste}</td>

                  <td className="time">{d.cas}</td>

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
