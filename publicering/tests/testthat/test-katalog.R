skriv_test_xlsx <- function(rader) {
  f <- tempfile(fileext = ".xlsx")
  writexl::write_xlsx(list(katalog = rader), f)
  f
}

test_that("las_katalog städar Excel-celler", {
  f <- skriv_test_xlsx(data.frame(id = c(" a-1 ", NA), titel = c("A", NA), ar = c("2021.0", NA),
                                  visas = c("JA", NA), fil_klassad = c("data\\rst\\x å.tif", NA)))
  k <- las_katalog(f)
  expect_equal(nrow(k), 1)
  expect_identical(names(k), c(KATALOG_KOLUMNER, "cellfel"))
  expect_true(is.na(k$cellfel))
  expect_equal(k$id, "a-1"); expect_identical(k$ar, 2021L); expect_true(k$visas)
  expect_equal(k$fil_klassad, "data/rst/x å.tif")
})

test_that("las_katalog stoppar inte på trasiga celler utan markerar raden", {
  f <- skriv_test_xlsx(data.frame(id = c("a-1", "b-2", "c-3", "d-4"), titel = "T",
                                  ar = c("2021", "2021 x", "2021", "2021"),
                                  visas = c("kanske", "ja", NA, "nej")))
  k <- las_katalog(f)
  expect_identical(k$visas, c(NA, TRUE, NA, FALSE))
  expect_identical(k$ar, c(2021L, NA, 2021L, 2021L))
  expect_identical(k$cellfel, c("visas måste vara ja eller nej, inte 'kanske'",
                                "ar måste vara ett heltal, inte '2021 x'",
                                "visas saknas (ja eller nej)", NA))
  expect_match(validera_rad(k[3, ], tempdir()), "c-3: visas saknas (ja eller nej)", fixed = TRUE, all = FALSE)
  expect_match(validera_rad(k[1, ], tempdir()), "a-1: visas måste vara ja eller nej", fixed = TRUE, all = FALSE)
})

test_that("hårda mellanslag och citattecken runt celler tas bort", {
  f <- skriv_test_xlsx(data.frame(id = "a-1", art = "\u00a0Torsk ", visas = "ja",
                                  fil_klassad = "\"C:\\a\\b.tif\"", kalla = "\u201cNMK\u201d"))
  k <- las_katalog(f)
  expect_identical(k$art, "Torsk")
  expect_identical(k$fil_klassad, "C:/a/b.tif")
  expect_identical(k$kalla, "NMK")
})

test_that("exportera_csv behåller trasiga värden som de stod", {
  f <- skriv_test_xlsx(data.frame(id = "a-1", ar = "2021 x", visas = "kanske"))
  csv <- exportera_csv(f)
  rad <- readLines(csv, encoding = "UTF-8", warn = FALSE)[2]
  expect_match(rad, ";2021 x;", fixed = TRUE)
  expect_match(rad, ";kanske;", fixed = TRUE)
  expect_false(grepl("cellfel", readLines(csv, encoding = "UTF-8", warn = FALSE)[1]))
})

test_that("exportera_csv skriver semikolon och BOM", {
  f <- skriv_test_xlsx(data.frame(id = "a-1", titel = "Åsa", visas = "ja"))
  k <- las_katalog(f)
  x <- tempfile(fileext = ".xlsx"); skriv_katalog(k, x)
  csv <- exportera_csv(x)
  expect_equal(basename(csv), "katalog.csv")
  bytes <- readBin(csv, "raw", 3)
  expect_equal(bytes, as.raw(c(0xEF, 0xBB, 0xBF)))
  rader <- readLines(csv, encoding = "UTF-8", warn = FALSE)
  expect_match(sub("^﻿", "", rader[1]), "^id;titel;")
  expect_match(rader[2], "Åsa")
})
