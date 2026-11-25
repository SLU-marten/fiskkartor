#' Kolumnerna i katalogtabellen, i fast ordning
KATALOG_KOLUMNER <- c(
  "id", "titel", "projekt", "kalla", "citering", "ar", "kvalitet", "licens", "kontakt",
  "sprak", "doi", "visas", "fil_klassad", "fil_kontinuerlig", "skala_kalla", "klasser",
  "ofargade_klasser", "enhet", "farg", "art", "vetenskapligt_namn", "livsstadium",
  "havsomrade", "omrade", "rodlista", "fiskbarometern", "simblasa", "livsmiljo"
)

.text_kolumn <- function(x) {
  x <- as.character(x)
  x <- stringi::stri_trans_nfc(trimws(x))
  x[!is.na(x) & x == ""] <- NA_character_
  x
}

.tolka_visas <- function(x, rader) {
  v <- tolower(x)
  res <- rep(NA, length(v))
  res[v %in% c("ja", "true", "sant")] <- TRUE
  res[v %in% c("nej", "false", "falskt")] <- FALSE
  fel <- !is.na(v) & is.na(res)
  if (any(fel)) {
    stop(sprintf("Okänt värde i kolumnen visas på rad %s: '%s'. Använd ja eller nej.",
                 paste(rader[fel], collapse = ", "), paste(x[fel], collapse = "', '")),
         call. = FALSE)
  }
  res[is.na(res)] <- FALSE
  res
}

#' Läs katalogtabellen (Excel) och städa cellerna
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
  ar_num <- suppressWarnings(as.numeric(df$ar))
  felar <- !is.na(df$ar) & (is.na(ar_num) | ar_num != round(ar_num))
  if (any(felar)) {
    stop(sprintf("Kolumnen ar måste vara ett heltal (rad %s).", paste(excelrad[felar], collapse = ", ")),
         call. = FALSE)
  }
  df$ar <- as.integer(round(ar_num))
  df$visas <- .tolka_visas(df$visas, excelrad)
  for (k in c("fil_klassad", "fil_kontinuerlig")) df[[k]] <- gsub("\\\\", "/", df[[k]])
  rownames(df) <- NULL
  attr(df, "excelrad") <- excelrad
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
  df$visas <- ifelse(df$visas, "ja", "nej")
  rader <- c(paste(names(df), collapse = ";"),
             do.call(paste, c(lapply(df, .csv_falt), sep = ";")))
  sokvag <- file.path(dirname(sokvag_xlsx), "katalog.csv")
  con <- file(sokvag, open = "wb")
  on.exit(close(con))
  writeBin(as.raw(c(0xEF, 0xBB, 0xBF)), con)
  writeBin(charToRaw(enc2utf8(paste0(paste(rader, collapse = "\n"), "\n"))), con)
  sokvag
}
