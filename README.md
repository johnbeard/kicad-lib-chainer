## KiCad lib chainer

KiCad lib chainer is a little web app that takes your old (v9 and earlier) KiCad library tables
and splits them into "KiCad stock libraries" and "your libraries". The stock libraries are replaced by a chained
entry.

Before:

```lisp
(fp_lib_table
	(lib (name "Audio_Module") (type "KiCad") (uri "${KICAD10_FOOTPRINT_DIR}/Audio_Module.pretty") (options "") (descr "Audio Module footprints"))
	(lib (name "Battery") (type "KiCad") (uri "${KICAD10_FOOTPRINT_DIR}/Battery.pretty") (options "") (descr "Battery and battery holder footprints"))
    ....hundreds of libs later
	(lib (name "My Lib") (type "KiCad") (uri "/home/user/kicad-stuff/MyLib.pretty") (options "") (descr "My Library"))
)
```

After:

```lisp
(fp_lib_table
	(version 7)
	(lib (name "KiCad") (type "Table") (uri "/usr/share/kicad/footprints/fp-lib-table") (options "") (descr "KiCad Default Libraries"))
	(lib (name "My Lib") (type "KiCad") (uri "/home/user/kicad-stuff/MyLib.pretty") (options "") (descr "My Library"))
)
```

### Chained library tables

KiCad library tables are a simple s-expression format.

An unchained table is simply a list of KiCad footprint libraries, one `(lib)` entry per library.

Chained libraries are exactly the the same, but there is a new `(type)` of library: `Table`. This is an entry that points to _another_ table
and that table also is loaded in the same way.

The `(version 7)` tag is also added to indicate to KiCad what kind of library table it is dealing with.

### Development

No build step. The app is static HTML + ES modules served directly.

Prerequisites: Node.js (for tests and formatting only).

```sh
npm install      # one-time: install dev dependencies (Prettier)
npm test         # run smoke tests
npm run fmt      # auto-format all files
npm run fmt:check  # check formatting (CI-friendly, exits non-zero on drift)
```

### Slop warning

This code is mostly AI slop. It's a silly little tool that does a silly little task and it doesn't really matter if it flubs it.

This code is MIT licensed only to the extent that AI-assisted code can be considered copyrightable at all.

### Data handling

No data is sent to any server by this tool. No personal information is collected.

Other than the files in this repo, no files are dowloaded from other services.

### Attribution

- Chain icon, public domain: https://www.svgrepo.com/svg/480825/chain-for-links