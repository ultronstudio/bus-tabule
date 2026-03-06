import { NextResponse } from 'next/server'
import * as cheerio from 'cheerio'

export async function GET(request: Request) {
  try {
    // allow callers to override the search station (city + stop) and optional
    // region code (fc) via query string, e.g.
    //   /api/odjezdy?stanice=Praha+hl.n&fc=100000
    // If nothing is provided we fall back to a known default so that the
    // endpoint continues to return results for development.
    const { searchParams } = new URL(request.url)
    const stanice =
      searchParams.get("stanice") || "Hradec Králové, Terminál HD"
    const fc = searchParams.get("fc") // may be null

    const url = `https://idos.cz/vlakyautobusymhdvse/odjezdy/vysledky/?f=${encodeURIComponent(
      stanice
    )}${fc ? `&fc=${encodeURIComponent(fc)}` : ""}`

    const response = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0"
      },
      cache: "no-store"
    })

    const html = await response.text()
    const $ = cheerio.load(html)

    const odjezdy: any[] = []

    $(".dep-row-first").each((i, el) => {

      const row = $(el)

      // CÍL
      const kam = row.find("td").eq(0).find("h3").text().trim()

      // LINKA – we only care about buses (not trolleybuses, trams, etc.)
      const linkaRaw = row.find(".code h3").text().trim()
      if (!/bus/i.test(linkaRaw)) {
        // skip anything that isn't explicitly marked as a bus
        return
      }
      const linka = linkaRaw.replace(/Bus/i, "").trim()

      // ČAS
      const cas = row
        .find("td")
        .eq(2)
        .find("h3 span")
        .first()
        .text()
        .trim()

      // NÁSTUPIŠTĚ
      const nastupiste = row
        .find('span[title="nástupiště"]')
        .text()
        .trim() || "-"

      // ZPOŽDĚNÍ
      const delayRow = row.next(".dep-row-second")
      const zpozdeniRaw = delayRow.find(".cell-delay").text().trim()

      const zpozdeni = zpozdeniRaw
        ? zpozdeniRaw.replace(/[^\d]/g, "")
        : "0"

      // carrier info lives in the second cell of the dep-row-second
      const carrier = delayRow
        .find('span[title="dopravce"]')
        .text()
        .trim()

      // skip local city transit providers (MHD) – they usually have names like
      // "Dopravní podnik města …". consider any carrier containing
      // "Dopravní podnik města" or "městský" as local.
      if (/Dopravní\s+podnik\s+města/i.test(carrier) || /měst/i.test(carrier)) {
        return
      }

      if (cas && kam) {
        odjezdy.push({
          linka,
          kam,
          cas,
          nastupiste,
          zpozdeni: `${zpozdeni} min`,
          carrier,
        })
      }

    })

    odjezdy.sort((a, b) => a.cas.localeCompare(b.cas))

    return NextResponse.json({
      query: { stanice, ...(fc ? { fc } : {}) },
      stanice,
      aktualizovano: new Date().toISOString(),
      pocet_spoju: odjezdy.length,
      data: odjezdy
    })

  } catch (err) {
    return NextResponse.json(
      { error: "Chyba při parsování dat" },
      { status: 500 }
    )
  }
}