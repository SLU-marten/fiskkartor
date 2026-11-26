# Artsilhuetter och mönster till webbens sidhuvud och meny, gjorda ur Artfaktas bilder.
# Se docs/silhuetter.md. Bildfilerna läggs aldrig i repot, bara det som räknas fram här.

# Katalogens artnamn som har en annan bild. Webben har samma tabell (webb/src/lib/arter.ts).
ART_ALIAS <- c("Hummer" = "Europeisk hummer", "Östersjöflundra" = "Skrubbskädda")

#' Silhuetten i en bild: bakgrunden är det som hänger ihop med kanten och har kantens vanligaste
#' färg (eller är genomskinligt, när kanten är det). Allt annat är arten. Ger bredd, höjd och en SVG-sökväg med y nedåt.
silhuett <- function(fil, tolerans = 0.005) {
  r <- suppressWarnings(terra::rast(fil))
  nr <- terra::nrow(r)
  nc <- terra::ncol(r)
  v <- terra::values(r)
  # En bild har ingen nodata, men en .aux.xml bredvid kan ge 8-bitarsvärdet 255 som NA.
  v[is.na(v)] <- 255
  kant <- unique(c(seq_len(nc), (nr - 1) * nc + seq_len(nc), seq(1, nr * nc, by = nc), seq(nc, nr * nc, by = nc)))
  # Alfakanalen avgör bara när kanten verkligen är genomskinlig; en vit bild som sparats med
  # alfakanal har täckande kant, och då avgör färgen.
  if (ncol(v) >= 4 && any(v[kant, 4] < 40)) {
    bakgrund <- v[, 4] < 40
  } else {
    if (ncol(v) < 3) v <- cbind(v[, 1], v[, 1], v[, 1])
    nyckel <- paste(v[kant, 1], v[kant, 2], v[kant, 3])
    farg <- as.numeric(strsplit(names(which.max(table(nyckel))), " ")[[1]])
    bakgrund <- abs(v[, 1] - farg[1]) < 10 & abs(v[, 2] - farg[2]) < 10 & abs(v[, 3] - farg[3]) < 10
  }
  bakgrund[is.na(bakgrund)] <- TRUE

  # Bara bakgrund som når kanten räknas: en ljus buk inne i fisken hör till fisken.
  p <- terra::values(terra::patches(.bildraster(nr, nc, ifelse(bakgrund, 1L, NA_integer_)), directions = 4))[, 1]
  ytter <- stats::na.omit(unique(p[kant]))
  fisk <- !(!is.na(p) & p %in% ytter)

  # Öppna masken (bort med enstaka bildpunkter) och behåll delar som är minst 2 % av den största.
  m <- .bildraster(nr, nc, as.integer(fisk))
  m <- terra::focal(m, w = 3, fun = "min", fillvalue = 0)
  m <- terra::focal(m, w = 3, fun = "max", fillvalue = 0)
  delar <- terra::values(terra::patches(terra::classify(m, cbind(0, NA)), directions = 8))[, 1]
  storlek <- table(delar)
  behall <- as.integer(names(storlek)[storlek >= 0.02 * max(storlek)])
  m <- .bildraster(nr, nc, ifelse(delar %in% behall, 1L, NA_integer_))

  e <- terra::ext(terra::trim(m))
  pol <- terra::as.polygons(m, dissolve = TRUE)
  w <- as.integer(round(e$xmax - e$xmin))
  h <- as.integer(round(e$ymax - e$ymin))
  pol <- terra::simplifyGeom(pol, tolerance = tolerans * w)
  g <- terra::geom(pol)
  g <- g[g[, "hole"] == 0, , drop = FALSE]
  delar <- split(as.data.frame(g), list(g[, "geom"], g[, "part"]), drop = TRUE)
  d <- vapply(delar, function(del) {
    x <- round(del$x - e$xmin)
    y <- round(e$ymax - del$y)
    n <- length(x)
    if (n > 1 && x[1] == x[n] && y[1] == y[n]) { x <- x[-n]; y <- y[-n] }
    paste0("M", paste(x, y, collapse = " L"), "Z")
  }, "")
  list(w = w, h = h, d = paste(d, collapse = " "))
}

