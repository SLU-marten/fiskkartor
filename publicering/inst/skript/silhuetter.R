# Silhuetter och mönster till webben ur Artfaktas bilder. Se docs/silhuetter.md.
# Kör från repots rot:
#   Rscript publicering/inst/skript/silhuetter.R <mapp med bilder> <katalog.json>
# Skriver webb/src/assets/arter/silhuetter.json, monster-sidhuvud.svg och monster-meny.svg, och
# skriver ut vilka arter i katalogen som saknar bild.

pkgload::load_all("publicering", quiet = TRUE)

arg <- commandArgs(trailingOnly = TRUE)
if (length(arg) != 2) stop("Ange mappen med bilderna och katalogens katalog.json.", call. = FALSE)
mapp <- arg[1]
katalog <- arg[2]

# Arterna i mönstren. Alla finns i katalogen och har tydliga silhuetter.
MONSTERARTER <- c("Torsk", "Abborre", "Gädda", "Sill", "Rödspätta", "Piggvar", "Marulk", "Havskatt",
                  "Sjurygg", "Gös", "Lyrtorsk", "Berggylta", "Ål", "Storspigg", "Tånglake", "Krabbtaska",
                  "Vitling", "Sutare", "Havsmus", "Knot", "Kolja", "Gärs", "Skrubbskädda", "Id")

s <- silhuetter(mapp)
ut <- file.path("webb", "src", "assets", "arter")
dir.create(ut, recursive = TRUE, showWarnings = FALSE)
jsonlite::write_json(s, file.path(ut, "silhuetter.json"), auto_unbox = TRUE)
writeLines(monster_sidhuvud(s, MONSTERARTER), file.path(ut, "monster-sidhuvud.svg"), useBytes = TRUE)
writeLines(monster_meny(s, MONSTERARTER), file.path(ut, "monster-meny.svg"), useBytes = TRUE)

cat(length(s), "silhuetter.\n")
saknas <- saknade_arter(s, katalog)
if (length(saknas)) cat("Saknar bild:", paste(saknas, collapse = ", "), "\n") else cat("Alla arter i katalogen har en silhuett.\n")
