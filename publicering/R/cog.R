# Cellstorlek i markmeter; den grövsta axeln gäller. Grader räknas om geodetiskt vid rastrets
# mittlatitud. Web Mercator-meter är förstorade med 1/cos(latitud), så de räknas om vid mittlatituden.
.upplosning_meter <- function(r, epsg) {
  upp <- terra::res(r)
  if (epsg == 3857L) {
    e <- terra::ext(r)
    lat <- 2 * atan(exp((e$ymin + e$ymax) / 2 / 6378137)) - pi / 2
    return(round(max(upp) * cos(unname(lat)), 1))
  }
  if (epsg != 4326L) return(max(upp))
  e <- terra::ext(r)
  lat <- (e$ymin + e$ymax) / 2
  lon <- (e$xmin + e$xmax) / 2
  fran <- matrix(c(lon, lat), ncol = 2)
  x <- terra::distance(fran, matrix(c(lon + upp[1], lat), ncol = 2), lonlat = TRUE)
  y <- terra::distance(fran, matrix(c(lon, lat + upp[2]), ncol = 2), lonlat = TRUE)
  round(max(x, y), 1)
}

#' Skriver en källfil som Cloud-Optimized GeoTIFF enligt portalens format.
#' Klassad: uint8, nodata 255. Kontinuerlig: uint16 med värde × 1000, nodata 65535.
#' Klassade filer får MAX-översikter (se .skriv_klassad_cog). Filen skrivs först till en tillfällig
#' fil i samma mapp och byter namn sist, så ett avbrott lämnar aldrig en halvskriven fil.
skriv_cog <- function(kalla, mal, roll = c("klassad", "kontinuerlig"), skala_kalla = NA_integer_,
                      klasser = NULL) {
  roll <- match.arg(roll)
  kontroll <- .kontrollera_raster(kalla, roll, klasser, skala_kalla)
  if (length(kontroll$fel)) stop(paste(kontroll$fel, collapse = "\n"), call. = FALSE)

  r <- normalisera_crs(terra::rast(kalla))
  epsg <- epsg_kod(r)
  skala <- NA_integer_
  if (roll == "kontinuerlig") {
    # Ett enda varv genom rastret: klampa 0–1-värden till högst 1, skala och avrunda.
    if (kalla_skala(kontroll$min, kontroll$max, skala_kalla) == 1L) {
      r <- terra::app(r, function(v) round(pmin(v, 1) * 1000))
    } else {
      r <- round(r)
    }
    skala <- 1000L
  }
  .skriv_portal_cog(r, mal, roll)

  list(
    epsg = epsg,
    upplosning = .upplosning_meter(r, epsg),
    skala = skala,
    bytes = file.size(mal),
    sha256 = digest::digest(file = mal, algo = "sha256"),
    kallaSha256 = digest::digest(file = kalla, algo = "sha256")
  )
}

#' Legendstatistik från en skriven COG. Klassad: förekommande klassvärden.
#' Kontinuerlig: min, max, p2 och p98 på skalan 0–1, från terra::freq() (högst 1001 olika värden).
statistik <- function(cog, roll = c("klassad", "kontinuerlig")) {
  roll <- match.arg(roll)
  f <- terra::freq(terra::rast(cog))
  f <- f[order(f$value), , drop = FALSE]
  if (roll == "klassad") return(list(varden = as.integer(f$value)))
  andel <- cumsum(f$count) / sum(f$count)
  percentil <- function(k) f$value[which(andel >= k / 100 - 1e-12)[1]] / 1000
  list(
    min = round(min(f$value) / 1000, 3),
    max = round(max(f$value) / 1000, 3),
    p2 = round(percentil(2), 3),
    p98 = round(percentil(98), 3)
  )
}

#' Visningskopia i SWEREF 99 TM av en publicerad COG i ett annat koordinatsystem. Närmaste granne
#' vid källans cellstorlek i markmeter. Rastret är redan på portalens skala och skrivs med samma
#' regler (.skriv_portal_cog), aldrig genom skriv_cog():s skalning.
.skriv_vy3006 <- function(cog, mal, roll = c("klassad", "kontinuerlig"), upplosning) {
  roll <- match.arg(roll)
  # gdalwarp läser och skriver i block. terra::project lägger hela källan i minnet, och en
  # 25 m-karta över kusten (1,9 miljarder celler) ryms inte där.
  tmp <- tempfile("vy3006", fileext = ".tif")
  on.exit(unlink(tmp), add = TRUE)
  klassad <- roll == "klassad"
  ok <- sf::gdal_utils("warp", cog, tmp, options = c(
    "-t_srs", "EPSG:3006", "-tr", upplosning, upplosning, "-tap", "-r", "near",
    "-ot", if (klassad) "Byte" else "UInt16", "-dstnodata", if (klassad) "255" else "65535",
    "-wm", "512", as.vector(rbind("-co", c(.ARBETSFIL, "BIGTIFF=IF_SAFER")))))
  if (!isTRUE(ok) || !file.exists(tmp)) stop(sprintf("GDAL kunde inte projicera %s", cog), call. = FALSE)
  .skriv_portal_cog(terra::rast(tmp), mal, roll)
  list(sha256 = digest::digest(file = mal, algo = "sha256"), bytes = file.size(mal))
}
