// Fjord Town dialogue (docs/game/DESIGN.md §11).
// Each NPC is a knot; the game jumps to it by name from the map's `dialogue` property.
// Facts come from functions such as project_desc("irlserver") so the game and the
// Journal can never disagree. Never paste a fact in here. Available functions are
// listed in game/dialogue/externals.ts; the build declares them for you.
//
// Tags: `# speaker: Name` overrides the speaker for a line.

INCLUDE ferryman.ink
INCLUDE datagutt.ink

-> END
