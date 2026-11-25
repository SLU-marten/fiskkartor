# Gamla kolumner i Shiny-appens metadata.xlsx -> nya katalogkolumner
.MIGRERING <- c(name = "art", map_name = "titel", lat_name = "vetenskapligt_namn",
                lifestage = "livsstadium", sea = "havsomrade", area = "omrade", year = "ar",
                source = "kalla", citation = "citering", uncert = "kvalitet", iucn = "rodlista",
                fiskbarom = "fiskbarometern", sw_bl = "simblasa", hab = "livsmiljo")

.PBS_KLASSER <- "0=Ej viktigt område;5=Viktigt;10=Mycket viktigt"

#' Gör om den gamla appens metadata.xlsx till den nya katalogen. Filvägar blir relativa till
#' mappen "Vindkraft lst". `standard` ger licens, kontakt och färgskala för alla rader;
#' kontakt måste anges.
migrera_metadata <- function(gammal_xlsx, standard = list(licens = "CC BY 4.0")) {
  standard <- utils::modifyList(list(licens = "CC BY 4.0", farg = "YlGnBu"), standard)
  if (.tom(standard$kontakt)) {
    stop("Ange kontakt i standard, t.ex. list(kontakt = \"SLU-Aqua-fiskkartor@slu.se\").", call. = FALSE)
  }
  g <- as.data.frame(readxl::read_excel(gammal_xlsx, col_types = "text"), stringsAsFactors = FALSE)
  g[] <- lapply(g, function(x) {
    x <- stringi::stri_trans_nfc(trimws(x))
    x[!is.na(x) & (x == "" | x == "NA")] <- NA_character_
    x
  })

  df <- as.data.frame(matrix(NA_character_, nrow(g), length(KATALOG_KOLUMNER),
                             dimnames = list(NULL, KATALOG_KOLUMNER)), stringsAsFactors = FALSE)
  for (gam in names(.MIGRERING)) df[[.MIGRERING[[gam]]]] <- g[[gam]]
  df$titel <- gsub("\\s+", " ", df$titel)
  df$ar <- as.integer(df$ar)
  df$id <- skapa_id(paste(df$titel, df$ar))
  df$licens <- standard$licens
  df$kontakt <- standard$kontakt
  df$farg <- standard$farg

  kalla <- ifelse(is.na(df$kalla), "", df$kalla)
  pbs <- kalla == "PanBalticScope"
  nmk <- startsWith(kalla, "Nationell marin kartering")
  tral <- kalla == "Nationell marin kartering (Trål)"
  ryssja_yngel <- nmk & !tral
  df$visas <- !is.na(df$kalla)
  df$projekt[nmk] <- "NMK"
  df$projekt[pbs] <- "PanBalticScope"
  df$sprak <- ifelse(pbs, "en", "sv")

  relativ <- sub("^data/", "", g$filepath)
  df$fil_klassad[ryssja_yngel | pbs] <- paste0("Data not in app/data/data/", relativ[ryssja_yngel | pbs])
  df$fil_kontinuerlig[ryssja_yngel] <- paste0("Data not in app/data/", relativ[ryssja_yngel])
  stam <- sub("_vuxen_V$", "", g$rst_name)
  df$fil_klassad[tral] <- paste0("Data not in app/data/data/rst/NMK Trål/", stam[tral], ".tif")
  df$fil_kontinuerlig[tral] <- paste0("Data not in app/data/rst/NMK Trål/r/", stam[tral], ".tif")
  df$skala_kalla[nmk & !is.na(df$fil_kontinuerlig)] <- "1000"
  df$klasser[pbs] <- .PBS_KLASSER
  df$ofargade_klasser[pbs] <- "0"

  dold <- !df$visas
  df$fil_klassad[dold] <- NA_character_
  df$fil_kontinuerlig[dold] <- NA_character_
  df$skala_kalla[dold] <- NA_character_

  okand <- df$visas & !(pbs | nmk)
  if (any(okand)) {
    stop(sprintf("Okänd källa på rad %s: %s", paste(which(okand) + 1L, collapse = ", "),
                 paste(unique(df$kalla[okand]), collapse = ", ")), call. = FALSE)
  }
  df
}
