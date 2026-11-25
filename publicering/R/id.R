#' Skapa ett id (slug) av fri text
#'
#' Gemener, ASCII, siffror och bindestreck. Svenska tecken skrivs om (å -> a, ö -> o).
skapa_id <- function(text) {
  x <- stringi::stri_trans_nfc(as.character(text))
  # Storleksklasser som "Torsk <20 cm" och "Torsk >20 cm" ska inte få samma id
  x <- gsub("<", " under ", gsub(">", " over ", x, fixed = TRUE), fixed = TRUE)
  x <- stringi::stri_trans_general(x, "Latin-ASCII")
  x <- tolower(x)
  x <- gsub("[^a-z0-9]+", "-", x)
  gsub("^-+|-+$", "", x)
}
