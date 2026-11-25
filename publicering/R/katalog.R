#' Kolumnerna i katalogtabellen, i fast ordning
KATALOG_KOLUMNER <- c(
  "id", "titel", "projekt", "kalla", "citering", "ar", "kvalitet", "licens", "kontakt",
  "sprak", "doi", "visas", "fil_klassad", "fil_kontinuerlig", "skala_kalla", "klasser",
  "ofargade_klasser", "enhet", "farg", "art", "vetenskapligt_namn", "livsstadium",
  "havsomrade", "omrade", "rodlista", "fiskbarometern", "simblasa", "livsmiljo"
)

# Städar en textkolumn: hårda mellanslag blir vanliga, citattecken runt hela cellen tas bort
# (Utforskarens "Kopiera som sökväg" ger "C:\\a\\b.tif"), blanksteg trimmas och texten görs NFC.
.text_kolumn <- function(x) {
  x <- gsub("\u00a0", " ", as.character(x), fixed = TRUE)
  x <- trimws(x)
  x <- sub("^[\"\u201c\u201d](.*)[\"\u201c\u201d]$", "\\1", x)
  x <- stringi::stri_trans_nfc(trimws(x))
  x[!is.na(x) & x == ""] <- NA_character_
  x
}

# visas som TRUE/FALSE. Tomt eller okänt värde ger NA och ett cellfel: en karta ska aldrig döljas
# eller visas av misstag.
.tolka_visas <- function(x) {
  v <- tolower(x)
  res <- rep(NA, length(v))
  res[v %in% c("ja", "true", "sant")] <- TRUE
  res[v %in% c("nej", "false", "falskt")] <- FALSE
  fel <- rep(NA_character_, length(v))
  fel[is.na(v)] <- "visas saknas (ja eller nej)"
  okant <- !is.na(v) & is.na(res)
  fel[okant] <- sprintf("visas måste vara ja eller nej, inte '%s'", x[okant])
  list(varde = res, fel = fel)
}

.lagg_till_fel <- function(fel, nya) {
  ifelse(is.na(nya), fel, ifelse(is.na(fel), nya, paste(fel, nya, sep = "; ")))
}

#' Läs katalogtabellen (Excel) och städa cellerna. Stoppar inte på en trasig cell: kolumnen
#' `cellfel` beskriver felet och validera_rad() rapporterar det för just den raden.
las_katalog <- function(sokvag, flik = "katalog") {
  raw <- readxl::read_excel(sokvag, sheet = flik, col_types = "text")
  df <- as.data.frame(raw, stringsAsFactors = FALSE)
  for (k in setdiff(KATALOG_KOLUMNER, names(df))) df[[k]] <- NA_character_
  df <- df[, KATALOG_KOLUMNER, drop = FALSE]
  for (k in KATALOG_KOLUMNER) df[[k]] <- .text_kolumn(df[[k]])
  excelrad <- seq_len(nrow(df)) + 1L
  tom <- apply(is.na(df), 1, all)
  df <- df[!tom, , drop = FALSE]
  excelrad <- excelrad[!tom]
  ratext <- list(ar = df$ar, visas = df$visas)
  cellfel <- rep(NA_character_, nrow(df))
  ar_num <- suppressWarnings(as.numeric(df$ar))
  felar <- !is.na(df$ar) & (is.na(ar_num) | ar_num != round(ar_num))
  cellfel[felar] <- sprintf("ar måste vara ett heltal, inte '%s'", df$ar[felar])
  ar_num[felar] <- NA
  df$ar <- as.integer(round(ar_num))
  visas <- .tolka_visas(df$visas)
  df$visas <- visas$varde
  cellfel <- .lagg_till_fel(cellfel, visas$fel)
  for (k in c("fil_klassad", "fil_kontinuerlig")) df[[k]] <- gsub("\\\\", "/", df[[k]])
  df$cellfel <- cellfel
  rownames(df) <- NULL
  attr(df, "excelrad") <- excelrad
  attr(df, "ratext") <- ratext
  df
}

#' Skriv katalogtabellen till Excel (flik "katalog")
skriv_katalog <- function(df, sokvag) {
  tab <- df[, KATALOG_KOLUMNER, drop = FALSE]
  tab$visas <- ifelse(tab$visas, "ja", "nej")
  writexl::write_xlsx(list(katalog = tab), sokvag)
  invisible(sokvag)
}

.csv_falt <- function(x) {
  x <- ifelse(is.na(x), "", as.character(x))
  behov <- grepl("[;\"\n\r]", x)
  x[behov] <- paste0("\"", gsub("\"", "\"\"", x[behov]), "\"")
  x
}

#' Exportera katalogen som CSV (UTF-8 med BOM, semikolon) bredvid Excelfilen
exportera_csv <- function(sokvag_xlsx) {
  df <- las_katalog(sokvag_xlsx)
  ratext <- attr(df, "ratext")
  df <- df[, KATALOG_KOLUMNER, drop = FALSE]
  # Ogiltiga värden skrivs som de stod, så att CSV:n visar samma sak som Excelfilen.
  df$visas <- ifelse(is.na(df$visas), ratext$visas, ifelse(df$visas, "ja", "nej"))
  df$ar <- ifelse(is.na(df$ar), ratext$ar, as.character(df$ar))
  rader <- c(paste(names(df), collapse = ";"),
             do.call(paste, c(lapply(df, .csv_falt), sep = ";")))
  sokvag <- file.path(dirname(sokvag_xlsx), "katalog.csv")
  # CSV:n är en kopia för att se ändringar i git. Går den inte att skriva (oftast för att den är
  # öppen i Excel) ska publiceringen ändå gå vidare, med en varning.
  con <- tryCatch(suppressWarnings(file(sokvag, open = "wb")), error = function(e) NULL)
  if (is.null(con)) {
    warning(sprintf("Kunde inte skriva %s. Är filen öppen i Excel? Stäng den och publicera igen.", sokvag),
            call. = FALSE)
    return(invisible(NA_character_))
  }
  on.exit(close(con))
  writeBin(as.raw(c(0xEF, 0xBB, 0xBF)), con)
  writeBin(charToRaw(enc2utf8(paste0(paste(rader, collapse = "\n"), "\n"))), con)
  sokvag
}
