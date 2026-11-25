IDAG <- as.Date("2026-11-25")

# Katalog med två rader: a-1 (synlig, PanBalticScope, klassad + kontinuerlig) och b-hidden (dold, aldrig publicerad)
publiceringsmiljo <- function() {
  rot <- tempfile("pub")
  dir.create(file.path(rot, "källor"), recursive = TRUE)
  dir.create(file.path(rot, "katalog"))
  file.copy(testraster(c(0, 5, 10)), file.path(rot, "källor", "Torsk lek_klassad.tif"))
  file.copy(testraster(seq(0, 1, length.out = 400), typ = "FLT4S", nodata = NaN),
            file.path(rot, "källor", "Torsk lek_kontinuerlig.tif"))
  df <- rbind(
    testrad(id = "a-1", titel = "Torsk lek", projekt = "PanBalticScope", sprak = "en",
            fil_klassad = "källor/Torsk lek_klassad.tif",
            fil_kontinuerlig = "källor/Torsk lek_kontinuerlig.tif",
            klasser = "0=Ej viktigt område;5=Viktigt;10=Mycket viktigt", ofargade_klasser = "0",
            art = "Torsk"),
    testrad(id = "b-hidden", visas = FALSE, fil_klassad = NA_character_)
  )
  katalog <- file.path(rot, "katalog", "katalog.xlsx")
  skriv_katalog(df, katalog)
  list(rot = rot, katalog = katalog, mal = mal_lokal(file.path(rot, "_data")))
}

pub <- function(m, id = "a-1") publicera(id, m$katalog, m$rot, m$mal, idag = IDAG)

andra_rad <- function(m, id, ...) {
  df <- las_katalog(m$katalog)
  andra <- list(...)
  for (k in names(andra)) df[[k]][df$id == id] <- andra[[k]]
  skriv_katalog(df, m$katalog)
}

i_mal <- function(m, ...) file.path(m$mal$mapp, ...)
kartmapp <- function(m, ...) i_mal(m, "kartor", "panbalticscope", "a-1", ...)
las_json <- function(m) jsonlite::read_json(i_mal(m, "katalog", "katalog.json"), simplifyVector = FALSE)
post <- function(m, id = "a-1") Filter(function(k) k$id == id, las_json(m)$kartor)

schema_giltig <- function(fil) {
  node <- Sys.which("node")
  if (!nzchar(node)) skip("node saknas, hoppar över schemakontrollen")
  skript <- normalizePath(test_path("..", "..", "..", "schema", "validera.mjs"), mustWork = FALSE)
  if (!dir.exists(file.path(dirname(skript), "node_modules"))) skip("kör npm ci i schema/ för schemakontrollen")
  system2(node, c(shQuote(skript), shQuote(fil)), stdout = FALSE, stderr = FALSE) == 0
}

test_that("första publiceringen skriver filer, metadata och en giltig katalog.json", {
  m <- publiceringsmiljo()
  res <- pub(m)
  expect_identical(res$status, "publicerad")
  expect_identical(res$version, 1L)
  expect_true(file.exists(kartmapp(m, "metadata.json")))
  expect_true(file.exists(kartmapp(m, "v1", "visning.tif")))
  expect_true(file.exists(kartmapp(m, "v1", "radata.tif")))
  expect_true(file.exists(file.path(m$rot, "katalog", "katalog.csv")))
  expect_true(schema_giltig(i_mal(m, "katalog", "katalog.json")))

  p <- post(m)[[1]]
  expect_identical(p$aktuellVersion, 1L)
  expect_identical(p$metadata, "kartor/panbalticscope/a-1/metadata.json")
  expect_identical(p$falt$art, "Torsk")
  expect_null(p$falt$rodlista)
  v1 <- p$versioner[[1]]
  expect_identical(v1$publicerad, "2026-11-25")
  expect_identical(v1$klassad$fil, "kartor/panbalticscope/a-1/v1/visning.tif")
  expect_identical(vapply(v1$klassad$klasser, function(k) k$farg, TRUE), c(FALSE, TRUE, TRUE))
  expect_identical(v1$klassad$sha256, digest::digest(file = kartmapp(m, "v1", "visning.tif"), algo = "sha256"))
  expect_identical(v1$kontinuerlig$skala, 1000L)
  expect_equal(v1$kontinuerlig$max, 1)
  expect_identical(jsonlite::read_json(kartmapp(m, "metadata.json")), p)
})

test_that("samma anrop igen är oförändrat och rör inga filer", {
  m <- publiceringsmiljo()
  pub(m)
  tider <- file.mtime(c(kartmapp(m, "v1", "visning.tif"), i_mal(m, "katalog", "katalog.json")))
  Sys.sleep(1.1)
  res <- pub(m)
  expect_identical(res$status, "oförändrad")
  expect_identical(res$version, 1L)
  expect_identical(file.mtime(c(kartmapp(m, "v1", "visning.tif"), i_mal(m, "katalog", "katalog.json"))), tider)
})

