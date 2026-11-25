#' Klasser som används när kolumnen klasser är tom
STANDARDKLASSER <- "5=Viktigt;10=Mycket viktigt"

#' Kolumner som måste vara ifyllda för en karta som publiceras
KRAVDA_KOLUMNER <- c("id", "titel", "projekt", "kalla", "citering", "ar", "licens",
                     "kontakt", "sprak", "farg")

.tom <- function(x) length(x) == 0 || is.na(x) || !nzchar(trimws(x))

#' Tolkar klasstexten "5=Viktigt;10=Mycket viktigt" till en tabell, sorterad efter värde.
#' `ofargade` är en lista med värden (";" eller ",") som visas utan färg.
tolka_klasser <- function(text, ofargade = NA_character_) {
  if (.tom(text)) text <- STANDARDKLASSER
  delar <- trimws(strsplit(text, ";", fixed = TRUE)[[1]])
  delar <- delar[nzchar(delar)]
  m <- regmatches(delar, regexec("^([0-9]+)\\s*=\\s*(.*\\S)\\s*$", delar))
  if (length(delar) == 0 || any(lengths(m) != 3)) {
    stop(sprintf("Kan inte tolka klasserna '%s'. Skriv dem som %s.", text, STANDARDKLASSER),
         call. = FALSE)
  }
  varde <- as.integer(vapply(m, `[`, "", 2))
  namn <- vapply(m, `[`, "", 3)
  if (any(varde > 254)) {
    stop(sprintf("Klassvärden måste ligga mellan 0 och 254 ('%s').", text), call. = FALSE)
  }
  if (anyDuplicated(varde)) {
    stop(sprintf("Ett klassvärde förekommer flera gånger i '%s'.", text), call. = FALSE)
  }
  ofarg <- integer(0)
  if (!.tom(ofargade)) {
    ofarg <- suppressWarnings(as.integer(trimws(strsplit(ofargade, "[;,]")[[1]])))
    if (anyNA(ofarg) || !all(ofarg %in% varde)) {
      stop(sprintf("ofargade_klasser ('%s') måste vara värden som finns bland klasserna ('%s').",
                   ofargade, text), call. = FALSE)
    }
  }
  ordning <- order(varde)
  data.frame(varde = varde[ordning], namn = namn[ordning], farg = !varde[ordning] %in% ofarg,
             stringsAsFactors = FALSE)
}

#' Kontrollerar en katalograd (en rad från `las_katalog()`).
#' Ger svenska felmeddelanden, eller `character(0)` när raden är i ordning.
#' Dolda rader utan filer kontrolleras inte, de publiceras aldrig.
validera_rad <- function(rad, filrot) {
  stopifnot(is.data.frame(rad), nrow(rad) == 1)
  v <- function(k) rad[[k]][[1]]
  har_filer <- !.tom(v("fil_klassad")) || !.tom(v("fil_kontinuerlig"))
  if (!isTRUE(v("visas")) && !har_filer) return(character(0))

  fel <- character(0)
  for (k in KRAVDA_KOLUMNER) {
    if (.tom(as.character(v(k)))) fel <- c(fel, sprintf("%s saknas", k))
  }
  id <- v("id")
  if (!.tom(id) && !grepl("^[a-z0-9]+(-[a-z0-9]+)*$", id)) {
    fel <- c(fel, sprintf(
      "id får bara innehålla små bokstäver a–z, siffror och enkla bindestreck, inte '%s' (förslag: %s)",
      id, skapa_id(id)))
  }
  ar <- v("ar")
  if (!is.na(ar) && (ar < 1900 || ar > 2100)) fel <- c(fel, sprintf("ar måste ligga mellan 1900 och 2100, inte %s", ar))
  sprak <- v("sprak")
  if (!.tom(sprak) && !sprak %in% c("sv", "en")) fel <- c(fel, sprintf("sprak måste vara sv eller en, inte '%s'", sprak))
  skala <- v("skala_kalla")
  if (!.tom(skala) && !trimws(skala) %in% c("1", "1000")) {
    fel <- c(fel, sprintf("skala_kalla måste vara 1 eller 1000, inte '%s'", skala))
  }
  if (.tom(v("fil_klassad"))) fel <- c(fel, "fil_klassad saknas")
  for (k in c("fil_klassad", "fil_kontinuerlig")) {
    f <- v(k)
    if (!.tom(f)) {
      sokvag <- file.path(filrot, f)
      if (!file.exists(sokvag)) fel <- c(fel, sprintf("%s: hittar inte filen %s", k, sokvag))
    }
  }
  klasser <- tryCatch(tolka_klasser(v("klasser"), v("ofargade_klasser")),
                      error = function(e) conditionMessage(e))
  if (is.character(klasser)) fel <- c(fel, klasser)

  if (length(fel) == 0) return(character(0))
  paste0(if (.tom(id)) "(rad utan id)" else id, ": ", fel)
}
