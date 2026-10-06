# Imagino Working Studio — asset provenance

Audit date: 2026-10-05. Scope: the controlled BFL staging demonstrations explicitly authorized for this frontend rebrand. No new provider generation, private user media, competitor screenshots, or customer case studies are included.

## Verified source files

All files below are PNG, 1024 × 1024. Byte counts and SHA-256 hashes were checked against the local source bytes; all four images were visually inspected.

| Source in the Imagino Revival evidence workspace | Origin / role | Bytes | SHA-256 |
| --- | --- | ---: | --- |
| `work/api-staging-checkout/Fixtures/bfl-reference-20261005.png` | Controlled synthetic illustration; sole input reference for call 3 | 11,715 | `f528f7cdc43f68d75f27e3fd3cbc491a02bb296a6f73c5fe57b374834517b333` |
| `BFL_CALL_1.png` | FLUX.2 klein 4B; text-to-image; translucent blue perfume bottle | 1,291,844 | `7a0cb43c422caedbbf0ce924cece816855be40d675c3361e33075083e77b6b36` |
| `BFL_CALL_2.png` | FLUX.2 Pro; text-to-image; red car and concrete house | 1,689,642 | `db0b42583926f76948eb2720d8b12900f49aa019f9e42d49ddd741e223f109d0` |
| `BFL_CALL_3.png` | FLUX.2 Pro; one reference input; blue bottle in botanical setting | 1,352,396 | `1180fb5b6efd81464a799a2e1fc687ab6a044b21cf0b50ea5d11f041bd36195d` |

## Proven relationship

`bfl-run-one-call.cjs` reads the fixture path above and includes it only in call 3. `Services/Generation/BflHomologationPolicy.cs` in the reference API checkout validates that input against the fixture SHA-256. `BFL_CALL_3.json` records one reference, FLUX.2 Pro, one 1024 × 1024 output, `Completed` / `Charged`, and the matching output hash. `BFL_ADAPTER_REAL_STAGING.md` documents the three completed authorized calls.

The call 3 reference is a flat synthetic illustration with a rounded blue bottle, blue cap, gold neck band, and three gold circles. The output is the rendered botanical scene. The translucent bottle in call 1 is a different generated object. It is not the reference for call 3. The car/house is an independent free-creation example. Neither may be presented as part of that reference lineage.

## Authorization and presentation transformations

The pasted Working Studio request authorizes reuse of these controlled staging outputs and references, and local cropping, optimization, and thumbnails while preserving originals, colors, and meaning. This is permission for the task; it is not a claim about customer endorsement, trademark clearance, or universal commercial rights.

The integrating/root implementation supplies resized WebP derivatives of calls 1, 2, and 3 for web presentation. `scripts/prepare-brand.cjs` uses Sharp, aspect-preserving resize with `withoutEnlargement: true`, and WebP quality 86. These are format/size optimizations only, with no product retouching or new generation. Original PNG files remain unchanged in the evidence workspace. The reference is copied as PNG. Any CSS display crop is a presentation crop, not a different generated output; the actual generation result should be shown uncropped when users evaluate it.

| Frontend derivative | Source | Dimensions | Bytes | SHA-256 |
| --- | --- | --- | ---: | --- |
| `public/brand/bottle.webp` | Call 1 | 768 × 768 | 26,974 | `dbc561ef506656d0cf5201641260b193ab9f9b483a92c29f37076e5ec6361cff` |
| `public/brand/freeform.webp` | Call 2 | 768 × 768 | 66,390 | `fed3ae5ade89dfa48c40af5755b319c26d3f40de46d76c66adedaf3c694eeb7e` |
| `public/brand/campaign.webp` | Call 3 | 1024 × 1024 | 67,908 | `b644bbd4474c92d66d13bf1ef720aefc48602af6b8c0cb069a2db0b573d67208` |
| `public/brand/reference.png` | Controlled reference | 1024 × 1024 | 11,715 | Same as the verified original above |

## Honest captions and claims

- Use “Controlled reference” and “Generated with FLUX.2 Pro” for the verified pair, with “Synthetic staging demonstration” visible near the example.
- Prefer “Explore campaign visuals from your references.” The demonstration does not validate fidelity to a real photographed product or customer advertising performance.
- Label call 1 and call 2 as independent prompt-generated examples. Do not connect them with arrows or duplicate them to imply additional generations.
- Model identity is factual attribution, not a partnership endorsement. Do not add provider/customer logo walls or customer testimony.
- Three successful test calls demonstrate working contracts, not typical speed, perfect consistency, guaranteed advertising results, or broad model availability.

## Generation availability

The recorded final staging state has `PaidGenerationEnabled=false`. BFL models are `approval_required`; no further paid generation is authorized. The `Pipeline Demo` fixture is synthetic and must be described as such. Gemini and video have not been homologated for this rebrand. FLUX.2 Pro's schema allows up to four references, but the recorded reference test used exactly one.

This manifesto omits account identifiers, credentials, private URLs, provider polling URLs, and private pricing metadata.
