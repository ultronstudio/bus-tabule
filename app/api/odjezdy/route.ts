import { NextResponse } from "next/server";
import * as cheerio from "cheerio";

// helper: parse HTML returned by idos page and extract intercity records
async function parseIntercityFromHtml(html: string) {
  const $ = cheerio.load(html);
  const results: any[] = [];
  const scripts = $("script")
    .map((i, el) => $(el).html())
    .get();
  for (const text of scripts) {
    if (!text || !text.includes("Dep.DepResult")) continue;
    const idx = text.indexOf("depResult");
    const braceStart = text.indexOf("{", idx);
    if (braceStart === -1) continue;
    let depth = 0;
    let end = -1;
    for (let i = braceStart; i < text.length; i++) {
      if (text[i] === "{") depth++;
      else if (text[i] === "}") depth--;
      if (depth === 0) {
        end = i + 1;
        break;
      }
    }
    if (end === -1) continue;
    try {
      const data = JSON.parse(text.slice(braceStart, end));
      const records = data.departureTableInfo?.aoRecords || [];
      for (const rec of records) {
        const carrier = rec.sOwner || "";
        if (
          /Dopravní\s+podnik\s+města/i.test(carrier) ||
          /měst/i.test(carrier)
        ) {
          continue;
        }
        // some records put the line number inside oInfo rather than top level
        let linka = "";
        if (rec.sNum1) linka = rec.sNum1.toString();
        else if (rec.oInfo && rec.oInfo.sNum1)
          linka = rec.oInfo.sNum1.toString();
        if (rec.sNum2) linka += `/${rec.sNum2}`;
        else if (rec.oInfo && rec.oInfo.sNum2) linka += `/${rec.oInfo.sNum2}`;
        linka = linka.trim();
        const kam = rec.sDestination || "";
        const cas = rec.dtDateTime
          ? rec.dtDateTime.split("T")[1].substr(0, 5)
          : "";
        const nastupiste = rec.sStand || "-";
        const zpozdeni = parseInt(rec.sDelay || "0");
        const date = rec.dtDateTime ? new Date(rec.dtDateTime) : null;
        if (cas && kam && date) {
          results.push({
            linka,
            kam,
            cas,
            nastupiste,
            zpozdeni,
            carrier,
            date,
          });
        }
      }
    } catch (e) {
      // ignore parse error and try next script
    }
    break;
  }
  return results;
}

// helper: perform HTTP GET to idos with optional time parameter (HH:mm string)
async function fetchPage(stanice: string, fc: string | null, time?: string) {
  let url = `https://idos.cz/vlakyautobusymhdvse/odjezdy/vysledky/?f=${encodeURIComponent(stanice)}`;
  if (fc) url += `&fc=${encodeURIComponent(fc)}`;
  if (time) url += `&Time=${encodeURIComponent(time)}`;
  const response = await fetch(url, {
    headers: { "User-Agent": "Mozilla/5.0" },
    cache: "no-store",
  });
  const html = await response.text();
  return html;
}

export async function GET(request: Request) {
  try {
    // allow callers to override the search station (city + stop) and optional
    // region code (fc) via query string, e.g.
    //   /api/odjezdy?stanice=Praha+hl.n&fc=100000
    // If nothing is provided we fall back to a known default so that the
    // endpoint continues to return results for development.
    const { searchParams } = new URL(request.url);
    const stanice = searchParams.get("stanice"); // can't be null due to default below
    const fc = searchParams.get("fc"); // may be null

    if (!stanice) {
      return NextResponse.json(
        { error: "Chyba: chybí parametr 'stanice'" },
        { status: 400 },
      );
    }

    const url = `https://idos.cz/vlakyautobusymhdvse/odjezdy/vysledky/?f=${encodeURIComponent(
      stanice,
    )}${fc ? `&fc=${encodeURIComponent(fc)}` : ""}`;

    const now = new Date();
    // collect candidate intercity records from several hourly samples
    let allCandidates: any[] = [];

    // initial fetch at current time
    let html = await fetchPage(stanice, fc || undefined);
    allCandidates.push(...(await parseIntercityFromHtml(html)));

    // sample each hour for the next 24 hours; window size is roughly 2h so
    // hourly sampling should catch any departure within that window
    for (let h = 1; h <= 24; h++) {
      try {
        const candidate = new Date(now.getTime() + h * 3600000);
        const hh =
          String(candidate.getHours()).padStart(2, "0") +
          ":" +
          String(candidate.getMinutes()).padStart(2, "0");
        html = await fetchPage(stanice, fc || undefined, hh);
        const list = await parseIntercityFromHtml(html);
        if (list.length > 0) {
          allCandidates.push(...list);
        }
      } catch (e) {
        // ignore individual fetch/parse errors and continue with other offsets
        console.error("sampling error", e);
      }
    }

    // keep only departures occurring after now, dedupe by ISO date + line + dest
    const seen = new Set<string>();
    const filtered: any[] = [];
    for (const rec of allCandidates) {
      if (rec.date && rec.date >= now) {
        const key = `${rec.linka}|${rec.cas}|${rec.kam}|${rec.nastupiste}`;
        if (!seen.has(key)) {
          seen.add(key);
          filtered.push(rec);
        }
      }
    }

    let odjezdy: any[] = filtered.sort((a, b) => a.date - b.date);

    // also sort by cas just in case hours matter (dates should already do it)
    odjezdy.sort((a, b) => a.cas.localeCompare(b.cas));

    return NextResponse.json({
      query: { stanice, ...(fc ? { fc } : {}) },
      stanice,
      aktualizovano: new Date().toISOString(),
      pocet_spoju: odjezdy.length,
      data: odjezdy,
    });
  } catch (err) {
    console.error("route error", err);
    return NextResponse.json(
      { error: "Chyba při parsování dat" },
      { status: 500 },
    );
  }
}
