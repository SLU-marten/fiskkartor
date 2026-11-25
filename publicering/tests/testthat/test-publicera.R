IDAG <- as.Date("2026-11-25")

# Katalog med två rader: a-1 (synlig, PanBalticScope, klassad + kontinuerlig) och b-hidden (dold, aldrig publicerad)
publiceringsmiljo <- function(crs = "EPSG:3006", kontinuerlig = seq(0, 1, length.out = 400)) {
  rot <- tempfile("pub")
  dir.create(file.path(rot, "källor"), recursive = TRUE)
  dir.create(file.path(rot, "katalog"))
  file.copy(testraster(c(0, 5, 10), crs = crs), file.path(rot, "källor", "Torsk lek_klassad.tif"))
  file.copy(testraster(kontinuerlig, crs = crs, typ = "FLT4S", nodata = NaN),
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

test_that("en publicerad version skrivs aldrig om när katalog.json saknas lokalt", {
  m <- publiceringsmiljo()
  pub(m)
  sha_v1 <- digest::digest(file = kartmapp(m, "v1", "visning.tif"), algo = "sha256")
  unlink(i_mal(m, "katalog"), recursive = TRUE)
  file.copy(testraster(c(0, 10, 10)), file.path(m$rot, "källor", "Torsk lek_klassad.tif"), overwrite = TRUE)
  expect_error(pub(m), "hamta_data")
  expect_identical(digest::digest(file = kartmapp(m, "v1", "visning.tif"), algo = "sha256"), sha_v1)
})

test_that("ändrade klassvärden kontrolleras mot rastret", {
  m <- publiceringsmiljo()
  pub(m)
  andra_rad(m, "a-1", klasser = "0=Ej viktigt område;5=Viktigt")
  expect_error(pub(m), "värdet 10")
})

test_that("nya klassnamn uppdaterar texten utan ny version", {
  m <- publiceringsmiljo()
  pub(m)
  andra_rad(m, "a-1", klasser = "0=Ej viktigt område;5=Viktigt område;10=Mycket viktigt område")
  res <- pub(m)
  expect_identical(res$status, "uppdaterad")
  expect_identical(post(m)[[1]]$versioner[[1]]$klassad$klasser[[3]]$namn, "Mycket viktigt område")
})

test_that("en NFD-källfil publiceras", {
  m <- publiceringsmiljo()
  gammal <- file.path(m$rot, "källor", "Torsk lek_klassad.tif")
  file.rename(gammal, file.path(m$rot, "källor", stringi::stri_trans_nfd("Torsk lek_klassad_ä.tif")))
  andra_rad(m, "a-1", fil_klassad = "källor/Torsk lek_klassad_ä.tif")
  expect_identical(pub(m)$status, "publicerad")
})

test_that("oförändrad källa men gammalt format ger ny version", {
  m <- publiceringsmiljo()
  withr::with_options(list(fiskkartor.cog_format = 1L), pub(m))
  v1 <- kartmapp(m, "v1", "visning.tif")
  sha1 <- digest::digest(file = v1, algo = "sha256")
  expect_identical(post(m)[[1]]$versioner[[1]]$format, 1L)

  res <- pub(m)
  expect_identical(res$status, "publicerad")
  expect_identical(res$version, 2L)
  expect_identical(digest::digest(file = v1, algo = "sha256"), sha1)
  v <- post(m)[[1]]$versioner
  expect_identical(v[[1]]$format, 1L)
  expect_identical(v[[2]]$format, 2L)
  expect_identical(pub(m)$status, "oförändrad")
  expect_true(schema_giltig(i_mal(m, "katalog", "katalog.json")))
})

test_that("en version utan format (från fas 1) räknas som format 1 och ger ny version", {
  m <- publiceringsmiljo()
  pub(m)
  f <- i_mal(m, "katalog", "katalog.json")
  j <- jsonlite::read_json(f, simplifyVector = FALSE)
  j$kartor[[1]]$versioner[[1]]$format <- NULL
  jsonlite::write_json(j, f, auto_unbox = TRUE, pretty = TRUE, null = "null", digits = NA)

  res <- pub(m)
  expect_identical(res$status, "publicerad")
  expect_identical(res$version, 2L)
})

test_that("en karta i Web Mercator får visningskopior i SWEREF 99 TM", {
  m <- publiceringsmiljo(crs = "EPSG:3857")
  pub(m)
  v <- post(m)[[1]]$versioner[[1]]
  vy <- kartmapp(m, "v1", "visning_3006.tif")
  expect_true(file.exists(vy))
  expect_identical(epsg_kod(terra::rast(vy)), 3006L)
  expect_setequal(terra::unique(terra::rast(vy))[[1]], c(0, 5, 10))
  expect_identical(v$klassad$epsg, 3857L)
  expect_identical(v$klassad$vy3006$fil, "kartor/panbalticscope/a-1/v1/visning_3006.tif")
  expect_identical(v$klassad$vy3006$sha256, digest::digest(file = vy, algo = "sha256"))
  expect_equal(v$klassad$vy3006$bytes, file.size(vy))
  expect_identical(v$kontinuerlig$vy3006$fil, "kartor/panbalticscope/a-1/v1/radata_3006.tif")
  expect_true(file.exists(kartmapp(m, "v1", "radata_3006.tif")))
  expect_true(schema_giltig(i_mal(m, "katalog", "katalog.json")))
})

test_that("en karta i SWEREF 99 TM får ingen visningskopia", {
  m <- publiceringsmiljo()
  pub(m)
  v <- post(m)[[1]]$versioner[[1]]
  expect_null(v$klassad$vy3006)
  expect_null(v$kontinuerlig$vy3006)
  expect_false(file.exists(kartmapp(m, "v1", "visning_3006.tif")))
})

test_that("visningskopian skalas inte om", {
  # Sannolikheter upp till 0,001 lagras som 0 och 1 på skalan × 1000.
  m <- publiceringsmiljo(crs = "EPSG:3857", kontinuerlig = seq(0, 0.001, length.out = 400))
  expect_identical(pub(m)$status, "publicerad")
  vy <- terra::rast(kartmapp(m, "v1", "radata_3006.tif"))
  expect_setequal(terra::unique(vy)[[1]], c(0, 1))
})

# Lägger till rader i Excelfilen som text, så att även ogiltiga värden kan skrivas.
lagg_till_text <- function(m, ...) {
  x <- as.data.frame(readxl::read_excel(m$katalog, sheet = "katalog", col_types = "text"))
  for (andra in list(...)) {
    ny <- x[1, , drop = FALSE]
    ny[names(andra)] <- andra
    x <- rbind(x, ny)
  }
  writexl::write_xlsx(list(katalog = x), m$katalog)
}

test_that("en trasig rad ger fel för den raden och de andra publiceras", {
  m <- publiceringsmiljo()
  lagg_till_text(m, list(id = "c-kanske", visas = "kanske"), list(id = "d-ar", ar = "2021 x"),
                 list(id = "e-tom", visas = NA_character_))
  ut <- publicera_alla(m$katalog, m$rot, m$mal, idag = IDAG)
  status <- stats::setNames(ut$status, ut$id)
  expect_identical(unname(status[c("a-1", "b-hidden", "c-kanske", "d-ar", "e-tom")]),
                   c("publicerad", "dold", "fel", "fel", "fel"))
  expect_match(ut$meddelande[ut$id == "e-tom"], "visas saknas (ja eller nej)", fixed = TRUE)
  expect_match(ut$meddelande[ut$id == "d-ar"], "ar måste vara ett heltal", fixed = TRUE)
  expect_identical(vapply(las_json(m)$kartor, function(k) k$id, ""), "a-1")
})

test_that("publicera stoppar på en rad med tom visas i stället för att dölja kartan", {
  m <- publiceringsmiljo()
  lagg_till_text(m, list(id = "e-tom", visas = NA_character_))
  expect_error(publicera("e-tom", m$katalog, m$rot, m$mal, idag = IDAG), "visas saknas", fixed = TRUE)
})

test_that("publicera_alla varnar för kartor som finns i katalog.json men inte i Excel", {
  m <- publiceringsmiljo()
  pub(m)
  df <- las_katalog(m$katalog)
  skriv_katalog(df[df$id != "a-1", ], m$katalog)
  expect_warning(ut <- publicera_alla(m$katalog, m$rot, m$mal, idag = IDAG),
                 "kartor som finns i katalog.json men inte i Excel: a-1", fixed = TRUE)
  expect_identical(attr(ut, "saknas_i_excel"), "a-1")
  expect_length(post(m), 1)
})

test_that("skriv_om_visningskopior byter kopiorna och uppdaterar hash och storlek, originalen orörda", {
  m <- publiceringsmiljo(crs = "EPSG:3857")
  pub(m)
  original <- digest::digest(file = kartmapp(m, "v1", "visning.tif"), algo = "sha256")
  writeBin(as.raw(1:10), kartmapp(m, "v1", "visning_3006.tif"))
  expect_identical(skriv_om_visningskopior(m$mal), 2L)
  vy <- kartmapp(m, "v1", "visning_3006.tif")
  v <- post(m)[[1]]$versioner[[1]]
  expect_identical(v$klassad$vy3006$sha256, digest::digest(file = vy, algo = "sha256"))
  expect_equal(v$klassad$vy3006$bytes, file.size(vy))
  expect_identical(jsonlite::read_json(kartmapp(m, "metadata.json"))$versioner[[1]]$klassad$vy3006$sha256,
                   v$klassad$vy3006$sha256)
  expect_identical(digest::digest(file = kartmapp(m, "v1", "visning.tif"), algo = "sha256"), original)
  expect_true(schema_giltig(i_mal(m, "katalog", "katalog.json")))
})
