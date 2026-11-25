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
  expect_identical(names(k), KATALOG_KOLUMNER)
  expect_equal(k$id, "a-1"); expect_identical(k$ar, 2021L); expect_true(k$visas)
  expect_equal(k$fil_klassad, "data/rst/x å.tif")
})

test_that("las_katalog stoppar på okänt visas-värde", {
  f <- skriv_test_xlsx(data.frame(id = "a-1", visas = "kanske"))
  expect_error(las_katalog(f), "visas.*rad 2|rad 2.*visas")
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
