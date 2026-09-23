// Topics pattern (see datagutt.ink).
=== ferryman ===
{ ferryman > 1:
    {~The ferry's late again. It's always late.|The fjord's calm today.|Back for more directions?|I've been rowing this route for thirty years. The ferry only has an engine for show.}
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
