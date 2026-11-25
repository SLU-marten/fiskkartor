# Skapar testfilerna i webb/tests/fixtures med skriv_cog(). Kör från repots rot:
#   Rscript publicering/inst/skript/skapa_testcog.R
# Alla är 200 x 200 celler à 25 m med ett 20 x 20-block nodata uppe till vänster.
suppressMessages(pkgload::load_all("publicering", quiet = TRUE))
ut <- "webb/tests/fixtures"
dir.create(ut, recursive = TRUE, showWarnings = FALSE)

kalla <- function(varden, crs, xmin, ymax, typ, nodata) {
  r <- terra::rast(nrows = 200, ncols = 200, xmin = xmin, xmax = xmin + 5000,
                   ymin = ymax - 5000, ymax = ymax, crs = crs)
  varden[1:20, 1:20] <- NA
  terra::values(r) <- as.vector(t(varden))  # terra läser radvis
  f <- tempfile(fileext = ".tif")
  terra::writeRaster(r, f, datatype = typ, NAflag = nodata)
  f
}

kolumn <- matrix(rep(0:199, each = 200), 200, 200)  # kolumn[rad, kol] = kol - 1
klass <- ifelse(kolumn < 100, 5, 10)                # vänster halva 5, höger halva 10

invisible(skriv_cog(kalla(klass, "EPSG:3006", 600000, 6600000, "INT1U", 255),
          file.path(ut, "test_klassad.tif"), "klassad"))
invisible(skriv_cog(kalla(kolumn / 199, "EPSG:3006", 600000, 6600000, "FLT4S", NaN),
          file.path(ut, "test_kontinuerlig.tif"), "kontinuerlig"))
invisible(skriv_cog(kalla(klass, "EPSG:3035", 4800000, 4050000, "INT1U", 255),
          file.path(ut, "test_klassad_3035.tif"), "klassad"))
