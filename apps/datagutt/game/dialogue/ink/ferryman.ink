// Topics pattern (see datagutt.ink).
=== ferryman ===
{
- ferryman > 1:
    // The mountain trail (docs/PLAN.md B6): Arne keeps the player posted.
    {unlocked("passport"):
        Heard the news? The council cleared the rockfall. The mountain trail's open again: up past the town hall, all the way to the hytte.
    - else:
        {~The ferry's late again. It's always late.|The fjord's calm today.|Back for more directions?|I've been rowing this route for thirty years. The ferry only has an engine for show.|The mountain trail's still shut. Rockfall. They say the council clears it once someone's filled a whole passport.}
    }
- ferryman_intro:
    Still here? The town's that way. Mind the passport, it's the only one I had.
- else:
    Hei! Welcome ashore.
    Walk with the arrow keys or WASD, or tap where you want to go. Press E, or tap someone, to talk.
}
- (topics)
* [Who's {profile("firstName")}?] -> answer_1 ->
    -> topics
* [Is there a quicker way to see everything?] -> answer_2 ->
    -> topics
+ {CHOICE_COUNT() == 0} [Can I ask you something again?] -> again
+ [Just looking around.] -> goodbye

// Everything asked: ask any question again.
= again
+ [Who's {profile("firstName")}?] -> answer_1 -> again
+ [Is there a quicker way to see everything?] -> answer_2 -> again
+ [Just looking around.] -> goodbye

= answer_1
    {profile("name")}. {profile("tagline")}
    He'll tell you himself. He likes talking about it. His house is the red one up the road.
    ->->

= answer_2
    If you'd rather read than walk, the Journal has everything in plain text. There's a button for it on the title screen.
    ->->

= goodbye
    Good. There's plenty to look at. Most of it is his fault. # nod
    -> END

// The first visit's arrival (game/scenes/Intro.ts): Arne hands over the passport and
// says how things work, once.
=== ferryman_intro ===
Hei! Welcome to Fjord Town. # nod
Here's your passport. Get it stamped by the folks who live here, one stamp a house.
Fill it, and who knows: maybe the council finally clears the rockfall on the mountain trail.
Walk with the arrow keys or WASD, or tap where you want to go. Press E, or tap someone, to talk.
And if you'd rather read than walk, the Journal in the menu has it all in plain text.
-> END
