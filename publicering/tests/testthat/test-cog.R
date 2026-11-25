test_that("klassad COG: uint8, nodata 255, COG-layout och översikter", {
  src <- testraster(rep(c(5, 10), each = 200), nodata = 255)
  ut <- tempfile(fileext = ".tif")
  res <- skriv_cog(src, ut, "klassad")
  info <- terra::describe(ut)
  expect_true(any(grepl("LAYOUT=COG", info)))
  expect_true(any(grepl("COMPRESSION=DEFLATE", info)))
  expect_true(any(grepl("Overviews", info)) || nrow(terra::rast(ut)) <= 512)
  expect_true(any(grepl("NoData Value=255", info, fixed = TRUE)))
  expect_equal(terra::datatype(terra::rast(ut)), "INT1U")
  expect_identical(res$epsg, 3006L)
  expect_true(is.na(res$skala))
  expect_equal(res$upplosning, 25)
  expect_equal(res$bytes, file.size(ut))
})

test_that("kontinuerlig 0–1 skalas till uint16 × 1000", {
  src <- testraster(seq(0, 1, length.out = 400), nodata = NaN, typ = "FLT4S")
  ut <- tempfile(fileext = ".tif")
  res <- skriv_cog(src, ut, "kontinuerlig")
  r <- terra::rast(ut)
  expect_equal(terra::datatype(r), "INT2U")
  expect_identical(res$skala, 1000L)
  expect_true(any(grepl("NoData Value=65535", terra::describe(ut), fixed = TRUE)))
  expect_equal(unname(terra::global(r, "max", na.rm = TRUE)[[1]]), 1000)
  st <- statistik(ut, "kontinuerlig")
  expect_equal(st$min, 0)
  expect_equal(st$max, 1)
  expect_equal(st$p2, 0.018)
  expect_equal(st$p98, 0.98)
})

test_that("kontinuerlig som redan är 0–1000 skalas inte om", {
  src <- testraster(seq(87, 841, length.out = 400), nodata = NaN, typ = "FLT4S")
  ut <- tempfile(fileext = ".tif")
  skriv_cog(src, ut, "kontinuerlig")
  expect_equal(unname(terra::global(terra::rast(ut), "max", na.rm = TRUE)[[1]]), 841)
  expect_equal(statistik(ut, "kontinuerlig")$max, 0.841)
})

test_that("kontinuerlig med max 1.00001 klampas till 1000", {
  src <- testraster(seq(0, 1.00001, length.out = 400), nodata = NaN, typ = "FLT4S")
  ut <- tempfile(fileext = ".tif")
  expect_no_error(skriv_cog(src, ut, "kontinuerlig"))
  expect_equal(unname(terra::global(terra::rast(ut), "max", na.rm = TRUE)[[1]]), 1000)
})

test_that("tvetydig skala stoppar med filnamnet och skala_kalla", {
  src <- testraster(seq(0, 1.5, length.out = 400), nodata = NaN, typ = "FLT4S")
  ut <- tempfile(fileext = ".tif")
  expect_error(skriv_cog(src, ut, "kontinuerlig"), "skala_kalla")
  expect_error(skriv_cog(src, ut, "kontinuerlig"), basename(src), fixed = TRUE)
  expect_false(file.exists(ut))
  expect_length(list.files(dirname(ut), pattern = basename(ut)), 0)
})

test_that("upplösning i meter även för EPSG:4326", {
  r <- terra::rast(nrows = 20, ncols = 20, crs = "EPSG:4326",
                   xmin = 15 - 10 * 0.05556, xmax = 15 + 10 * 0.05556,
                   ymin = 57 - 10 * 0.03333, ymax = 57 + 10 * 0.03333)
  terra::values(r) <- rep(c(5, 10), 200)
  src <- tempfile(fileext = ".tif")
  terra::writeRaster(r, src, datatype = "INT1U", NAflag = 255)
  res <- skriv_cog(src, tempfile(fileext = ".tif"), "klassad")
  expect_identical(res$epsg, 4326L)
  expect_gt(res$upplosning, 3600)
  expect_lt(res$upplosning, 3750)
})

