#' Skapa ett id (slug) av fri text
#'
#' Gemener, ASCII, siffror och bindestreck. Svenska tecken skrivs om (å -> a, ö -> o).
skapa_id <- function(text) {
  x <- stringi::stri_trans_nfc(as.character(text))
  x <- stringi::stri_trans_general(x, "Latin-ASCII")
  x <- tolower(x)
  x <- gsub("[^a-z0-9]+", "-", x)
  gsub("^-+|-+$", "", x)
}
