# Dataträdet ligger på en egen gren (standard "data") med exakt en commit, som GitHub Pages-flödet
# lägger under /data/. Publicerade kartfiler tas aldrig bort av misstag: skicka_data() vägrar
# om en .tif som redan finns på grenen saknas lokalt.

.MB <- 2^20

# Kör git och stoppa med git:s egen utskrift vid fel.
.git <- function(args, mapp = NULL) {
  if (!nzchar(Sys.which("git"))) stop("Hittar inte git. Installera Git och försök igen.", call. = FALSE)
  helt <- c(if (!is.null(mapp)) c("-C", mapp), args)
  ut <- suppressWarnings(system2("git", shQuote(helt), stdout = TRUE, stderr = TRUE))
  if (!is.null(attr(ut, "status"))) {
    stop(sprintf("git %s misslyckades:\n%s", args[1], paste(ut, collapse = "\n")), call. = FALSE)
  }
  ut
}

.gren_finns <- function(remote, gren) {
  length(.git(c("ls-remote", "--heads", remote, paste0("refs/heads/", gren)))) > 0
}

# Alla filer i mappen som relativa sökvägar med "/", utan .git.
.filer_i <- function(mapp) {
  f <- list.files(mapp, recursive = TRUE, all.files = TRUE, no.. = TRUE)
  f[!grepl("(^|/)\\.git(/|$)", f)]
}

#' Kontrollerar GitHubs gränser: ingen fil över `max_fil_mb` och hela trädet under `max_total_mb`.
#' Ger svenska meddelanden, eller `character(0)`.
kontrollera_storlek <- function(mapp, max_fil_mb = 100, max_total_mb = 950) {
  filer <- .filer_i(mapp)
  storlek <- file.size(file.path(mapp, filer))
  stora <- storlek > max_fil_mb * .MB
  fel <- sprintf("%s är %.0f MB, men en fil får vara högst %s MB på GitHub",
                 filer[stora], storlek[stora] / .MB, max_fil_mb)
  total <- sum(storlek)
  if (total > max_total_mb * .MB) {
    fel <- c(fel, sprintf("Dataträdet är %.0f MB, men får vara högst %s MB (GitHub Pages tillåter 1 GB)",
                          total / .MB, max_total_mb))
  }
  fel
}

#' Hämtar datagrenen till en ny eller tom mapp, utan git-historik. Kör den innan publicera()
#' på en ny dator, så att tidigare versioner finns kvar när du skickar.
hamta_data <- function(remote, mapp, gren = "data") {
  if (dir.exists(mapp) && length(list.files(mapp, all.files = TRUE, no.. = TRUE)) > 0) {
    stop(sprintf("Mappen %s finns redan och är inte tom. Välj en ny mapp eller töm den först.", mapp),
         call. = FALSE)
  }
  if (!.gren_finns(remote, gren)) {
    dir.create(mapp, recursive = TRUE, showWarnings = FALSE)
    message(sprintf("Grenen %s finns inte ännu i %s. Börjar med en tom mapp.", gren, remote))
    return(invisible(mapp))
  }
  .git(c("-c", "core.autocrlf=false", "clone", "--quiet", "--depth", "1", "--single-branch",
         "--branch", gren, remote, mapp))
  unlink(file.path(mapp, ".git"), recursive = TRUE, force = TRUE)
  invisible(mapp)
}

# owner/repo för en GitHub-adress, annars NULL.
.github_repo <- function(remote) {
  m <- regmatches(remote, regexec("github\\.com[:/]([^/]+)/([^/]+?)(\\.git)?/?$", remote))[[1]]
  if (length(m) == 0) NULL else paste(m[2], m[3], sep = "/")
}

# Startar Pages-flödet på main. En push till datagrenen startar inget flöde, eftersom grenen
# saknar arbetsflödesfiler. Kräver gh, eller en token i GITHUB_PAT/GITHUB_TOKEN och curl.
.starta_pages <- function(remote) {
  repo <- .github_repo(remote)
  if (is.null(repo)) return(invisible(FALSE))
  sida <- sprintf("https://github.com/%s/actions/workflows/pages.yml", repo)
  ok <- FALSE
  if (nzchar(Sys.which("gh"))) {
    ut <- suppressWarnings(system2("gh", c("workflow", "run", "pages.yml", "--repo", repo, "--ref", "main"),
                                   stdout = TRUE, stderr = TRUE))
    ok <- is.null(attr(ut, "status"))
  }
  token <- Sys.getenv("GITHUB_PAT", Sys.getenv("GITHUB_TOKEN"))
  if (!ok && nzchar(token) && nzchar(Sys.which("curl"))) {
    huvud <- tempfile()
    on.exit(unlink(huvud), add = TRUE)
    writeLines(c(paste("Authorization: Bearer", token), "Accept: application/vnd.github+json"), huvud)
    kod <- suppressWarnings(system2("curl", c(
      "-s", "-o", if (.Platform$OS.type == "windows") "NUL" else "/dev/null", "-w", "%{http_code}",
      "-X", "POST", "-H", paste0("@", huvud),
      sprintf("https://api.github.com/repos/%s/actions/workflows/pages.yml/dispatches", repo),
      "-d", shQuote("{\"ref\":\"main\"}")), stdout = TRUE, stderr = TRUE))
    ok <- identical(kod, "204")
  }
  if (ok) {
    message(sprintf("Startade publiceringen på GitHub Pages: %s", sida))
  } else {
    message(sprintf("Starta publiceringen själv: öppna %s och tryck på \"Run workflow\".", sida))
  }
  invisible(ok)
}

