#' Ett publiceringsmål i en lokal mapp (dataträdet som sedan skickas med skicka_data()).
mal_lokal <- function(mapp) list(typ = "lokal", mapp = mapp)

.FALT_KOLUMNER <- c("art", "vetenskapligt_namn", "livsstadium", "havsomrade", "omrade", "rodlista",
                    "fiskbarometern", "simblasa", "livsmiljo")

.json_sokvag <- function(mal) file.path(mal$mapp, "katalog", "katalog.json")

.till_json <- function(x) {
  jsonlite::toJSON(x, auto_unbox = TRUE, pretty = TRUE, null = "null", na = "null", digits = NA)
}

# Skriver JSON via en tillfällig fil, så att en avbruten körning aldrig lämnar en halv fil.
.skriv_json <- function(x, sokvag) {
  dir.create(dirname(sokvag), recursive = TRUE, showWarnings = FALSE)
  tmp <- paste0(sokvag, ".tmp")
  jsonlite::write_json(x, tmp, auto_unbox = TRUE, pretty = TRUE, null = "null", na = "null", digits = NA)
  if (!file.rename(tmp, sokvag)) stop(sprintf("Kunde inte skriva %s", sokvag), call. = FALSE)
  invisible(sokvag)
}

.las_kartor <- function(mal) {
  f <- .json_sokvag(mal)
  if (!file.exists(f)) return(list())
  kartor <- jsonlite::read_json(f, simplifyVector = FALSE)$kartor
  names(kartor) <- vapply(kartor, function(k) k$id, "")
  kartor
}

.skriv_katalog_json <- function(kartor, mal) {
  kartor <- kartor[order(as.character(names(kartor)), method = "radix")]
  .skriv_json(list(schemaVersion = 1L,
                   genererad = format(Sys.time(), "%Y-%m-%dT%H:%M:%SZ", tz = "UTC"),
                   kartor = unname(kartor)),
              .json_sokvag(mal))
}

.hitta_rad <- function(df, id, katalog) {
  rader <- df[!is.na(df$id) & df$id == id, , drop = FALSE]
  if (nrow(rader) == 0) stop(sprintf("Kartan '%s' finns inte i katalogen %s.", id, katalog), call. = FALSE)
  if (nrow(rader) > 1) stop(sprintf("id '%s' förekommer %d gånger i katalogen.", id, nrow(rader)), call. = FALSE)
  rader
}

.klasser_json <- function(kl) {
  lapply(seq_len(nrow(kl)), function(i) list(varde = kl$varde[i], namn = kl$namn[i], farg = kl$farg[i]))
}

.fil_post <- function(rel, cog, vy3006 = NULL) {
  c(list(fil = rel, sha256 = cog$sha256, kallaSha256 = cog$kallaSha256, bytes = cog$bytes,
         epsg = cog$epsg, upplosning = cog$upplosning),
    if (!is.null(vy3006)) list(vy3006 = vy3006))
}

# Kartor i andra koordinatsystem får en visningskopia i SWEREF 99 TM bredvid originalet
# (visning.tif -> visning_3006.tif), med halva den minsta cellstorleken så att ingen cell försvinner.
# Nedladdningen är alltid originalet.
.vy3006 <- function(cog, mapp, rel, fil, roll) {
  if (cog$epsg == 3006L) return(NULL)
  kopia <- sub("\\.tif$", "_3006.tif", fil)
  upp <- .upplosning_vy3006(terra::rast(file.path(mapp, fil)), cog$epsg)
  vy <- .skriv_vy3006(file.path(mapp, fil), file.path(mapp, kopia), roll, upp)
  list(fil = paste(rel, kopia, sep = "/"), sha256 = vy$sha256, bytes = vy$bytes)
}

.enhet <- function(rad) if (is.na(rad$enhet)) "sannolikhet" else rad$enhet

.karta_post <- function(rad, kartmapp, versioner, aktuell, visas) {
  falt <- lapply(.FALT_KOLUMNER, function(k) rad[[k]][[1]])
  names(falt) <- .FALT_KOLUMNER
  list(id = rad$id, titel = rad$titel, projekt = rad$projekt, kalla = rad$kalla,
       citering = rad$citering, ar = rad$ar, kvalitet = rad$kvalitet, licens = rad$licens,
       kontakt = rad$kontakt, sprak = rad$sprak, doi = rad$doi, farg = rad$farg, visas = visas,
       metadata = paste(kartmapp, "metadata.json", sep = "/"), falt = falt,
       aktuellVersion = aktuell, versioner = versioner)
}

