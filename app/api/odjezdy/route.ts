import { NextResponse } from "next/server";
import * as cheerio from "cheerio";

type TransportType = "vse" | "bus" | "vlak" | "metro" | "tramvaj";
type ResolvedTransportKind = Exclude<TransportType, "vse">;

type IdosRecord = {
  sOwner?: string;
  sNum1?: string | number;
  sNum2?: string | number;
  sDestination?: string;
  dtDateTime?: string;
  sStand?: string;
  iDelay?: number;
  sDelay?: string;
  sType?: string;
  oInfo?: {
    sNum1?: string | number;
    sNum2?: string | number;
    sType?: string;
    sTypeName?: string | null;
  };
};

function inferTransportKind(rec: IdosRecord): ResolvedTransportKind | null {
  const rawTypes = [rec.sType, rec.oInfo?.sType]
    .filter(Boolean)
    .map((value) => value!.trim().toLowerCase());

  const rawTypeName = (rec.oInfo?.sTypeName || "").trim().toLowerCase();

  if (rawTypes.includes("metro") || /metro/.test(rawTypeName)) {
    return "metro";
  }

  if (rawTypes.includes("tram") || /tramvaj/.test(rawTypeName)) {
    return "tramvaj";
  }

  if (
    rawTypes.includes("bus") ||
    /autobus/.test(rawTypeName)
  ) {
    return "bus";
  }

  if (
    rawTypes.some((value) => /^(r|rx|sp|os|ex|ec|ic|sc|rj|le|en|nj|rex|s)$/.test(value)) ||
    /(vlak|rychlík|spěšný|osobní|expres|eurocity|intercity|supercity|railjet|nightjet)/.test(
      rawTypeName
    )
  ) {
    return "vlak";
  }

  return null;
}

function isTransportType(value: string | null): value is TransportType {
  return (
    value === "vse" ||
    value === "bus" ||
    value === "vlak" ||
    value === "metro" ||
    value === "tramvaj"
  );
}

function getFallbackStationName(
  station: string,
  typ: TransportType
): string | null {
  if (typ !== "metro" && typ !== "tramvaj") {
    return null;
  }

  const normalized = station
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();

  if (
    normalized === "praha hl.n." ||
    normalized === "praha hl n" ||
    normalized === "praha, hl.n." ||
    normalized === "praha, hl n" ||
    normalized === "praha hlavni nadrazi" ||
    normalized === "praha, hlavni nadrazi"
  ) {
    return "Hlavní nádraží";
  }

  return null;
}

function getIdosBaseUrl(typ: TransportType) {
  switch (typ) {
    case "bus":
      return "https://idos.cz/autobusy/odjezdy/vysledky/";
    case "vlak":
      return "https://idos.cz/vlaky/odjezdy/vysledky/";
    case "metro":
    case "tramvaj":
    default:
      return "https://idos.cz/vlakyautobusymhdvse/odjezdy/vysledky/";
  }
}

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

      for (const rec of records as IdosRecord[]) {
        const carrier = rec.sOwner || "";
        const dopravniTyp = inferTransportKind(rec) ?? undefined;

        if (
          (/Dopravní\s+podnik\s+města/i.test(carrier) || /měst/i.test(carrier)) &&
          dopravniTyp !== "metro" &&
          dopravniTyp !== "tramvaj"
        ) {
          continue;
        }

        let linka = "";

        if (rec.sNum1) linka = rec.sNum1.toString();
        else if (rec.oInfo && rec.oInfo.sNum1)
          linka = rec.oInfo.sNum1.toString();

        if (rec.sNum2) linka += `/${rec.sNum2}`;
        else if (rec.oInfo && rec.oInfo.sNum2)
          linka += `/${rec.oInfo.sNum2}`;

        linka = linka.trim();

        const kam = rec.sDestination || "";

        const cas = rec.dtDateTime
          ? rec.dtDateTime.split("T")[1].substr(0, 5)
          : "";

        const nastupiste = rec.sStand || "-";

        const rawDelay =
          typeof rec.iDelay === "number"
            ? rec.iDelay
            : Number.parseInt(rec.sDelay || "0", 10);

        const zpozdeni =
          Number.isFinite(rawDelay) && rawDelay > 0 ? rawDelay : 0;

        const date = rec.dtDateTime ? new Date(rec.dtDateTime) : null;

        if (cas && kam && date) {
          results.push({
            linka,
            kam,
            cas,
            nastupiste,
            zpozdeni,
            carrier,
            dopravniTyp,
            date,
          });
        }
      }
    } catch {}

    break;
  }

  return results;
}

async function fetchPage(
  baseUrl: string,
  stanice: string,
  fc?: string,
  time?: string
) {
  let url = `${baseUrl}?f=${encodeURIComponent(stanice)}`;

  if (fc) url += `&fc=${encodeURIComponent(fc)}`;
  if (time) url += `&Time=${encodeURIComponent(time)}`;

  const response = await fetch(url, {
    headers: { "User-Agent": "Mozilla/5.0" },
    cache: "no-store",
  });

  return await response.text();
}

async function fetchDeparturesForStation(
  baseUrl: string,
  stanice: string,
  fc?: string
) {
  const now = new Date();
  const allCandidates: any[] = [];

  let html = await fetchPage(baseUrl, stanice, fc || undefined);
  allCandidates.push(...(await parseIntercityFromHtml(html)));

  for (let h = 1; h <= 24; h++) {
    try {
      const candidate = new Date(now.getTime() + h * 3600000);

      const hh =
        String(candidate.getHours()).padStart(2, "0") +
        ":" +
        String(candidate.getMinutes()).padStart(2, "0");

      html = await fetchPage(baseUrl, stanice, fc || undefined, hh);

      const list = await parseIntercityFromHtml(html);

      if (list.length > 0) {
        allCandidates.push(...list);
      }
    } catch (e) {
      console.error("sampling error", e);
    }
  }

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

  return filtered;
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);

    const stanice = searchParams.get("stanice");
    const fc = searchParams.get("fc");
    const requestedType = searchParams.get("typ");
    const typ: TransportType = isTransportType(requestedType)
      ? requestedType
      : "vse";

    if (!stanice) {
      return NextResponse.json(
        { error: "Chyba: chybí parametr 'stanice'" },
        { status: 400 }
      );
    }

    const baseUrl = getIdosBaseUrl(typ);

    let odjezdy: any[] = await fetchDeparturesForStation(
      baseUrl,
      stanice,
      fc || undefined
    );

    if (typ !== "vse") {
      odjezdy = odjezdy.filter((item) => item.dopravniTyp === typ);
    }

    if (odjezdy.length === 0) {
      const fallbackStation = getFallbackStationName(stanice, typ);

      if (fallbackStation) {
        odjezdy = await fetchDeparturesForStation(baseUrl, fallbackStation);

        if (typ !== "vse") {
          odjezdy = odjezdy.filter((item) => item.dopravniTyp === typ);
        }
      }
    }

    odjezdy = odjezdy.sort((a, b) => a.date - b.date);

    odjezdy.sort((a, b) => a.cas.localeCompare(b.cas));

    return NextResponse.json({
      query: { stanice, typ, ...(fc ? { fc } : {}) },
      stanice,
      typ,
      aktualizovano: new Date().toISOString(),
      pocet_spoju: odjezdy.length,
      data: odjezdy,
    });
  } catch (err) {
    console.error("route error", err);

    return NextResponse.json(
      { error: "Chyba při parsování dat" },
      { status: 500 }
    );
  }
}