# Testdata för webbens E2E-tester, publicerad med publicera_alla() som i drift.
# Kör från repots rot:  Rscript publicering/inst/skript/skapa_testdata.R
#
# torsk-test  EPSG:3006, klassad + kontinuerlig, 2048 x 2048 celler à 25 m (två översiktsnivåer).
#   Område A (rad/kolumn 500–563): klass 10 och värdet 0,75. Kända cellen (532, 532) har mitt i
#     (613287.5, 6636712.5).
#   Område under A (rad 600–699, kolumn 500–563): klass 5 och värdet 0,40.
#   Gles ruta B (rad/kolumn 1200–1263): klass 10 i var fjärde cell i båda led, annars nodata.
#     Utzoomat (100 m-nivån) är hela B "Mycket viktigt", men cellen (1231, 1231) med mitt i
#     (630762.5, 6619237.5) saknar data.
#   Nodata i övrigt, t.ex. cellen (300, 300) med mitt i (607487.5, 6642512.5).
# pbs-test    EPSG:3857, 40 x 40 celler à 100 m, klasserna 0 (ofärgad), 5 och 10 i var sin kvadrant,
#   nodata i den fjärde. Två versioner (källan ändras mellan körningarna). Får visningskopior.
# tral-test   EPSG:4326, en enda klass, alla valfria fält tomma, ingen kontinuerlig fil.
# dold-test   Publicerad i första körningen, dold (visas = nej) i den andra.

pkgload::load_all("publicering", quiet = TRUE)

ut <- file.path("webb", "tests", "fixtures", "data")
unlink(ut, recursive = TRUE)
rot <- tempfile("testdata")
dir.create(file.path(rot, "kallor"), recursive = TRUE)
kalla <- function(namn) file.path(rot, "kallor", namn)

skriv <- function(r, namn, typ = "INT1U", nodata = 255) {
  terra::writeRaster(r, kalla(namn), datatype = typ, NAflag = nodata, overwrite = TRUE)
}

# torsk-test
r <- terra::rast(nrows = 2048, ncols = 2048, xmin = 600000, xmax = 600000 + 2048 * 25,
                 ymin = 6650000 - 2048 * 25, ymax = 6650000, crs = "EPSG:3006")
m <- matrix(NA_integer_, 2048, 2048)
m[500:563, 500:563] <- 10L
m[600:699, 500:563] <- 5L
b <- 1200:1263
m[b[b %% 4 == 0], b[b %% 4 == 0]] <- 10L
terra::values(r) <- as.vector(t(m))
skriv(r, "torsk_klassad.tif")
k <- matrix(NA_real_, 2048, 2048)
k[500:563, 500:563] <- 0.75
k[600:699, 500:563] <- 0.40
terra::values(r) <- as.vector(t(k))
skriv(r, "torsk_kontinuerlig.tif", typ = "FLT4S", nodata = NaN)

# pbs-test, version 1 och 2 (version 2 byter plats på klass 5 och 10)
pbs <- function(ovre_hoger, nedre_vanster) {
  r <- terra::rast(nrows = 40, ncols = 40, xmin = 1800000, xmax = 1804000, ymin = 8000000, ymax = 8004000,
                   crs = "EPSG:3857")
  m <- matrix(NA_integer_, 40, 40)
  m[1:20, 1:20] <- 0L
  m[1:20, 21:40] <- ovre_hoger
  m[21:40, 1:20] <- nedre_vanster
  terra::values(r) <- as.vector(t(m))
  skriv(r, "pbs_klassad.tif")
}
pbs(5L, 10L)

# tral-test
r <- terra::rast(nrows = 20, ncols = 20, xmin = 11.4, xmax = 11.6, ymin = 57.6, ymax = 57.7, crs = "EPSG:4326")
terra::values(r) <- rep(c(1L, NA), 200)
skriv(r, "tral_klassad.tif")

# dold-test
skriv(terra::rast(nrows = 20, ncols = 20, xmin = 600000, xmax = 600500, ymin = 6599500, ymax = 6600000,
                  crs = "EPSG:3006", vals = 10L), "dold_klassad.tif")

rad <- function(...) {
  x <- as.list(stats::setNames(rep(NA_character_, length(KATALOG_KOLUMNER)), KATALOG_KOLUMNER))
  x[names(list(...))] <- list(...)
  x$licens <- "CC BY 4.0"
  x$kontakt <- "SLU-Aqua-fiskkartor@slu.se"
  if (is.na(x$farg)) x$farg <- "YlGnBu"
  if (is.na(x$sprak)) x$sprak <- "sv"
  as.data.frame(x, stringsAsFactors = FALSE)
}
katalog <- function(dold_visas) {
  rbind(
    rad(id = "torsk-test", titel = "Torsk större än 20 cm, uppväxt, västkusten (test)", projekt = "NMK",
        kalla = "Nationell marin kartering (Ryssja)", citering = "Testsson m fl 2021", ar = "2021",
        kvalitet = "Testdata med kända värden.", visas = "ja", fil_klassad = "kallor/torsk_klassad.tif",
        fil_kontinuerlig = "kallor/torsk_kontinuerlig.tif", art = "Torsk",
        vetenskapligt_namn = "Gadus morhua", livsstadium = "uppväxt", havsomrade = "Västkusten",
        rodlista = "Starkt hotad (EN)", livsmiljo = "Mjukbotten"),
    rad(id = "pbs-test", titel = "Perch spawning, Baltic Sea (test)", projekt = "PanBalticScope",
        kalla = "PanBalticScope", citering = "Test et al. 2024", ar = "2024",
        kvalitet = "Test data in English.", sprak = "en", visas = "ja", fil_klassad = "kallor/pbs_klassad.tif",
        klasser = "0=Ej viktigt område;5=Viktigt;10=Mycket viktigt", ofargade_klasser = "0",
        art = "Abborre", vetenskapligt_namn = "Perca fluviatilis", livsstadium = "lek",
        havsomrade = "Östersjön"),
    rad(id = "tral-test", titel = "Trålfångst, en klass (test)", projekt = "NMK",
        kalla = "Nationell marin kartering (Trål)", citering = "Testsson 2021", ar = "2021", visas = "ja",
        fil_klassad = "kallor/tral_klassad.tif", klasser = "1=Förekomst"),
    rad(id = "dold-test", titel = "Sill, dold (test)", projekt = "NMK",
        kalla = "Nationell marin kartering (Yngel)", citering = "Testsson 2021", ar = "2021",
        visas = dold_visas, fil_klassad = "kallor/dold_klassad.tif", art = "Sill",
        vetenskapligt_namn = "Clupea harengus")
  )
}
skriv_xlsx <- function(df) {
  f <- file.path(rot, "katalog.xlsx")
  writexl::write_xlsx(list(katalog = df), f)
  f
}

mal <- mal_lokal(ut)
res1 <- publicera_alla(skriv_xlsx(katalog("ja")), rot, mal, idag = as.Date("2026-11-01"))
pbs(10L, 5L)
res2 <- publicera_alla(skriv_xlsx(katalog("nej")), rot, mal, idag = as.Date("2026-11-25"))
print(res2)
stopifnot(all(res1$status == "publicerad"), identical(res2$status, c("oförändrad", "publicerad", "oförändrad", "dold")))
