#' Koordinatsystem som portalen tar emot
TILLATNA_EPSG <- c(3006L, 3035L, 25833L, 4326L, 3857L)

# Definitioner utan EPSG-kod som finns i gamla kartor. Alla ligger på GRS80 utan datumförskjutning.
#   3035:  IGNF:s ETRS89-LAEA (NMK Yngel)
#   25833: ESRI-namnet UTM_Zone_33_Northern_Hemisphere (NMK Ryssja)
.KANDA_DEFINITIONER <- list(
  "3035" = c("+proj=laea", "+lat_0=52", "+lon_0=10", "+x_0=4321000", "+y_0=3210000", "+ellps=GRS80"),
  "25833" = c("+proj=utm", "+zone=33", "+ellps=GRS80")
)

.kand_definition <- function(proj4) {
  delar <- strsplit(proj4, "\\s+")[[1]]
  if ("+south" %in% delar) return(NA_integer_)
  towgs84 <- grep("^\\+towgs84=", delar, value = TRUE)
  if (length(towgs84) && any(as.numeric(strsplit(sub("^\\+towgs84=", "", towgs84), ",")[[1]]) != 0)) {
    return(NA_integer_)
  }
  for (kod in names(.KANDA_DEFINITIONER)) {
    if (all(.KANDA_DEFINITIONER[[kod]] %in% delar)) return(as.integer(kod))
  }
  NA_integer_
}

.tal <- function(x) format(x, digits = 7, scientific = FALSE, trim = TRUE)

#' EPSG-koden för ett rasters koordinatsystem, eller `NA_integer_` när den är okänd.
#' IGNF ETRS89-LAEA tolkas som EPSG:3035 och GRS80-UTM 33N utan datum som EPSG:25833.
epsg_kod <- function(r) {
  if (!nzchar(terra::crs(r))) return(NA_integer_)
  d <- terra::crs(r, describe = TRUE)
  if (identical(d$authority, "EPSG") && !is.na(d$code)) return(as.integer(d$code))
  .kand_definition(terra::crs(r, proj = TRUE))
}

.crs_fel <- function(r, kod) {
  tillatna <- paste0("EPSG:", paste(TILLATNA_EPSG, collapse = ", "))
  if (!nzchar(terra::crs(r))) return("rastret saknar koordinatsystem")
  if (is.na(kod)) {
    return(sprintf("rastret har ett okänt koordinatsystem (%s). Tillåtna: %s",
                   terra::crs(r, describe = TRUE)$name, tillatna))
  }
  if (!kod %in% TILLATNA_EPSG) {
    return(sprintf("koordinatsystemet EPSG:%d är inte tillåtet. Tillåtna: %s", kod, tillatna))
  }
  NULL
}

#' Sätter rastrets koordinatsystem till ren EPSG-kod. Stoppar för okända eller otillåtna system.
normalisera_crs <- function(r) {
  kod <- epsg_kod(r)
  fel <- .crs_fel(r, kod)
  if (!is.null(fel)) stop(fel, call. = FALSE)
  terra::crs(r) <- paste0("EPSG:", kod)
  r
}

#' Källfilens skala för kontinuerliga värden: 1 (0–1) eller 1000 (0–1000).
#' Regeln står i planens Global Constraints. Stoppar hellre än att gissa.
kalla_skala <- function(min, max, skala_kalla = NA_integer_) {
  rad <- sprintf("min %s, max %s", .tal(min), .tal(max))
  if (!is.na(skala_kalla)) {
    skala_kalla <- as.integer(skala_kalla)
    if (!skala_kalla %in% c(1L, 1000L)) {
      stop(sprintf("skala_kalla måste vara 1 eller 1000, inte %s.", skala_kalla), call. = FALSE)
    }
    grans <- if (skala_kalla == 1L) 1.001 else 1000
    if (min < 0 || max > grans) {
      stop(sprintf("Värdena (%s) ligger utanför 0–%d trots skala_kalla = %d. Kontrollera filen.",
                   rad, skala_kalla, skala_kalla), call. = FALSE)
    }
    return(skala_kalla)
  }
  if (min < 0 || max > 1000) {
    stop(sprintf(paste("Värdena (%s) ligger utanför 0–1000. Sannolikheter ska vara 0–1 eller 0–1000.",
                       "Kontrollera filen, eller ange skala_kalla (1 eller 1000) i katalogen."), rad),
         call. = FALSE)
  }
  if (max <= 1.001) return(1L)
  if (max >= 2) return(1000L)
  stop(sprintf("tvetydig skala (%s): värdena kan vara 0–1 eller 0–1000. Ange skala_kalla (1 eller 1000) i katalogen.",
               rad), call. = FALSE)
}