# Ett raster med en cell per bildpunkt, rad 1 överst.
.bildraster <- function(nr, nc, varden) {
  terra::rast(nrows = nr, ncols = nc, xmin = 0, xmax = nc, ymin = 0, ymax = nr, vals = varden)
}

#' Silhuetter för alla bilder i en mapp, nycklade på filnamnet utan ändelse (NFC). Filnamn med
#' "#U00e4" och liknande (från zip-filer) avkodas till bokstäver.
silhuetter <- function(mapp) {
  filer <- list.files(mapp, pattern = "\\.(png|jpe?g)$", ignore.case = TRUE, full.names = TRUE)
  namn <- tools::file_path_sans_ext(basename(filer))
  namn <- vapply(namn, function(n) {
    while (grepl("#U([0-9A-Fa-f]{4})", n)) {
      kod <- regmatches(n, regexpr("#U([0-9A-Fa-f]{4})", n))
      n <- sub(kod, intToUtf8(strtoi(substr(kod, 3, 6), 16L)), n, fixed = TRUE)
    }
    stringi::stri_trans_nfc(n)
  }, "", USE.NAMES = FALSE)
  s <- lapply(filer, silhuett)
  names(s) <- namn
  s[order(namn)]
}

# Samma regel som webben: trimma, ta delen före "/", översätt via ART_ALIAS och jämför utan skiftläge.
.artnyckel <- function(art, nycklar) {
  if (is.null(art) || is.na(art)) return(NA_character_)
  a <- trimws(strsplit(trimws(art), "/", fixed = TRUE)[[1]][1])
  if (is.na(a) || a == "") return(NA_character_)
  traff <- which(stringi::stri_trans_tolower(names(ART_ALIAS)) == stringi::stri_trans_tolower(a))
  if (length(traff)) a <- ART_ALIAS[[traff[1]]]
  i <- which(stringi::stri_trans_tolower(nycklar) == stringi::stri_trans_tolower(a))
  if (length(i)) nycklar[i[1]] else NA_character_
}

#' Arterna i katalogen (falt.art) som inte har någon silhuett.
saknade_arter <- function(s, katalog_json) {
  k <- jsonlite::read_json(katalog_json, simplifyVector = FALSE)$kartor
  arter <- unique(unlist(lapply(k, function(x) x$falt$art)))
  arter[is.na(vapply(arter, .artnyckel, "", nycklar = names(s)))]
}

# Kör f med ett fast frö utan att röra anroparens slumptal.
.med_fro <- function(fro, f) {
  har <- exists(".Random.seed", envir = globalenv(), inherits = FALSE)
  if (har) gammal <- get(".Random.seed", envir = globalenv())
  on.exit(if (har) assign(".Random.seed", gammal, envir = globalenv()) else rm(".Random.seed", envir = globalenv()))
  set.seed(fro)
  f()
}

.plats <- function(art, f, x, y, langd, spegel, vinkel) {
  sk <- langd / f$w
  list(art = art, x = x, y = y, sk = sk, w = f$w * sk, h = f$h * sk, spegel = spegel, vinkel = vinkel)
}