test_that("sha256 och kallaSha256 skiljer sig", {
  src <- testraster(c(5, 10))
  ut <- tempfile(fileext = ".tif")
  res <- skriv_cog(src, ut, "klassad")
  expect_identical(res$sha256, digest::digest(file = ut, algo = "sha256"))
  expect_identical(res$kallaSha256, digest::digest(file = src, algo = "sha256"))
  expect_false(identical(res$sha256, res$kallaSha256))
})

test_that("PanBalticScope-klasser med nolla går igenom med egna klasser", {
  src <- testraster(c(0, 5, 10))
  ut <- tempfile(fileext = ".tif")
  kl <- tolka_klasser("0=Ej viktigt område;5=Viktigt;10=Mycket viktigt", "0")
  expect_error(skriv_cog(src, tempfile(fileext = ".tif"), "klassad"), "värdet 0")
  skriv_cog(src, ut, "klassad", klasser = kl)
  expect_identical(statistik(ut, "klassad")$varden, c(0L, 5L, 10L))
})

test_that("statistik för klassad listar förekommande klasser", {
  ut <- tempfile(fileext = ".tif")
  skriv_cog(testraster(c(10, 5, 255)), ut, "klassad")
  expect_identical(statistik(ut, "klassad")$varden, c(5L, 10L))
})

test_that("IGNF-raster skrivs med ren EPSG:3035", {
  r <- terra::rast(testraster(c(5, 10)))
  terra::crs(r) <- paste(readLines(test_path("fixtures", "ignf_laea.wkt"), encoding = "UTF-8"), collapse = "\n")
  src <- tempfile(fileext = ".tif")
  terra::writeRaster(r, src, datatype = "INT1U", NAflag = 255)
  ut <- tempfile(fileext = ".tif")
  expect_identical(skriv_cog(src, ut, "klassad")$epsg, 3035L)
  expect_identical(terra::crs(terra::rast(ut), describe = TRUE)$code, "3035")
})

test_that("kontinuerlig skrivs även när terra går via disk (stora raster)", {
  terra::terraOptions(todisk = TRUE)
  on.exit(terra::terraOptions(todisk = FALSE), add = TRUE)
  src <- testraster(seq(0, 1, length.out = 400), nodata = NaN, typ = "FLT4S")
  ut <- tempfile(fileext = ".tif")
  skriv_cog(src, ut, "kontinuerlig")
  info <- terra::describe(ut)
  expect_true(any(grepl("LAYOUT=COG", info)))
  expect_true(any(grepl("PREDICTOR=2", info)))
})

test_that("upplösning i markmeter för EPSG:3857, och visningskopian får den cellstorleken", {
  # 100 m celler i Web Mercator kring 60° N är 50 m på marken.
  y60 <- 6378137 * log(tan(pi / 4 + pi / 6))
  r <- terra::rast(nrows = 20, ncols = 20, crs = "EPSG:3857", xmin = 2e6 - 1000, xmax = 2e6 + 1000,
                   ymin = y60 - 1000, ymax = y60 + 1000)
  terra::values(r) <- rep(c(5, 10), 200)
  src <- tempfile(fileext = ".tif")
  terra::writeRaster(r, src, datatype = "INT1U", NAflag = 255)
  cog <- tempfile(fileext = ".tif")
  res <- skriv_cog(src, cog, "klassad")
  expect_equal(res$upplosning, 50, tolerance = 0.5 / 50)
  vy <- tempfile(fileext = ".tif")
  kopia <- .skriv_vy3006(cog, vy, "klassad", res$upplosning)
  expect_equal(terra::res(terra::rast(vy)), c(res$upplosning, res$upplosning))
  expect_identical(kopia$sha256, digest::digest(file = vy, algo = "sha256"))
  expect_identical(kopia$bytes, file.size(vy))
})