# Har filen ett användbart nodata-värde? Flyttal klarar sig med NaN, heltal behöver ett tal.
.saknar_nodata <- function(sokvag, r) {
  if (!startsWith(terra::datatype(r)[1], "INT")) return(FALSE)
  rad <- grep("NoData Value=", terra::describe(sokvag), value = TRUE, fixed = TRUE)
  if (length(rad) == 0) return(TRUE)
  varde <- suppressWarnings(as.numeric(sub(".*NoData Value=", "", rad[1])))
  is.na(varde)
}

#' Kontrollerar en rasterfil inför publicering. Ger svenska felmeddelanden som börjar med
#' filens sökväg, eller `character(0)`. Läser värden blockvis (global, unique), aldrig hela rastret.
validera_raster <- function(sokvag, roll = c("klassad", "kontinuerlig"), klasser = NULL,
                            skala_kalla = NA_integer_) {
  .kontrollera_raster(sokvag, match.arg(roll), klasser, skala_kalla)$fel
}

# Gör kontrollerna och returnerar även min och max, så att skriv_cog() slipper läsa rastret en gång till.
.kontrollera_raster <- function(sokvag, roll, klasser, skala_kalla) {
  med_namn <- function(fel, min = NA_real_, max = NA_real_) {
    list(fel = if (length(fel)) paste0(sokvag, ": ", fel) else character(0), min = min, max = max)
  }
  if (!file.exists(sokvag)) return(med_namn("hittar inte filen"))
  r <- tryCatch(terra::rast(sokvag), error = function(e) NULL)
  if (is.null(r)) return(med_namn("filen går inte att läsa som raster"))
  if (terra::nlyr(r) != 1) {
    return(med_namn(sprintf("rastret har %d lager men ska ha ett", terra::nlyr(r))))
  }

  fel <- character(0)
  crs_fel <- .crs_fel(r, epsg_kod(r))
  if (!is.null(crs_fel)) fel <- c(fel, crs_fel)
  if (.saknar_nodata(sokvag, r)) {
    fel <- c(fel, "rastret saknar nodata-värde, så tomma celler går inte att skilja från data")
  }

  mm <- terra::global(r, c("min", "max"), na.rm = TRUE)
  if (!is.finite(mm$min) || !is.finite(mm$max)) {
    return(med_namn(c(fel, "rastret innehåller inga giltiga värden (bara nodata)")))
  }

  if (roll == "klassad") {
    if (is.null(klasser)) klasser <- tolka_klasser(NA_character_)
    u <- terra::unique(r)[[1]]
    okanda <- setdiff(u, klasser$varde)
    if (length(okanda)) {
      fel <- c(fel, sprintf("rastret innehåller %s %s, som inte finns bland klasserna (%s)",
                            if (length(okanda) == 1) "värdet" else "värdena",
                            paste(.tal(utils::head(okanda, 10)), collapse = ", "),
                            paste(klasser$varde, collapse = ", ")))
    }
  } else {
    skala <- tryCatch(kalla_skala(mm$min, mm$max, skala_kalla), error = function(e) conditionMessage(e))
    if (is.character(skala)) fel <- c(fel, skala)
  }
  med_namn(fel, mm$min, mm$max)
}
