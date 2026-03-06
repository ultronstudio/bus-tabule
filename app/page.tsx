"use client";

import { useEffect, useState } from "react";

type Departure = {
  linka: string;
  kam: string;
  cas: string;
  nastupiste: string;
  zpozdeni: number;
};

export default function BoardPage() {
  const [departures, setDepartures] = useState<Departure[]>([]);
  const [time, setTime] = useState("");
  const [loading, setLoading] = useState(true);
  const [station, setStation] = useState<string>("");

  const fetchDepartures = async () => {
    setLoading(true);
    try {
      // when the board is embedded on a terminal, the query params come from
      // the URL (no user input allowed). we re-read them each fetch in case the
      // host updates the iframe src dynamically.
      let url = "/api/odjezdy";
      if (typeof window !== "undefined") {
        const params = new URLSearchParams(window.location.search);
        const s = params.get("stanice");
        const f = params.get("fc");
        const out = new URLSearchParams();
        if (s) out.set("stanice", s);
        if (f) out.set("fc", f);
        if ([...out].length) url += "?" + out.toString();
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

          const [h, m] = cas.split(":").map(Number);

          const depTime = new Date();
          depTime.setHours(h, m, 0, 0);

          // přechod dne
          if (depTime < now) {
            depTime.setDate(depTime.getDate() + 1);
          }

          return {
            linka: d.linka,
            kam: d.kam.replace(/,,/g, " "),
            cas,
            timeObj: depTime,
            nastupiste: d.nastupiste,
            zpozdeni: parseInt(d.zpozdeni) || 0,
          };
        })

        .sort((a: any, b: any) => a.timeObj - b.timeObj);

      setDepartures(parsed);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDepartures();

    const interval = setInterval(fetchDepartures, 15000);

    // initialize clock immediately instead of waiting one second
    setTime(new Date().toLocaleTimeString("cs-CZ"));
    const clock = setInterval(() => {
      setTime(new Date().toLocaleTimeString("cs-CZ"));
    }, 1000);

    return () => {
      clearInterval(interval);
      clearInterval(clock);
    };
  }, []);

  // don't hide the whole page on load – just show a spinner near the clock
  // (we leave the state logic in place because fetchDepartures sets loading)


  const [qrUrl, setQrUrl] = useState<string>("/api/qr");

  useEffect(() => {
    if (typeof window !== "undefined") {
      setQrUrl("/api/qr" + window.location.search);
    }
  }, []);

  const subtitle = "pouze meziměstské";

  return (
    <main className="board">
      <header className="header">
        <div>
          <h1>{station || "Odjezdy"}</h1>
          <div className="subtitle">{subtitle}</div>
        </div>
        {departures.length > 0 && (
          <div className="count">{departures.length} spojů</div>
        )}

        <div className="clock-wrapper">
          {loading && <div className="spinner small"></div>}
          <div className="clock">{time}</div>
        </div>
      </header>

      {loading && departures.length === 0 ? (
        <div className="initial-loading">
          Načítám data…
        </div>
      ) : departures.length === 0 ? (
        <div className="initial-loading">
          Žádné meziměstské spoje k dispozici
        </div>
      ) : (
        <div className="table">
          <div className="row head">
            <div>LINKA</div>
            <div>SMĚR</div>
            <div>NÁST.</div>
            <div>ODJEZD</div>
          </div>

          {departures.map((d, i) => (
            <div key={i} className="row">
              <div className="line">{d.linka}</div>

              <div className="dir">{d.kam}</div>

              <div className="plat">{d.nastupiste}</div>

              <div className="time">{d.cas}</div>
            </div>
          ))}
        </div>
      )}

      <img className="qr" src={qrUrl} alt="QR kód pro mobilní verzi" />
    </main>
  );
}
