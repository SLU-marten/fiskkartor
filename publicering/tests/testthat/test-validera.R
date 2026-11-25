test_that("en giltig rad ger inga fel", {
  expect_identical(validera_rad(testrad(), testfilrot()), character(0))
})

test_that("saknad kontakt ger felet kontakt saknas", {
  fel <- validera_rad(testrad(kontakt = NA_character_), testfilrot())
  expect_match(fel, "kontakt saknas", all = FALSE)
})

test_that("en fil som inte finns ger felet hittar inte filen med sökvägen", {
  rot <- testfilrot()
  fel <- validera_rad(testrad(fil_klassad = "NMK Ryssja/Saknas_västkust.tif"), rot)
  expect_match(fel, "hittar inte filen", all = FALSE)
  expect_match(fel, file.path(rot, "NMK Ryssja/Saknas_västkust.tif"), fixed = TRUE, all = FALSE)
})

test_that("ett id med mellanslag och versaler underkänns", {
  fel <- validera_rad(testrad(id = "Torsk 1"), testfilrot())
  expect_match(fel, "id får bara innehålla", all = FALSE)
})

test_that("en dold rad utan filer valideras inte", {
  rad <- testrad(visas = FALSE, fil_klassad = NA_character_, kontakt = NA_character_)
  expect_identical(validera_rad(rad, testfilrot()), character(0))
})

test_that("en synlig rad utan klassad fil underkänns", {
  fel <- validera_rad(testrad(fil_klassad = NA_character_), testfilrot())
  expect_match(fel, "fil_klassad saknas", all = FALSE)
})

test_that("skala_kalla får bara vara 1 eller 1000", {
  fel <- validera_rad(testrad(skala_kalla = "100"), testfilrot())
  expect_match(fel, "skala_kalla", all = FALSE)
})

test_that("PanBalticScope-klasser med ofärgad nolla tolkas", {
  k <- tolka_klasser("0=Ej viktigt område;5=Viktigt;10=Mycket viktigt", "0")
  expect_equal(nrow(k), 3)
  expect_identical(k$varde, c(0L, 5L, 10L))
  expect_identical(k$namn, c("Ej viktigt område", "Viktigt", "Mycket viktigt"))
  expect_identical(k$farg, c(FALSE, TRUE, TRUE))
})

test_that("tomma klasser ger standardklasserna", {
  k <- tolka_klasser(NA_character_)
  expect_identical(k$varde, c(5L, 10L))
  expect_identical(k$farg, c(TRUE, TRUE))
})

test_that("klasser som inte går att tolka ger ett tydligt fel", {
  expect_error(tolka_klasser("5 Viktigt;10=Mycket viktigt"), "Kan inte tolka klasserna")
})

test_that("källfiler med NFD-namn på disken hittas", {
  rot <- tempfile("nfd")
  dir.create(file.path(rot, stringi::stri_trans_nfd("NMK Trål")), recursive = TRUE)
  file.copy(testraster(c(5, 10)), file.path(rot, stringi::stri_trans_nfd("NMK Trål"), stringi::stri_trans_nfd("Gädda_uppväxt.tif")))
  expect_identical(validera_rad(testrad(fil_klassad = "NMK Trål/Gädda_uppväxt.tif"), rot), character(0))
})