# Skriver kartfilerna för en ny version och returnerar versionens post.
.skriv_version <- function(n, rad, kartmapp, kallor, klasser, mal, idag) {
  rel <- paste(kartmapp, paste0("v", n), sep = "/")
  mapp <- file.path(mal$mapp, rel)
  if (dir.exists(mapp)) {
    # En mapp som metadata.json pekar på är publicerad och får aldrig skrivas om.
    meta <- file.path(mal$mapp, kartmapp, "metadata.json")
    publicerade <- if (file.exists(meta)) {
      vapply(jsonlite::read_json(meta)$versioner, function(v) as.integer(v$version), 1L)
    } else integer(0)
    if (n %in% publicerade) {
      stop(sprintf(paste("%s: %s är redan publicerad men saknas i katalog.json. Dataträdet verkar",
                         "ofullständigt: kör hamta_data() i en ny mapp och publicera där."), rad$id, rel),
           call. = FALSE)
    }
    message(sprintf("%s: tar bort %s från en avbruten körning", rad$id, rel))
    unlink(mapp, recursive = TRUE)
  }
  klar <- FALSE
  on.exit(if (!klar) unlink(mapp, recursive = TRUE), add = TRUE)

  k <- skriv_cog(kallor[["klassad"]], file.path(mapp, "visning.tif"), "klassad", klasser = klasser)
  vy_k <- .vy3006(k, mapp, rel, "visning.tif", "klassad")
  kontinuerlig <- NULL
  if (!is.na(kallor[["kontinuerlig"]])) {
    radata <- file.path(mapp, "radata.tif")
    skala <- if (is.na(rad$skala_kalla)) NA_integer_ else as.integer(rad$skala_kalla)
    c1 <- skriv_cog(kallor[["kontinuerlig"]], radata, "kontinuerlig", skala_kalla = skala)
    st <- statistik(radata, "kontinuerlig")
    kontinuerlig <- c(.fil_post(paste(rel, "radata.tif", sep = "/"), c1,
                                .vy3006(c1, mapp, rel, "radata.tif", "kontinuerlig")),
                      list(skala = 1000L, enhet = .enhet(rad), min = st$min, max = st$max,
                           p2 = st$p2, p98 = st$p98))
  }
  klar <- TRUE
  list(version = n, publicerad = format(idag, "%Y-%m-%d"), format = .cog_format(),
       klassad = c(.fil_post(paste(rel, "visning.tif", sep = "/"), k, vy_k),
                   list(klasser = .klasser_json(klasser))),
       kontinuerlig = kontinuerlig)
}

# Publicerar en rad mot kartorna i katalog.json. Skriver kartfiler och metadata.json,
# men inte katalog.json. Returnerar uppdaterade kartor, status, version och om något ändrats.
.publicera_rad <- function(rad, kartor, filrot, mal, idag) {
  id <- rad$id
  svar <- function(status, version, andrad = FALSE) {
    list(kartor = kartor, status = status, version = version, andrad = andrad)
  }
  gammal <- if (!is.na(id) && id %in% names(kartor)) kartor[[id]] else NULL

  # En trasig cell (t.ex. tom visas) stoppar raden: kartan ska varken döljas eller visas av misstag.
  cellfel <- if ("cellfel" %in% names(rad)) rad$cellfel[[1]] else NA_character_
  if (!is.na(cellfel) || is.na(rad$visas)) {
    stop(paste(c(sprintf("Kan inte publicera %s:", id), validera_rad(rad, filrot)), collapse = "\n"),
         call. = FALSE)
  }

  if (!isTRUE(rad$visas)) {
    if (is.null(gammal)) return(svar("dold", NA_integer_))
    if (isFALSE(gammal$visas)) return(svar("dold", gammal$aktuellVersion))
    gammal$visas <- FALSE
    kartor[[id]] <- gammal
    .skriv_json(gammal, file.path(mal$mapp, gammal$metadata))
    return(svar("dold", gammal$aktuellVersion, andrad = TRUE))
  }

  fel <- validera_rad(rad, filrot)
  if (length(fel)) stop(paste(c(sprintf("Kan inte publicera %s:", id), fel), collapse = "\n"), call. = FALSE)
  klasser <- tolka_klasser(rad$klasser, rad$ofargade_klasser)
  kallor <- c(klassad = .hitta_fil(filrot, rad$fil_klassad),
              kontinuerlig = if (is.na(rad$fil_kontinuerlig)) NA_character_ else .hitta_fil(filrot, rad$fil_kontinuerlig))
  sha <- vapply(kallor, function(f) if (is.na(f)) NA_character_ else digest::digest(file = f, algo = "sha256"), "")

  # Kartmappen följer den första publiceringen, så att länkar och filer ligger still om projektet byter namn.
  kartmapp <- if (is.null(gammal)) paste("kartor", skapa_id(rad$projekt), id, sep = "/") else dirname(gammal$metadata)
  if (is.null(gammal) && file.exists(file.path(mal$mapp, kartmapp, "metadata.json"))) {
    stop(sprintf(paste("%s: kartan finns i dataträdet (%s/metadata.json) men inte i katalog.json. Dataträdet",
                       "verkar ofullständigt: kör hamta_data() i en ny mapp och publicera där."), id, kartmapp),
         call. = FALSE)
  }
  versioner <- if (is.null(gammal)) list() else gammal$versioner
  nummer <- vapply(versioner, function(v) as.integer(v$version), 1L)

  ny_version <- TRUE
  if (!is.null(gammal)) {
    i <- which(nummer == gammal$aktuellVersion)
    akt <- versioner[[i]]
    akt_sha <- c(akt$klassad$kallaSha256,
                 if (is.null(akt$kontinuerlig)) NA_character_ else akt$kontinuerlig$kallaSha256)
    # Ett äldre filformat ger en ny version även om källan är oförändrad (publicerade filer skrivs aldrig om).
    if (identical(unname(sha), akt_sha) && .version_format(akt) >= .cog_format()) {
      ny_version <- FALSE
      # Klassnamn och enhet är text: de följer katalogen utan ny version. Ändrade klassvärden eller
      # färgval styr vad som ritas och kontrolleras därför mot rastret först.
      fore <- akt$klassad$klasser
      samma_varden <- length(fore) == nrow(klasser) &&
        identical(vapply(fore, function(k) as.integer(k$varde), 1L), klasser$varde) &&
        identical(vapply(fore, function(k) isTRUE(k$farg), TRUE), klasser$farg)
      if (!samma_varden) {
        fel <- validera_raster(kallor[["klassad"]], "klassad", klasser)
        if (length(fel)) {
          stop(paste(c(sprintf("Kan inte publicera %s med de nya klasserna:", id), fel), collapse = "\n"),
               call. = FALSE)
        }
      }
      versioner[[i]]$klassad$klasser <- .klasser_json(klasser)
      if (!is.null(akt$kontinuerlig)) versioner[[i]]$kontinuerlig$enhet <- .enhet(rad)
    }
  }

  if (ny_version) {
    n <- if (length(nummer)) max(nummer) + 1L else 1L
    versioner <- c(versioner, list(.skriv_version(n, rad, kartmapp, kallor, klasser, mal, idag)))
    status <- "publicerad"
  } else {
    n <- gammal$aktuellVersion
    status <- "uppdaterad"
  }

  ny <- .karta_post(rad, kartmapp, versioner, n, visas = TRUE)
  if (!ny_version && identical(.till_json(ny), .till_json(gammal))) return(svar("oförändrad", n))
  kartor[[id]] <- ny
  .skriv_json(ny, file.path(mal$mapp, ny$metadata))
  svar(status, n, andrad = TRUE)
}

