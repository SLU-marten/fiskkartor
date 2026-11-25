ignf_laea_raster <- function() {
  r <- terra::rast(testraster(c(5, 10)))
  terra::crs(r) <- paste(readLines(test_path("fixtures", "ignf_laea.wkt"), encoding = "UTF-8"), collapse = "\n")
  r
}

test_that("IGNF ETRS89-LAEA från NMK Yngel tolkas som EPSG:3035", {
  expect_identical(epsg_kod(ignf_laea_raster()), 3035L)
})

test_that("EPSG-koder läses direkt", {
  expect_identical(epsg_kod(terra::rast(testraster(5))), 3006L)
  expect_identical(epsg_kod(terra::rast(testraster(5, crs = ""))), NA_integer_)
})

test_that("normalisera_crs skriver om IGNF till EPSG:3035", {
  r <- normalisera_crs(ignf_laea_raster())
  expect_identical(terra::crs(r, describe = TRUE)$code, "3035")
})

test_that("normalisera_crs vägrar otillåtna koordinatsystem", {
  expect_error(normalisera_crs(terra::rast(testraster(5, crs = "EPSG:32633"))), "32633")
})

test_that("ett otillåtet koordinatsystem underkänns med koden", {
  fel <- validera_raster(testraster(c(5, 10), crs = "EPSG:32633"), "klassad")
  expect_match(fel, "koordinatsystem", all = FALSE)
  expect_match(fel, "32633", all = FALSE)
})

test_that("ett raster utan koordinatsystem underkänns", {
  fel <- validera_raster(testraster(c(5, 10), crs = ""), "klassad")
  expect_match(fel, "saknar koordinatsystem", all = FALSE)
})

test_that("ett klassvärde utanför klasserna underkänns", {
  fel <- validera_raster(testraster(c(5, 10, 7)), "klassad", tolka_klasser(NA))
  expect_match(fel, "värdet 7", all = FALSE)
})

test_that("ett giltigt klassat raster godkänns", {
  expect_identical(validera_raster(testraster(c(5, 10, 255)), "klassad"), character(0))
})

test_that("kontinuerliga värden över 1000 underkänns med max", {
  fel <- validera_raster(testraster(c(0, 5000), typ = "INT2U", nodata = 65535), "kontinuerlig")
  expect_match(fel, "utanför 0–1000", all = FALSE)
  expect_match(fel, "5000", all = FALSE)
})

test_that("negativa kontinuerliga värden underkänns", {
  fel <- validera_raster(testraster(c(-0.5, 0.9), typ = "FLT4S", nodata = NaN), "kontinuerlig")
  expect_match(fel, "utanför 0–1000", all = FALSE)
})

test_that("ett giltigt 0–1-raster med NaN som nodata godkänns", {
  f <- testraster(c(seq(0, 1, length.out = 399), NA), typ = "FLT4S", nodata = NaN)
  expect_identical(validera_raster(f, "kontinuerlig"), character(0))
})

test_that("ett raster utan giltiga värden underkänns med filnamnet", {
  f <- testraster(255)
  fel <- validera_raster(f, "klassad")
  expect_match(fel, "inga giltiga värden", all = FALSE)
  expect_match(fel, basename(f), fixed = TRUE, all = FALSE)
})

test_that("ett heltalsraster utan nodata underkänns", {
  fel <- validera_raster(testraster(c(5, 10), nodata = NA), "klassad")
  expect_match(fel, "saknar nodata", all = FALSE)
})

test_that("ett raster med flera lager underkänns", {
  r <- c(terra::rast(testraster(5)), terra::rast(testraster(10)))
  f <- tempfile(fileext = ".tif")
  terra::writeRaster(r, f, datatype = "INT1U", NAflag = 255)
  expect_match(validera_raster(f, "klassad"), "2 lager", all = FALSE)
})

test_that("kalla_skala följer regeln för källskala", {
  expect_identical(kalla_skala(0, 1.00001), 1L)
  expect_identical(kalla_skala(0, 841), 1000L)
  expect_error(kalla_skala(0, 1.5), "tvetydig skala")
  expect_error(kalla_skala(0, 1.5), "skala_kalla")
  expect_identical(kalla_skala(0, 1.5, skala_kalla = 1000L), 1000L)
})

test_that("kalla_skala vägrar värden utanför den angivna skalan", {
  expect_error(kalla_skala(0, 30059), "utanför 0–1000")
  expect_error(kalla_skala(0, 9400, skala_kalla = 1000L), "9400")
  expect_error(kalla_skala(0, 841, skala_kalla = 1L), "utanför 0–1")
})

test_that("UTM 33N på GRS80 utan datum (NMK Ryssja) tolkas som EPSG:25833", {
  r <- terra::rast(testraster(c(5, 10)))
  terra::crs(r) <- paste(readLines(test_path("fixtures", "ryssja_utm33.wkt"), encoding = "UTF-8"), collapse = "\n")
  expect_identical(epsg_kod(r), 25833L)
})

test_that("UTM 33N på WGS84 utan EPSG-kod tolkas inte som EPSG:25833", {
  r <- terra::rast(testraster(c(5, 10)))
  terra::crs(r) <- "+proj=utm +zone=33 +ellps=WGS84 +units=m +no_defs"
  expect_false(identical(epsg_kod(r), 25833L))
})
