STANDARD <- list(licens = "CC BY 4.0", kontakt = "test@example.org")
gammal <- function() test_path("fixtures", "metadata_gammal.xlsx")

test_that("alla 91 rader migreras och 75 visas, med unika id:n", {
  df <- migrera_metadata(gammal(), STANDARD)
  expect_identical(names(df), KATALOG_KOLUMNER)
  expect_equal(nrow(df), 91)
  expect_equal(sum(df$visas), 75)
  expect_false(anyDuplicated(df$id) > 0)
  expect_true(all(grepl("^[a-z0-9]+(-[a-z0-9]+)*$", df$id)))
  expect_true(all(df$kontakt == "test@example.org"))
  expect_true(all(df$licens == "CC BY 4.0"))
})

test_that("Ryssja får klassad och kontinuerlig fil och skala 1000", {
  df <- migrera_metadata(gammal(), STANDARD)
  r <- df[df$id == "berggylta-uppvaxt-vastkusten-2021", ]
  expect_identical(r$fil_klassad, "Data not in app/data/data/rst/NMK Ryssja/Berggylta_uppväxt_västkust_2021.tif")
  expect_identical(r$fil_kontinuerlig, "Data not in app/data/rst/NMK Ryssja/Berggylta_uppväxt_västkust_2021.tif")
  expect_identical(r$skala_kalla, "1000")
  expect_identical(r$projekt, "NMK")
  expect_identical(r$sprak, "sv")
  expect_identical(r$art, "Berggylta")
  expect_identical(r$ar, 2021L)
})

test_that("Trål tar filnamnet från rst_name utan _vuxen_V", {
  df <- migrera_metadata(gammal(), STANDARD)
  r <- df[df$id == "bergskadda-vuxen-vastkusten-2024", ]
  expect_identical(r$fil_klassad, "Data not in app/data/data/rst/NMK Trål/proj_Bergskadda_2005_2022_AllYear_Bergskadda_ensemble.tif")
  expect_identical(r$fil_kontinuerlig, "Data not in app/data/rst/NMK Trål/r/proj_Bergskadda_2005_2022_AllYear_Bergskadda_ensemble.tif")
  expect_identical(r$skala_kalla, "1000")
})

test_that("PanBalticScope är engelsk, utan kontinuerlig fil och med ofärgad nolla", {
  df <- migrera_metadata(gammal(), STANDARD)
  r <- df[df$id == "abborre-lek-ostkusten-2021", ]
  expect_identical(r$fil_klassad, "Data not in app/data/data/rst/PBS/Abborre_lek_ÖBV.tif")
  expect_true(is.na(r$fil_kontinuerlig))
  expect_true(is.na(r$skala_kalla))
  expect_identical(r$klasser, "0=Ej viktigt område;5=Viktigt;10=Mycket viktigt")
  expect_identical(r$ofargade_klasser, "0")
  expect_identical(r$sprak, "en")
  expect_identical(r$projekt, "PanBalticScope")
})

test_that("rader utan källa döljs och får inga filer", {
  df <- migrera_metadata(gammal(), STANDARD)
  harr <- df[startsWith(df$titel, "Harr"), ]
  expect_gt(nrow(harr), 0)
  expect_false(any(harr$visas))
  dolda <- df[!df$visas, ]
  expect_true(all(is.na(dolda$fil_klassad) & is.na(dolda$fil_kontinuerlig)))
  expect_true(all(is.na(dolda$kalla)))
})

test_that("texten 'NA' blir tom och dubbla mellanslag i titeln försvinner", {
  df <- migrera_metadata(gammal(), STANDARD)
  expect_false(any(df == "NA", na.rm = TRUE))
  expect_false(any(grepl("\\s{2,}", df$titel)))
  expect_true("gadda-vuxen-ostkusten-2025" %in% df$id)
})

test_that("varje synlig migrerad rad har alla obligatoriska fält", {
  df <- migrera_metadata(gammal(), STANDARD)
  synliga <- df[df$visas, KRAVDA_KOLUMNER]
  expect_false(anyNA(synliga))
})

test_that("kontakt måste anges", {
  expect_error(migrera_metadata(gammal(), list(licens = "CC BY 4.0")), "kontakt")
})

test_that("den migrerade katalogen överlever en tur genom Excel", {
  df <- migrera_metadata(gammal(), STANDARD)
  f <- tempfile(fileext = ".xlsx")
  skriv_katalog(df, f)
  tillbaka <- las_katalog(f)
  attr(tillbaka, "excelrad") <- NULL
  expect_equal(tillbaka, df, ignore_attr = TRUE)
})
