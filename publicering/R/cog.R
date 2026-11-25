.COG_KLASSAD <- c("COMPRESS=DEFLATE", "BLOCKSIZE=512", "OVERVIEW_RESAMPLING=MODE", "BIGTIFF=IF_SAFER")
# PREDICTOR=2 är samma som STANDARD (horisontell differens). terra skickar flaggorna även till en
# mellanfil i GTiff när rastret är stort, och GTiff-drivrutinen tar bara emot siffran.
.COG_KONTINUERLIG <- c("COMPRESS=DEFLATE", "PREDICTOR=2", "BLOCKSIZE=512",
                       "OVERVIEW_RESAMPLING=AVERAGE", "BIGTIFF=IF_SAFER")

# Cellstorlek i meter. Grader räknas om geodetiskt vid rastrets mittlatitud; den grövsta axeln gäller.
.upplosning_meter <- function(r, epsg) {
  upp <- terra::res(r)
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
#' Filen skrivs först till en tillfällig fil i samma mapp och byter namn sist,
#' så ett avbrott lämnar aldrig en halvskriven fil.
skriv_cog <- function(kalla, mal, roll = c("klassad", "kontinuerlig"), skala_kalla = NA_integer_,
                      klasser = NULL) {
  roll <- match.arg(roll)
  kontroll <- .kontrollera_raster(kalla, roll, klasser, skala_kalla)
  if (length(kontroll$fel)) stop(paste(kontroll$fel, collapse = "\n"), call. = FALSE)

  r <- normalisera_crs(terra::rast(kalla))
  epsg <- epsg_kod(r)
  skala <- NA_integer_
  if (roll == "klassad") {
    datatyp <- "INT1U"
    nodata <- 255
    gdal <- .COG_KLASSAD
  } else {
    # Ett enda varv genom rastret: klampa 0–1-värden till högst 1, skala och avrunda.
    if (kalla_skala(kontroll$min, kontroll$max, skala_kalla) == 1L) {
      r <- terra::app(r, function(v) round(pmin(v, 1) * 1000))
    } else {
      r <- round(r)
    }
    skala <- 1000L
    datatyp <- "INT2U"
    nodata <- 65535
    gdal <- .COG_KONTINUERLIG
  }

  dir.create(dirname(mal), recursive = TRUE, showWarnings = FALSE)
  tmp <- file.path(dirname(mal), paste0(".", basename(mal), ".", Sys.getpid(), ".tmp.tif"))
  on.exit(unlink(c(tmp, paste0(tmp, ".aux.xml"))), add = TRUE)
  terra::writeRaster(r, tmp, filetype = "COG", datatype = datatyp, NAflag = nodata, gdal = gdal,
                     overwrite = TRUE)
  if (!file.rename(tmp, mal)) stop(sprintf("Kunde inte flytta den skrivna filen till %s", mal), call. = FALSE)

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
