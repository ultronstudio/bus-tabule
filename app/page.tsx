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

  const fetchDepartures = async () => {
    const res = await fetch("/api/odjezdy", { cache: "no-store" });
    const json = await res.json();

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

  return (
    <main className="board">
      <header className="header">
        <h1>NOVÝ BYDŽOV</h1>

        <div className="clock">{time}</div>
      </header>

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

      <img className="qr" src="/qr.png" alt="QR kód pro mobilní verzi" />
    </main>
  );
}
