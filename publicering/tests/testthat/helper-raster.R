# Testhjälpare: små raster och katalograder

#' Skriver ett 20 x 20-raster med 25 m celler, övre vänstra hörnet i (600000, 6600000).
#' `crs = ""` ger ett raster utan koordinatsystem. `nodata = NA` ger en fil utan användbart nodata.
testraster <- function(varden, crs = "EPSG:3006", nodata = 255, typ = "INT1U") {
  r <- terra::rast(nrows = 20, ncols = 20, xmin = 600000, xmax = 600500,
                   ymin = 6599500, ymax = 6600000, crs = crs)
  terra::values(r) <- rep_len(varden, terra::ncell(r))
  f <- tempfile(fileext = ".tif")
  terra::writeRaster(r, f, datatype = typ, NAflag = nodata)
  f
}

#' En giltig katalograd i samma form som `las_katalog()` ger. Ändra fält med `...`.
testrad <- function(...) {
  rad <- as.list(stats::setNames(rep(NA_character_, length(KATALOG_KOLUMNER)), KATALOG_KOLUMNER))
  rad$id <- "torsk-uppvaxt-vastkusten-2021"
  rad$titel <- "Torsk större än 20 cm, uppväxt, västkusten"
  rad$projekt <- "NMK Ryssja"
  rad$kalla <- "Nationell marin kartering (Ryssja)"
  rad$citering <- "Fredriksson m fl 2021"
  rad$ar <- 2021L
  rad$licens <- "CC BY 4.0"
  rad$kontakt <- "SLU-Aqua-fiskkartor@slu.se"
  rad$sprak <- "sv"
  rad$farg <- "YlGnBu"
  rad$visas <- TRUE
  rad$fil_klassad <- "Torsk större än 20 cm_uppväxt.tif"
  andra <- list(...)
  rad[names(andra)] <- andra
  as.data.frame(rad, stringsAsFactors = FALSE)
}

#' En mapp med klassad testfil under namnet i `testrad()`.
testfilrot <- function() {
  rot <- tempfile("filrot")
  dir.create(rot)
  file.copy(testraster(c(5, 10)), file.path(rot, "Torsk större än 20 cm_uppväxt.tif"))
  rot
}
