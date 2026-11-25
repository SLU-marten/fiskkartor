#' Filformatets version. En publicerad version med lägre format (saknas = 1) får en ny version
#' vid nästa publicering, även om källfilen är oförändrad. 2: MAX-översikter för klassade kartor.
COG_FORMAT <- 2L

.cog_format <- function() as.integer(getOption("fiskkartor.cog_format", COG_FORMAT))

.version_format <- function(v) if (is.null(v$format)) 1L else as.integer(v$format)

# Översikter byggs tills den största sidan är högst så här många celler, samma regel som
# GDAL:s egen COG-drivrutin. Ett smalt kustraster får alltså översikter längs sin långa sida.
.OVERSIKT_GRANS <- 512L

.ARBETSFIL <- c("COMPRESS=DEFLATE", "TILED=YES")

.COG_ALTERNATIV <- list(
  klassad = c("COMPRESS=DEFLATE", "BLOCKSIZE=512", "BIGTIFF=IF_SAFER", "OVERVIEWS=FORCE_USE_EXISTING"),
  kontinuerlig = c("COMPRESS=DEFLATE", "PREDICTOR=STANDARD", "BLOCKSIZE=512", "BIGTIFF=IF_SAFER",
                   "OVERVIEW_RESAMPLING=AVERAGE")
)

# Lägger in färdiga översiktsnivåer i en VRT som <Overview>-element.
.vrt_med_oversikter <- function(vrt, nivaer) {
  rader <- readLines(vrt, encoding = "UTF-8")
  slut <- grep("</VRTRasterBand>", rader, fixed = TRUE)[1]
  oversikt <- sprintf(paste0("    <Overview><SourceFilename relativeToVRT=\"1\">%s</SourceFilename>",
                             "<SourceBand>1</SourceBand></Overview>"), basename(nivaer))
  writeLines(append(rader, oversikt, after = slut - 1L), vrt, useBytes = TRUE)
}

# MAX-nivåer: rekursiv aggregering två och två tills den största sidan är högst .OVERSIKT_GRANS.
# MAX är associativ, så varje nivå blir samma som MAX över motsvarande block i full upplösning.
.max_nivaer <- function(bas, arbete) {
  nivaer <- character(0)
  aktuell <- terra::rast(bas)
  while (max(dim(aktuell)[1:2]) > .OVERSIKT_GRANS) {
    fil <- file.path(arbete, sprintf("niva%d.tif", length(nivaer) + 1L))
    aktuell <- terra::aggregate(aktuell, 2, fun = "max", na.rm = TRUE, filename = fil,
                                wopt = list(datatype = "INT1U", NAflag = 255, gdal = .ARBETSFIL, progress = 0))
    nivaer <- c(nivaer, fil)
  }
  nivaer
}

#' Skriver ett raster som redan är på portalens skala som COG: klassat uint8 med nodata 255 och
#' MAX-översikter, kontinuerligt uint16 (värde × 1000) med nodata 65535 och AVERAGE-översikter.
#' Rastret skrivs först som vanlig GeoTIFF i en arbetsmapp; GDAL gör sedan COG-filen. Klassade
#' nivåer tas in via en VRT med <Overview>-element och OVERVIEWS=FORCE_USE_EXISTING
#' (terra::writeRaster från VRT:n tappar översikterna). Resultatet skrivs till en tillfällig fil
#' i målmappen och byter namn sist, så ett avbrott lämnar aldrig en halvskriven fil.
.skriv_portal_cog <- function(r, mal, roll = c("klassad", "kontinuerlig")) {
  roll <- match.arg(roll)
  arbete <- tempfile("oversikter")
  dir.create(arbete)
  dir.create(dirname(mal), recursive = TRUE, showWarnings = FALSE)
  tmp <- file.path(dirname(mal), paste0(".", basename(mal), ".", Sys.getpid(), ".tmp.tif"))
  on.exit(unlink(c(arbete, tmp, paste0(tmp, ".aux.xml")), recursive = TRUE), add = TRUE)

  bas <- file.path(arbete, "niva0.tif")
  klassad <- roll == "klassad"
  terra::writeRaster(r, bas, datatype = if (klassad) "INT1U" else "INT2U",
                     NAflag = if (klassad) 255 else 65535, gdal = .ARBETSFIL, progress = 0)
  kalla <- bas
  if (klassad) {
    nivaer <- .max_nivaer(bas, arbete)
    kalla <- file.path(arbete, "karta.vrt")
    sf::gdal_utils("buildvrt", bas, kalla)
    if (length(nivaer)) .vrt_med_oversikter(kalla, nivaer)
  }
  ok <- sf::gdal_utils("translate", kalla, tmp,
                       options = c("-of", "COG", as.vector(rbind("-co", .COG_ALTERNATIV[[roll]]))))
  if (!isTRUE(ok) || !file.exists(tmp)) stop(sprintf("GDAL kunde inte skriva %s", mal), call. = FALSE)
  if (!file.rename(tmp, mal)) stop(sprintf("Kunde inte flytta den skrivna filen till %s", mal), call. = FALSE)
  invisible(mal)
}