# Filer i publicerade versionsmappar skrivs aldrig om och tas aldrig bort.
.VERSIONSFIL <- "^kartor/.+/v[0-9]+/[^/]+$"

# Sökväg -> blob-id för filer i ett träd (FETCH_HEAD) eller i indexet.
.blobbar_trad <- function(arbets, ref) {
  rader <- .git(c("-c", "core.quotepath=off", "ls-tree", "-r", ref), arbets)
  stats::setNames(sub("^\\S+ \\S+ (\\S+)\t.*$", "\\1", rader), sub("^[^\t]*\t", "", rader))
}
.blobbar_index <- function(arbets, trad) {
  rader <- .git(c("--work-tree", trad, "-c", "core.quotepath=off", "ls-files", "-s"), arbets)
  stats::setNames(sub("^\\S+ (\\S+) \\S+\t.*$", "\\1", rader), sub("^[^\t]*\t", "", rader))
}

.lista <- function(rubrik, filer) {
  c(rubrik, utils::head(filer, 20), if (length(filer) > 20) sprintf("... och %d till", length(filer) - 20))
}

#' Skickar dataträdet som en enda commit till datagrenen (force-push) och startar Pages-flödet.
#' Stoppar om en fil är för stor, om en publicerad kartfil på grenen saknas i `mapp` eller har
#' annat innehåll där (då har mappen inte hämtats med hamta_data()), eller om någon annan har
#' publicerat sedan kontrollen. Returnerar commitens sha.
skicka_data <- function(mapp, remote, gren = "data",
                        meddelande = paste("data:", format(Sys.time(), "%Y-%m-%d %H:%M")),
                        tillat_borttag = FALSE) {
  fel <- kontrollera_storlek(mapp)
  if (length(fel)) stop(paste(c("Kan inte skicka dataträdet:", fel), collapse = "\n"), call. = FALSE)

  arbets <- tempfile("skicka")
  on.exit(unlink(arbets, recursive = TRUE, force = TRUE), add = TRUE)
  .git(c("init", "--quiet", arbets))
  trad <- normalizePath(mapp, winslash = "/")
  .git(c("--work-tree", trad, "-c", "core.autocrlf=false", "add", "--all"), arbets)

  # Förväntat läge på grenen när vi pushar: tomt om grenen inte finns.
  forvantad <- ""
  if (.gren_finns(remote, gren)) {
    .git(c("fetch", "--quiet", "--depth", "1", remote, gren), arbets)
    forvantad <- .git(c("rev-parse", "FETCH_HEAD"), arbets)
    pa_grenen <- .blobbar_trad(arbets, "FETCH_HEAD")
    lokalt <- .blobbar_index(arbets, trad)
    publicerade <- grep(.VERSIONSFIL, names(pa_grenen), value = TRUE)
    saknas <- setdiff(publicerade, names(lokalt))
    finns <- intersect(publicerade, names(lokalt))
    andrade <- finns[pa_grenen[finns] != lokalt[finns]]
    if (length(andrade) || (length(saknas) && !tillat_borttag)) {
      stop(paste(c(
        if (length(andrade)) .lista(sprintf("%d publicerade kartfiler har annat innehåll i %s än på grenen %s:",
                                            length(andrade), mapp, gren), andrade),
        if (length(saknas) && !tillat_borttag) .lista(sprintf("%d publicerade kartfiler på grenen %s saknas i %s:",
                                                              length(saknas), gren, mapp), saknas),
        "En publicerad fil skrivs aldrig om. Kör hamta_data() i en ny mapp och publicera sedan i den mappen."),
        collapse = "\n"), call. = FALSE)
    }
  }

  namn <- tryCatch(.git(c("config", "user.name"), arbets), error = function(e) character(0))
  epost <- tryCatch(.git(c("config", "user.email"), arbets), error = function(e) character(0))
  identitet <- c(if (!length(namn)) c("-c", "user.name=fiskkartor"),
                 if (!length(epost)) c("-c", "user.email=SLU-Aqua-fiskkartor@slu.se"))
  .git(c(identitet, "--work-tree", trad, "commit", "--quiet", "-m", meddelande), arbets)
  # --force-with-lease: pushen misslyckas om grenen har ändrats sedan kontrollen ovan.
  lease <- sprintf("--force-with-lease=refs/heads/%s:%s", gren, forvantad)
  pushad <- tryCatch(.git(c("push", "--quiet", lease, remote, paste0("HEAD:refs/heads/", gren)), arbets),
                     error = function(e) e)
  if (inherits(pushad, "error")) {
    stop(paste(c(sprintf(paste("Grenen %s har ändrats sedan kontrollen, troligen för att någon annan publicerade",
                               "samtidigt. Inget skickades. Kör hamta_data() i en ny mapp och publicera igen."), gren),
                 conditionMessage(pushad)), collapse = "\n"), call. = FALSE)
  }
  sha <- .git(c("rev-parse", "HEAD"), arbets)
  antal <- length(.filer_i(mapp))
  message(sprintf("Skickade %d %s till %s (%s).", antal, if (antal == 1) "fil" else "filer", gren, substr(sha, 1, 7)))
  .starta_pages(remote)
  invisible(sha)
}
