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
  const [queryStation, setQueryStation] = useState<string>("");
  const [queryFc, setQueryFc] = useState<string>("");

  const fetchDepartures = async () => {
    setLoading(true);
    try {
      // build query string for the backend
      let url = "/api/odjezdy";
      const params = new URLSearchParams();
      if (queryStation) params.set("stanice", queryStation);
      if (queryFc) params.set("fc", queryFc);
      if ([...params].length) url += "?" + params.toString();

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

        .sort((a: any, b: any) => a.timeObj - b.timeObj)
        .slice(0, 5);

      setDepartures(parsed);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // initialise search parameters from URL if provided
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const s = params.get("stanice") || "";
      const f = params.get("fc") || "";
      setQueryStation(s);
      setQueryFc(f);
    }

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

  const handleSearch = () => {
    // update query string in URL without reloading
    if (typeof window !== "undefined") {
      const params = new URLSearchParams();
      if (queryStation) params.set("stanice", queryStation);
      if (queryFc) params.set("fc", queryFc);
      const newUrl = `${window.location.pathname}?${params.toString()}`;
      window.history.replaceState(null, "", newUrl);
    }
    fetchDepartures();
  };

  const [qrUrl, setQrUrl] = useState<string>("/api/qr");

  useEffect(() => {
    if (typeof window !== "undefined") {
      setQrUrl("/api/qr" + window.location.search);
    }
  }, [queryStation, queryFc]);

  return (
    <main className="board">
      <header className="header">
        <h1>{station || "Odjezdy"}</h1>
        <div className="search-bar">
          <input
            type="text"
            placeholder="stanice (město, zastávka)"
            value={queryStation}
            onChange={(e) => setQueryStation(e.target.value)}
          />
          <input
            type="text"
            placeholder="fc kód (volitelné)"
            value={queryFc}
            onChange={(e) => setQueryFc(e.target.value)}
            style={{ width: "6rem" }}
          />
          <button onClick={handleSearch}>Aktualizovat</button>
        </div>

        <div className="clock-wrapper">
          {loading && <div className="spinner small"></div>}
          <div className="clock">{time}</div>
        </div>
      </header>

      {loading && departures.length === 0 ? (
        <div className="initial-loading">
          Načítám data…
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
