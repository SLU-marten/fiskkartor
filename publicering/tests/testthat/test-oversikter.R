# Klassade kartor får översikter med MAX, så att "Mycket viktigt" syns även utzoomat.

# Ett glest klassat raster (5 och 10, 20 % tior) med 25 m celler, utan data i övrigt.
gles_klassad <- function(nrad, nkol, antal = 40000, fro = 1) {
  set.seed(fro)
  r <- terra::rast(nrows = nrad, ncols = nkol, xmin = 600000, xmax = 600000 + nkol * 25,
                   ymin = 6600000 - nrad * 25, ymax = 6600000, crs = "EPSG:3006")
  v <- rep(NA_integer_, terra::ncell(r))
  i <- sample(terra::ncell(r), min(antal, terra::ncell(r)))
  v[i] <- ifelse(stats::runif(length(i)) < 0.2, 10L, 5L)
  terra::values(r) <- v
  r
}

skriv_klassad <- function(r) {
  kalla <- tempfile(fileext = ".tif")
  terra::writeRaster(r, kalla, datatype = "INT1U", NAflag = 255)
  ut <- tempfile(fileext = ".tif")
  skriv_cog(kalla, ut, "klassad")
  ut
}

# Översiktsnivåernas storlek som "bredd x höjd", från GDAL:s beskrivning av filen.
oversikter <- function(fil) {
  rad <- grep("Overviews:", terra::describe(fil), value = TRUE)
  if (!length(rad)) return(character(0))
  trimws(strsplit(sub(".*Overviews:", "", rad[1]), ",")[[1]])
}

samma_som_max <- function(ut, r, nivaer) {
  for (i in seq_len(nivaer) - 1L) {
    o <- terra::rast(ut, opts = sprintf("OVERVIEW_LEVEL=%d", i))
    ref <- terra::aggregate(r, 2^(i + 1), fun = "max", na.rm = TRUE)
    expect_identical(dim(o)[1:2], dim(ref)[1:2], label = sprintf("nivå %d, storlek", i))
    expect_identical(as.integer(terra::values(o)[, 1]), as.integer(terra::values(ref)[, 1]),
                     label = sprintf("nivå %d, värden", i))
  }
}

test_that("klassad COG har MAX-översikter", {
  r <- gles_klassad(2048, 2048)
  ut <- skriv_klassad(r)
  info <- terra::describe(ut)
  expect_true(any(grepl("LAYOUT=COG", info)))
  expect_true(any(grepl("NoData Value=255", info, fixed = TRUE)))
  expect_identical(oversikter(ut), c("1024x1024", "512x512"))
  samma_som_max(ut, r, 2)
  expect_identical(as.integer(terra::values(terra::rast(ut))[, 1]), as.integer(terra::values(r)[, 1]))
})

test_that("MAX-översikter med udda mått", {
  r <- gles_klassad(1499, 2047)
  ut <- skriv_klassad(r)
  expect_identical(oversikter(ut), c("1024x750", "512x375"))
  samma_som_max(ut, r, 2)
})

test_that("smalt raster får översikter", {
  r <- gles_klassad(200, 3000, antal = 20000)
  ut <- skriv_klassad(r)
  expect_identical(oversikter(ut), c("1500x100", "750x50", "375x25"))
  samma_som_max(ut, r, 3)
})

test_that("litet raster får inga översikter men är en giltig COG", {
  r <- gles_klassad(300, 400, antal = 2000)
  ut <- skriv_klassad(r)
  expect_identical(oversikter(ut), character(0))
  expect_true(any(grepl("LAYOUT=COG", terra::describe(ut))))
  expect_identical(as.integer(terra::values(terra::rast(ut))[, 1]), as.integer(terra::values(r)[, 1]))
})

test_that("arbetsmappen städas efter lyckad och misslyckad körning", {
  arbetsmappar <- function() list.files(tempdir(), pattern = "^oversikter")
  fore <- arbetsmappar()
  r <- gles_klassad(1024, 1024, antal = 5000)
  skriv_klassad(r)
  expect_identical(arbetsmappar(), fore)

  # Målmappens förälder är en vanlig fil, så skrivningen misslyckas efter att nivåerna byggts.
  hinder <- tempfile()
  file.create(hinder)
  expect_error(suppressWarnings(.skriv_portal_cog(r, file.path(hinder, "ut.tif"), "klassad")))
  expect_identical(arbetsmappar(), fore)
})
