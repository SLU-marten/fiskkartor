# Testbild: 200 x 100 bildpunkter. En ellips med mitten (100, 50) och radierna 70 och 30 (x 30–170,
# y 20–80) i färgen `fisk`, en fläck med radien 10 mitt i i färgen `flack`, resten i `bakgrund`.
# alfa = TRUE ger ett fjärde band som är 0 utanför ellipsen och 255 innanför.
testbild <- function(bakgrund, fisk, flack = fisk, alfa = FALSE, tackande = FALSE) {
  r <- terra::rast(nrows = 100, ncols = 200, xmin = 0, xmax = 200, ymin = 0, ymax = 100, nlyrs = if (alfa) 4 else 3)
  xy <- terra::xyFromCell(r, seq_len(terra::ncell(r)))
  x <- xy[, 1]; y <- 100 - xy[, 2]
  i_ellips <- ((x - 100) / 70)^2 + ((y - 50) / 30)^2 <= 1
  i_flack <- (x - 100)^2 + (y - 50)^2 <= 100
  v <- matrix(rep(bakgrund, each = terra::ncell(r)), ncol = 3)
  v[i_ellips, ] <- matrix(rep(fisk, each = sum(i_ellips)), ncol = 3)
  v[i_flack, ] <- matrix(rep(flack, each = sum(i_flack)), ncol = 3)
  if (alfa) v <- cbind(v, if (tackande) 255 else ifelse(i_ellips, 255, 0))
  terra::values(r) <- v
  f <- file.path(withr::local_tempdir(.local_envir = parent.frame()), "x.png")
  terra::writeRaster(r, f, datatype = "INT1U", filetype = "PNG")
  unlink(paste0(f, ".aux.xml"))
  f
}

test_that("silhuett skär ut fisken mot vit bakgrund och behåller en ljus buk", {
  s <- silhuett(testbild(bakgrund = c(255, 255, 255), fisk = c(60, 60, 60), flack = c(250, 250, 250)))
  expect_lte(abs(s$w - 141L), 2)
  expect_lte(abs(s$h - 61L), 2)
  expect_match(s$d, "^M[0-9]")
  expect_equal(lengths(regmatches(s$d, gregexpr("M", s$d))), 1)
})

test_that("silhuett klarar en bild med alfakanal men ogenomskinlig vit bakgrund", {
  # Många program sparar en vit PNG med alfakanal. Då avgör färgen, inte alfakanalen.
  s <- silhuett(testbild(bakgrund = c(255, 255, 255), fisk = c(60, 60, 60), alfa = TRUE, tackande = TRUE))
  expect_lte(abs(s$w - 141L), 2)
  expect_lte(abs(s$h - 61L), 2)
})

test_that("silhuett klarar svart bakgrund", {
  s <- silhuett(testbild(bakgrund = c(0, 0, 0), fisk = c(200, 200, 200)))
  expect_lte(abs(s$w - 141L), 2)
  expect_lte(abs(s$h - 61L), 2)
})

test_that("silhuett klarar genomskinlig bakgrund", {
  s <- silhuett(testbild(bakgrund = c(255, 255, 255), fisk = c(255, 255, 255), alfa = TRUE))
  expect_lte(abs(s$w - 141L), 2)
  expect_lte(abs(s$h - 61L), 2)
})

test_that("monster_meny har varje art en gång och mönstren har rätt mått", {
  s <- list(A = list(w = 100L, h = 40L, d = "M0 0 L100 0 L100 40Z"), B = list(w = 50L, h = 40L, d = "M0 0 L50 0 L50 40Z"))
  m <- monster_meny(s, c("A", "B"))
  expect_match(m, 'viewBox="0 0 316 844"', fixed = TRUE)
  expect_equal(lengths(regmatches(m, gregexpr("<path", m))), 2)
  expect_match(monster_sidhuvud(s, c("A", "B")), 'viewBox="0 0 1440 144"', fixed = TRUE)
  expect_identical(monster_meny(s, c("A", "B")), m)
})

test_that("saknade_arter följer webbens namnregel", {
  k <- withr::local_tempfile(fileext = ".json")
  jsonlite::write_json(list(kartor = lapply(c("Braxen/björkna", " torsk", "Hummer", "Östersjöflundra", "Fenknot"),
                                            function(a) list(falt = list(art = a)))), k, auto_unbox = TRUE)
  s <- list(Braxen = list(), Torsk = list(), "Europeisk hummer" = list(), Skrubbskädda = list())
  expect_identical(saknade_arter(s, k), "Fenknot")
})