test_that("ändrad titel uppdaterar katalog.json och metadata.json men inte kartfilerna", {
  m <- publiceringsmiljo()
  pub(m)
  tid <- file.mtime(kartmapp(m, "v1", "visning.tif"))
  andra_rad(m, "a-1", titel = "Torsk, lekområden")
  res <- pub(m)
  expect_identical(res$status, "uppdaterad")
  expect_identical(res$version, 1L)
  expect_identical(post(m)[[1]]$titel, "Torsk, lekområden")
  expect_identical(jsonlite::read_json(kartmapp(m, "metadata.json"))$titel, "Torsk, lekområden")
  expect_identical(file.mtime(kartmapp(m, "v1", "visning.tif")), tid)
})

test_that("en ändrad rasterfil ger version 2 och lämnar v1 orörd", {
  m <- publiceringsmiljo()
  pub(m)
  sha_v1 <- digest::digest(file = kartmapp(m, "v1", "visning.tif"), algo = "sha256")
  tid <- file.mtime(kartmapp(m, "v1", "visning.tif"))
  file.copy(testraster(c(0, 10, 10)), file.path(m$rot, "källor", "Torsk lek_klassad.tif"), overwrite = TRUE)
  res <- pub(m)
  expect_identical(res$status, "publicerad")
  expect_identical(res$version, 2L)
  expect_true(file.exists(kartmapp(m, "v2", "visning.tif")))
  expect_identical(digest::digest(file = kartmapp(m, "v1", "visning.tif"), algo = "sha256"), sha_v1)
  expect_identical(file.mtime(kartmapp(m, "v1", "visning.tif")), tid)
  p <- post(m)[[1]]
  expect_identical(p$aktuellVersion, 2L)
  expect_length(p$versioner, 2)
  expect_identical(p$versioner[[1]]$klassad$sha256, sha_v1)
  expect_true(schema_giltig(i_mal(m, "katalog", "katalog.json")))
})

test_that("en karta som döljs efter publicering ligger kvar med visas false och sina filer", {
  m <- publiceringsmiljo()
  pub(m)
  andra_rad(m, "a-1", visas = FALSE)
  res <- pub(m)
  expect_identical(res$status, "dold")
  expect_false(post(m)[[1]]$visas)
  expect_false(jsonlite::read_json(kartmapp(m, "metadata.json"))$visas)
  expect_true(file.exists(kartmapp(m, "v1", "visning.tif")))
  expect_true(file.exists(kartmapp(m, "v1", "radata.tif")))
})

test_that("en dold rad som aldrig publicerats ger inga filer och ingen post", {
  m <- publiceringsmiljo()
  res <- pub(m, "b-hidden")
  expect_identical(res$status, "dold")
  expect_length(list.files(i_mal(m), pattern = "b-hidden", recursive = TRUE, include.dirs = TRUE), 0)
  expect_length(post(m, "b-hidden"), 0)
})

test_that("valideringsfel stoppar publicera med alla meddelanden", {
  m <- publiceringsmiljo()
  andra_rad(m, "a-1", kontakt = NA_character_, fil_kontinuerlig = "källor/saknas.tif")
  fel <- tryCatch(pub(m), error = conditionMessage)
  expect_match(fel, "kontakt saknas")
  expect_match(fel, "hittar inte filen")
  expect_false(dir.exists(kartmapp(m)))
})

test_that("publicera_alla rapporterar fel och fortsätter med nästa rad", {
  m <- publiceringsmiljo()
  df <- las_katalog(m$katalog)
  trasig <- df[1, ]
  trasig$id <- "c-trasig"
  trasig$kontakt <- NA_character_
  skriv_katalog(rbind(trasig, df), m$katalog)
  ut <- publicera_alla(m$katalog, m$rot, m$mal, idag = IDAG)
  expect_identical(ut$id, c("c-trasig", "a-1", "b-hidden"))
  expect_identical(ut$status, c("fel", "publicerad", "dold"))
  expect_match(ut$meddelande[1], "kontakt saknas")
  expect_length(post(m, "a-1"), 1)
  expect_length(post(m, "c-trasig"), 0)
  expect_true(schema_giltig(i_mal(m, "katalog", "katalog.json")))
})

test_that("en versionsmapp från en avbruten körning skrivs om", {
  m <- publiceringsmiljo()
  dir.create(kartmapp(m, "v1"), recursive = TRUE)
  writeLines("halv", kartmapp(m, "v1", "visning.tif"))
  writeLines("skräp", kartmapp(m, "v1", "skrap.txt"))
  res <- pub(m)
  expect_identical(res$version, 1L)
  expect_false(file.exists(kartmapp(m, "v1", "skrap.txt")))
  expect_identical(terra::datatype(terra::rast(kartmapp(m, "v1", "visning.tif"))), "INT1U")
})

test_that("ett okänt id ger ett tydligt fel", {
  m <- publiceringsmiljo()
  expect_error(pub(m, "finns-inte"), "finns inte i katalogen")
})
