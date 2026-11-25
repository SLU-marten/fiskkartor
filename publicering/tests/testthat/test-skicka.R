git <- function(...) {
  ut <- suppressWarnings(system2("git", c(...), stdout = TRUE, stderr = TRUE))
  if (!is.null(attr(ut, "status"))) return(NA_character_)
  ut
}

bar_repo <- function() {
  skip_if(!nzchar(Sys.which("git")), "git saknas")
  r <- tempfile("bar")
  dir.create(r)
  git("init", "--bare", "--quiet", r)
  r
}

# Ett dataträd med filer. `filer` är en namngiven lista: relativ sökväg = innehåll.
datatrad <- function(filer) {
  mapp <- tempfile("data")
  for (namn in names(filer)) {
    f <- file.path(mapp, namn)
    dir.create(dirname(f), recursive = TRUE, showWarnings = FALSE)
    writeLines(filer[[namn]], f)
  }
  mapp
}

gles_fil <- function(f, mb) {
  dir.create(dirname(f), recursive = TRUE, showWarnings = FALSE)
  con <- file(f, "wb")
  seek(con, mb * 2^20 - 1, rw = "write")
  writeBin(as.raw(0), con)
  close(con)
}

test_that("datagrenen har alltid exakt en commit med senaste innehållet", {
  bar <- bar_repo()
  tif <- list("kartor/p/a/v1/visning.tif" = "tif v1")
  skicka_data(datatrad(c(list("katalog/katalog.json" = "{\"kartor\": [1]}"), tif)), bar)
  skicka_data(datatrad(c(list("katalog/katalog.json" = "{\"kartor\": [2]}"), tif)), bar)
  expect_identical(git("-C", bar, "rev-list", "--count", "data"), "1")
  expect_identical(git("-C", bar, "show", "data:katalog/katalog.json"), "{\"kartor\": [2]}")
})

test_that("skicka_data vägrar ta bort publicerade kartfiler som saknas lokalt", {
  bar <- bar_repo()
  skicka_data(datatrad(list("katalog/katalog.json" = "{}", "kartor/p/a/v1/visning.tif" = "tif")), bar)
  fore <- git("-C", bar, "rev-parse", "data")
  fel <- tryCatch(skicka_data(datatrad(list("katalog/katalog.json" = "{}")), bar), error = conditionMessage)
  expect_match(fel, "kartor/p/a/v1/visning.tif", fixed = TRUE)
  expect_match(fel, "hamta_data", fixed = TRUE)
  expect_identical(git("-C", bar, "rev-parse", "data"), fore)
})

test_that("tillat_borttag = TRUE skickar ändå", {
  bar <- bar_repo()
  skicka_data(datatrad(list("katalog/katalog.json" = "{}", "kartor/p/a/v1/visning.tif" = "tif")), bar)
  skicka_data(datatrad(list("katalog/katalog.json" = "{}")), bar, tillat_borttag = TRUE)
  expect_identical(git("-C", bar, "ls-tree", "-r", "--name-only", "data"), "katalog/katalog.json")
})

test_that("hamta_data hämtar filerna utan .git-mapp", {
  bar <- bar_repo()
  skicka_data(datatrad(list("katalog/katalog.json" = "{\"a\": 1}", "kartor/p/a/v1/visning.tif" = "tif")), bar)
  mapp <- tempfile("hamtad")
  hamta_data(bar, mapp)
  expect_identical(readLines(file.path(mapp, "katalog", "katalog.json")), "{\"a\": 1}")
  expect_true(file.exists(file.path(mapp, "kartor", "p", "a", "v1", "visning.tif")))
  expect_false(dir.exists(file.path(mapp, ".git")))
})

test_that("hamta_data ger en tom mapp när grenen inte finns och vägrar en mapp med innehåll", {
  bar <- bar_repo()
  mapp <- tempfile("ny")
  hamta_data(bar, mapp)
  expect_true(dir.exists(mapp))
  expect_length(list.files(mapp, all.files = TRUE, no.. = TRUE), 0)
  full <- datatrad(list("x.txt" = "x"))
  expect_error(hamta_data(bar, full), "inte tom")
})

