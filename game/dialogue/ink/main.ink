// Fjord Town dialogue (docs/game/DESIGN.md §11).
// Each NPC is a knot; the game jumps to it by name from the map's `dialogue` property.
// Facts come from functions such as project_desc("irlserver") so the game and the
// Journal can never disagree. Never paste a fact in here. Available functions are
// listed in game/dialogue/externals.ts; the build declares them for you.
//
// Use the topics pattern for NPCs (see datagutt.ink): questions are once-only `*`
// choices that divert back to a `(topics)` gather, plus one sticky `+` choice that ends
// the conversation. Unasked questions stay available on later visits, so no fact can be
// missed by picking the "wrong" option first. Each answer lives in its own stitch
// (`answer_n`, reached as a tunnel), so once everything has been asked a sticky
// "Can I ask you something again?" (shown when CHOICE_COUNT() == 0) opens an `again`
// menu with every question (user request). The goodbye is a `goodbye` stitch.
//
// Running joke material: Thomas doesn't drink coffee. He drinks energy drinks, as a grown
// adult. Never give him a coffee habit.
//
// Tags: `# speaker: Name` overrides the speaker for a line; `# nod` and `# shake`
// play that portrait gesture once at the start of the line.

INCLUDE ferryman.ink
INCLUDE datagutt.ink
INCLUDE streamer.ink
INCLUDE technician.ink
INCLUDE shopkeeper.ink
INCLUDE coworker.ink
INCLUDE sysadmin.ink
INCLUDE trainer.ink
INCLUDE librarian.ink
INCLUDE farmer.ink
INCLUDE postmaster.ink

-> END
