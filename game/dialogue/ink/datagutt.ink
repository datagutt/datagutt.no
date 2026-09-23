// Topics pattern: every question stays on offer until asked, "See you" always ends it,
// and repeat visits greet briefly and return to whatever is still unasked. Nothing the
// visitor should learn may hide behind a one-time choice.
=== datagutt ===
{ datagutt > 1:
    {~Back already? The town isn't that big. Yet.|If you find a bug, it's a feature. Probably.|I'd offer you a drink, but I'm down to my last energy drink. It's for emergencies. Everything is an emergency.}
- else:
    Oh, hi! I'm {profile("firstName")}. {profile("role")} by trade, {profile("location")} by postcode. # nod
    {about(0)}
}
{ lanyard_activity() != "":
    {lanyard_activity()}
}
- (topics)
* [What are you working on?] -> answer_1 ->
    -> topics
* [What do you mostly use?] -> answer_2 ->
    -> topics
* [Where can I find you online?] -> answer_3 ->
    -> topics
+ {CHOICE_COUNT() == 0} [Can I ask you something again?] -> again
+ [See you around.] -> goodbye

// Everything asked: ask any question again.
= again
+ [What are you working on?] -> answer_1 -> again
+ [What do you mostly use?] -> answer_2 -> again
+ [Where can I find you online?] -> answer_3 -> again
+ [See you around.] -> goodbye

= answer_1
    Right now? This town. {project_desc("portfolio")}, except you can walk around in it.
    The little model on the table is the whole town. You're standing in it, which makes this a bit meta.
    ->->

= answer_2
    {about(1)}
    ->->

= answer_3
    I'm {profile("handle")} pretty much everywhere. GitHub is where the code lives. # link: social github
    ->->

= goodbye
    Have a look around. Everyone here knows something about me, which is a little embarrassing.
    -> END

// Thomas is offline, asleep in bed (game/live/datagutt.ts). Waking him leads into the
// usual conversation, which is what stamps the passport.
=== datagutt_asleep ===
\* {~Thomas is fast asleep. He mumbles something about merge conflicts.|Thomas is asleep. "Just one more commit," he says, to nobody.|Thomas is asleep, snoring softly. A laptop fan whirs somewhere under the duvet.} # narration
* [Wake him up.]
    Mm? Oh. Hi. I was just resting my eyes. # nod
    -> datagutt
* [Let him sleep.]
    -> END