test_that("kontrollera_storlek namnger en fil över 100 MB", {
  mapp <- tempfile("stor")
  gles_fil(file.path(mapp, "kartor", "p", "a", "v1", "radata.tif"), 101)
  fel <- kontrollera_storlek(mapp)
  expect_match(fel, "kartor/p/a/v1/radata.tif", fixed = TRUE, all = FALSE)
  expect_match(fel, "100 MB", fixed = TRUE, all = FALSE)
  expect_identical(kontrollera_storlek(datatrad(list("a.txt" = "a"))), character(0))
})

test_that("kontrollera_storlek stoppar ett för stort dataträd", {
  mapp <- tempfile("total")
  for (i in 1:3) gles_fil(file.path(mapp, sprintf("f%d.tif", i)), 90)
  expect_match(kontrollera_storlek(mapp, max_total_mb = 250), "250 MB", fixed = TRUE, all = FALSE)
})

test_that("skicka_data stoppar på för stora filer och lämnar repot orört", {
  bar <- bar_repo()
  mapp <- tempfile("stor")
  gles_fil(file.path(mapp, "kartor", "p", "a", "v1", "radata.tif"), 101)
  expect_error(skicka_data(mapp, bar), "100 MB")
  expect_true(is.na(git("-C", bar, "rev-parse", "--verify", "--quiet", "data")))
})

test_that("skicka_data vägrar skriva över en publicerad kartfil med nytt innehåll", {
  bar <- bar_repo()
  skicka_data(datatrad(list("katalog/katalog.json" = "{}", "kartor/p/a/v1/visning.tif" = "tif A")), bar)
  fore <- git("-C", bar, "rev-parse", "data")
  fel <- tryCatch(skicka_data(datatrad(list("katalog/katalog.json" = "{}", "kartor/p/a/v1/visning.tif" = "tif B")), bar),
                  error = conditionMessage)
  expect_match(fel, "kartor/p/a/v1/visning.tif", fixed = TRUE)
  expect_match(fel, "hamta_data", fixed = TRUE)
  expect_identical(git("-C", bar, "rev-parse", "data"), fore)
})

test_that("en samtidig publicering skrivs inte över", {
  skip_on_os("windows")
  bar <- bar_repo()
  skicka_data(datatrad(list("katalog/katalog.json" = "{}", "kartor/p/a/v1/visning.tif" = "tif")), bar)
  # En post-commit-krok låter "någon annan" publicera mellan kontrollen och pushen.
  krokar <- tempfile("krokar")
  dir.create(krokar)
  markor <- tempfile("markor")
  krok <- file.path(krokar, "post-commit")
  writeLines(c("#!/bin/sh",
               "unset GIT_DIR GIT_WORK_TREE GIT_INDEX_FILE GIT_PREFIX",
               sprintf("[ -e '%s' ] && exit 0", markor),
               sprintf("touch '%s'", markor),
               sprintf("ny=$(git --git-dir='%s' commit-tree 'data^{tree}' -p data -m annan)", bar),
               sprintf("git --git-dir='%s' update-ref refs/heads/data \"$ny\"", bar)), krok)
  Sys.chmod(krok, "755")
  withr::local_envvar(GIT_CONFIG_COUNT = "1", GIT_CONFIG_KEY_0 = "core.hooksPath", GIT_CONFIG_VALUE_0 = krokar)
  fel <- tryCatch(skicka_data(datatrad(list("katalog/katalog.json" = "{\"ny\": 1}", "kartor/p/a/v1/visning.tif" = "tif")), bar),
                  error = conditionMessage)
  expect_match(fel, "samtidigt")
  expect_identical(git("-C", bar, "log", "-1", "--format=%s", "data"), "annan")
})
