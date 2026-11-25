test_that("skapa_id ger ren ASCII-slug", {
  expect_equal(skapa_id("Torsk större än 20 cm uppväxt västkusten 2021"),
               "torsk-storre-an-20-cm-uppvaxt-vastkusten-2021")
  expect_equal(skapa_id("Braxen/björkna uppväxt  ostkusten"), "braxen-bjorkna-uppvaxt-ostkusten")
  expect_equal(skapa_id(" Femtömmad skärlånga "), "femtommad-skarlanga")
  expect_equal(skapa_id("Gädda"), skapa_id(stringi::stri_trans_nfd("Gädda")))
})

test_that("< och > blir ord så att storleksklasser får olika id", {
  expect_identical(skapa_id("Torsk <20 cm västkusten 2021"), "torsk-under-20-cm-vastkusten-2021")
  expect_identical(skapa_id("Torsk >20 cm västkusten 2021"), "torsk-over-20-cm-vastkusten-2021")
})