.svg <- function(platser, s, bredd, hojd, upprepa = FALSE) {
  vagar <- unlist(lapply(platser, function(p) {
    f <- s[[p$art]]
    forskj <- if (upprepa) c(0, -bredd, bredd) else 0
    vapply(forskj, function(dx) {
      if (p$x + dx + p$w < 0 || p$x + dx > bredd) return(NA_character_)
      sprintf('<path d="%s" transform="translate(%.1f %.1f) rotate(%.1f) scale(%.4f %.4f) translate(%d %d)"/>',
              f$d, p$x + dx + p$w / 2, p$y + p$h / 2, p$vinkel, if (p$spegel) -p$sk else p$sk, p$sk,
              -round(f$w / 2), -round(f$h / 2))
    }, "")
  }))
  vagar <- vagar[!is.na(vagar)]
  paste0('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ', bredd, " ", hojd, '" width="', bredd,
         '" height="', hojd, '"><g fill="#ffffff" fill-opacity="0.075">', paste(vagar, collapse = ""), "</g></svg>")
}

#' Remsan till sidhuvudet: 1440 x 144, upprepas i sidled. En torsk ligger alltid under namnet.
monster_sidhuvud <- function(s, arter, fro = 7L) {
  bredd <- 1440
  hojd <- 144
  arter <- arter[arter %in% names(s)]
  platser <- .med_fro(fro, function() {
    platser <- list()
    rutor <- list()
    lagg <- function(p) {
      platser[[length(platser) + 1]] <<- p
      rutor[[length(rutor) + 1]] <<- c(p$x - 4, p$y - 3, p$x + p$w + 4, p$y + p$h + 3)
    }
    krockar <- function(r) {
      for (q in rutor) for (dx in c(0, -bredd, bredd)) {
        if (!(r[3] < q[1] + dx || r[1] > q[3] + dx || r[4] < q[2] || r[2] > q[4])) return(TRUE)
      }
      FALSE
    }
    if ("Torsk" %in% names(s)) {
      t <- s[["Torsk"]]
      lagg(.plats("Torsk", t, 168, 106 - t$h * (165 / t$w) / 2, 165, FALSE, -3))
    }
    ordning <- if (length(arter) > 1) sample(arter) else arter
    i <- 0
    forsok <- 0
    while (length(ordning) && forsok < 20000 && length(platser) < 35) {
      forsok <- forsok + 1
      a <- ordning[(i %% length(ordning)) + 1]
      f <- s[[a]]
      langd <- if (f$w / f$h > 1.6) stats::runif(1, 70, 130) else stats::runif(1, 42, 70)
      w <- langd
      h <- f$h * langd / f$w
      x <- stats::runif(1, -w / 2, bredd - w / 2)
      y <- stats::runif(1, -h * 0.3, hojd - h * 0.7)
      if (krockar(c(x - 4, y - 3, x + w + 4, y + h + 3))) next
      lagg(.plats(a, f, x, y, langd, stats::runif(1) < 0.35, stats::runif(1, -9, 9)))
      i <- i + 1
    }
    platser
  })
  .svg(platser, s, bredd, hojd, upprepa = TRUE)
}

#' Mönstret till menypanelen: 316 x 844, en art per ruta i ett rutnät på 3 x 8, varje art en gång.
monster_meny <- function(s, arter, fro = 5L) {
  bredd <- 316
  hojd <- 844
  kol <- 3
  rad <- 8
  arter <- arter[arter %in% names(s)]
  platser <- .med_fro(fro, function() {
    ordning <- if (length(arter) > 1) sample(arter) else arter
    ordning <- utils::head(ordning, kol * rad)
    rw <- bredd / kol
    rh <- hojd / rad
    lapply(seq_along(ordning), function(i) {
      a <- ordning[i]
      f <- s[[a]]
      langd <- if (f$w / f$h > 1.6) stats::runif(1, 66, 88) else stats::runif(1, 44, 58)
      w <- langd
      h <- f$h * langd / f$w
      x <- ((i - 1) %% kol) * rw + stats::runif(1, 4, max(5, rw - w - 4))
      y <- ((i - 1) %/% kol) * rh + stats::runif(1, 4, max(5, rh - h - 4))
      .plats(a, f, x, y, langd, stats::runif(1) < 0.35, stats::runif(1, -8, 8))
    })
  })
  .svg(platser, s, bredd, hojd)
}