#' Publicerar en karta ur katalogen till målet. Kartfiler skrivs först, sedan metadata.json och
#' sist katalog.json. En publicerad .tif skrivs aldrig över: en ändrad källfil ger en ny version.
publicera <- function(id, katalog = "katalog/katalog.xlsx", filrot = ".", mal, idag = Sys.Date()) {
  df <- las_katalog(katalog)
  exportera_csv(katalog)
  rad <- .hitta_rad(df, id, katalog)
  res <- .publicera_rad(rad, .las_kartor(mal), filrot, mal, idag)
  if (res$andrad || !file.exists(.json_sokvag(mal))) .skriv_katalog_json(res$kartor, mal)
  invisible(list(id = id, version = res$version, status = res$status))
}

#' Publicerar alla rader i katalogen. Stannar aldrig på en trasig rad: den får status "fel"
#' och ett meddelande. katalog.json skrivs en gång, sist.
publicera_alla <- function(katalog = "katalog/katalog.xlsx", filrot = ".", mal, idag = Sys.Date()) {
  df <- las_katalog(katalog)
  exportera_csv(katalog)
  kartor <- .las_kartor(mal)
  saknas <- setdiff(names(kartor), df$id)
  andrad <- FALSE
  ut <- data.frame(id = df$id, status = NA_character_, meddelande = "", stringsAsFactors = FALSE)
  dubbletter <- unique(df$id[!is.na(df$id) & duplicated(df$id)])
  for (i in seq_len(nrow(df))) {
    rad <- df[i, , drop = FALSE]
    res <- if (!is.na(rad$id) && rad$id %in% dubbletter) {
      simpleError(sprintf("id '%s' förekommer flera gånger i katalogen", rad$id))
    } else {
      tryCatch(.publicera_rad(rad, kartor, filrot, mal, idag), error = function(e) e)
    }
    if (inherits(res, "error")) {
      ut$status[i] <- "fel"
      ut$meddelande[i] <- conditionMessage(res)
    } else {
      kartor <- res$kartor
      andrad <- andrad || res$andrad
      ut$status[i] <- res$status
    }
    message(sprintf("%s: %s", if (is.na(rad$id)) "(rad utan id)" else rad$id, ut$status[i]))
  }
  if (andrad || !file.exists(.json_sokvag(mal))) .skriv_katalog_json(kartor, mal)
  # Kartor som tagits bort ur Excel ligger kvar i katalogen (länkar och citeringar ska fungera).
  if (length(saknas)) {
    attr(ut, "saknas_i_excel") <- saknas
    warning(sprintf("kartor som finns i katalog.json men inte i Excel: %s", paste(saknas, collapse = ", ")),
            call. = FALSE)
  }
  ut
}
